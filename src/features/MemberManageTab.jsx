import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Paper, Typography, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, Divider, Stack, List, ListItem, ListItemText, Avatar, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  // [수정] Card, CardHeader 컴포넌트 추가
  Card, CardHeader 
} from '@mui/material'
import { Check, Close, SwapHoriz, Assignment, Person, DeleteForever, VerifiedUser, PersonRemove } from '@mui/icons-material'

// [수정] prop으로 currentUserId를 받도록 수정
export default function MemberManageTab({ clubId, myRole, currentUserId }) {
  const [members, setMembers] = useState([])
  const [submissions, setSubmissions] = useState([]) 
  const [viewSubmission, setViewSubmission] = useState(null) 

  useEffect(() => {
    fetchMembers()
    fetchSubmissions()
  }, [clubId])

  const fetchMembers = async () => {
    // [수정] 아바타 URL도 함께 가져옴
    const { data } = await supabase.from('club_members')
      .select('*, profiles(username, full_name, avatar_url)') 
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
    if (data) setMembers(data)
  }

  const fetchSubmissions = async () => {
    const { data } = await supabase.from('club_application_submissions')
      .select('*')
      .eq('club_id', clubId)
    if (data) setSubmissions(data)
  }

  // --- 핸들러 ---
  const handleAccept = async (mid) => {
    if (!confirm('가입을 승인하시겠습니까?')) return
    await supabase.from('club_members').update({ status: 'approved' }).eq('id', mid)
    setViewSubmission(null) 
    fetchMembers()
  }

  const handleReject = async (mid) => {
    if (!confirm('가입을 거절하시겠습니까?')) return
    await supabase.from('club_members').delete().eq('id', mid)
    setViewSubmission(null)
    fetchMembers()
  }

  const handleChangeRole = async (mid, role) => {
    if (!confirm('권한을 변경하시겠습니까?')) return
    await supabase.from('club_members').update({ role }).eq('id', mid)
    fetchMembers()
  }

  const handleTransferManager = async (uid, name) => {
    if (!confirm(`정말 [${name}]님에게 총괄 관리자 권한을 위임하시겠습니까?\n본인은 일반 운영진으로 강등됩니다.`)) return
    const { error } = await supabase.rpc('transfer_club_manager', { _club_id: clubId, _new_manager_id: uid })
    if (error) alert('실패: ' + error.message)
    else window.location.reload()
  }

  // [NEW] 멤버 추방 핸들러
  const handleKickMember = async (mid, name) => {
    if (!confirm(`정말 ${name} 님을 동아리에서 추방하시겠습니까?`)) return
    
    // club_members 테이블에서 해당 멤버 삭제
    const { error } = await supabase.from('club_members').delete().eq('id', mid)
    
    if (error) alert('추방 실패: ' + error.message)
    else fetchMembers()
  }

  // --- 데이터 분류 ---
  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')

  // 승인/거절 권한 (Staff 이상)
  const canApprove = myRole === 'manager' || myRole === 'staff'
  const isManager = myRole === 'manager'

  // 이름/프로필 렌더링 헬퍼
  const ProfileCell = ({ profile }) => (
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar src={profile?.avatar_url} sx={{ width: 36, height: 36, bgcolor: '#e2e8f0' }} />
      <Box>
        <Typography variant="body2" fontWeight="600">{profile?.full_name || '이름 없음'}</Typography>
        <Typography variant="caption" color="text.secondary">@{profile?.username}</Typography>
      </Box>
    </Stack>
  )

  const RoleChip = ({ role }) => {
    if (role === 'manager') return <Chip label="관리자" size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', borderRadius: 1.5 }} />
    if (role === 'staff') return <Chip label="운영진" size="small" sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold', borderRadius: 1.5 }} />
    return <Chip label="멤버" size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', borderRadius: 1.5 }} />
  }

  return (
    <Stack spacing={4}>
      
      {/* 1. 가입 신청 대기 목록 */}
      <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardHeader 
          title={<Typography variant="subtitle1" fontWeight="bold">가입 신청 ({pendingMembers.length})</Typography>}
          sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
        />
        <TableContainer>
          <Table size="medium">
            <TableBody>
              {pendingMembers.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}><Typography color="text.secondary">대기 중인 신청이 없습니다.</Typography></TableCell></TableRow>
              ) : (
                pendingMembers.map(m => {
                  const sub = submissions.find(s => s.user_id === m.user_id)
                  const displayName = m.profiles?.full_name || m.profiles?.username
                  return (
                    <TableRow key={m.id} hover>
                      <TableCell sx={{ py: 1 }} width="50%">
                        <ProfileCell profile={m.profiles} />
                      </TableCell>
                      <TableCell align="center" width="20%">
                        {sub && <Chip label="신청서" size="small" variant="outlined" color="primary" sx={{ height: 24 }} />}
                        {!sub && <Typography variant="caption" color="text.secondary">신청서 없음</Typography>}
                      </TableCell>
                      <TableCell align="right" width="30%">
                        {canApprove && (
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            {sub && (
                              <Button 
                                size="small" variant="outlined" 
                                startIcon={<Assignment />} 
                                onClick={() => setViewSubmission({ ...sub, memberId: m.id, name: displayName })}
                                sx={{ borderRadius: 2 }}
                              >
                                확인
                              </Button>
                            )}
                            {!sub && (
                              <>
                                <Tooltip title="빠른 승인"><IconButton onClick={() => handleAccept(m.id)} color="success"><Check /></IconButton></Tooltip>
                                <Tooltip title="거절"><IconButton onClick={() => handleReject(m.id)} color="error"><Close /></IconButton></Tooltip>
                              </>
                            )}
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 2. 전체 멤버 관리 */}
      <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardHeader 
           title={<Typography variant="subtitle1" fontWeight="bold">전체 멤버 ({approvedMembers.length})</Typography>}
           sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="35%">멤버</TableCell>
                <TableCell width="20%" align="center">권한</TableCell>
                <TableCell width="45%" align="right">관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {approvedMembers.map(m => {
                const displayName = m.profiles?.full_name || m.profiles?.username
                const isSelf = m.user_id === currentUserId // 자기 자신 제외
                return (
                  <TableRow key={m.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>
                      <ProfileCell profile={m.profiles} />
                    </TableCell>
                    <TableCell align="center">
                      <RoleChip role={m.role} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        
                        {/* 1. 권한 변경 (매니저만 가능, 자신 제외) */}
                        {isManager && !isSelf && (
                          m.role === 'member' ? (
                            <Button size="small" onClick={() => handleChangeRole(m.id, 'staff')} sx={{ color: '#0f172a', textTransform:'none' }}>
                              운영진 임명
                            </Button>
                          ) : m.role === 'staff' ? (
                            <Button size="small" onClick={() => handleChangeRole(m.id, 'member')} sx={{ color: '#ef4444', textTransform:'none' }}>
                              해임
                            </Button>
                          ) : null
                        )}
                        
                        {/* 2. 위임 (매니저만 가능, 자신 제외, 일반/운영진에게만) */}
                        {isManager && !isSelf && m.role !== 'manager' && (
                          <Tooltip title="총괄 권한 위임">
                             <IconButton size="small" onClick={() => handleTransferManager(m.user_id, displayName)} sx={{ color: '#f59e0b', '&:hover': { bgcolor: '#fffbeb' } }}>
                                <SwapHoriz fontSize="small" />
                             </IconButton>
                          </Tooltip>
                        )}
                        
                        {/* 3. 추방 (매니저만 가능, 자신 및 매니저 제외) */}
                        {isManager && !isSelf && m.role !== 'manager' && (
                          <Tooltip title="추방">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleKickMember(m.id, displayName)}
                            >
                              <PersonRemove fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* [모달] 신청서 내용 확인 */}
      <Dialog open={!!viewSubmission} onClose={() => setViewSubmission(null)} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ borderBottom: '1px solid #e2e8f0', px: 3, py: 2 }}>
          <Typography variant="h6" fontWeight="bold">신청서 확인</Typography>
          <Typography variant="caption" color="text.secondary">신청자: {viewSubmission?.name}</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Stack spacing={2}>
            {viewSubmission?.submission_data?.map((item, idx) => (
              <Box key={idx} sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Q. {item.question}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {typeof item.answer === 'boolean' ? (item.answer ? '✅ 예' : '⬜ 아니오') : (item.answer || '-')}
                </Typography>
              </Box>
            ))}
            {(!viewSubmission?.submission_data || viewSubmission.submission_data.length === 0) && (
              <Typography color="text.secondary" align="center">작성된 내용이 없습니다.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setViewSubmission(null)} sx={{ color: '#64748b', mr: 'auto' }}>닫기</Button>
          <Button variant="outlined" color="error" onClick={() => handleReject(viewSubmission?.memberId)} sx={{ borderRadius: 2 }}>거절</Button>
          <Button variant="contained" color="success" onClick={() => handleAccept(viewSubmission?.memberId)} sx={{ borderRadius: 2, boxShadow: 'none' }}>승인</Button>
        </DialogActions>
      </Dialog>

    </Stack>
  )
}