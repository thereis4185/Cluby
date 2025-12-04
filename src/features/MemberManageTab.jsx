import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Paper, Typography, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, Divider, Stack, List, ListItem, ListItemText, Avatar, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  Card, CardHeader 
} from '@mui/material'
import { Check, Close, SwapHoriz, Assignment, Person, DeleteForever, VerifiedUser, PersonRemove } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function MemberManageTab({ clubId, myRole, currentUserId }) {
  const { t } = useTranslation() // [추가]
  const [members, setMembers] = useState([])
  const [submissions, setSubmissions] = useState([]) 
  const [viewSubmission, setViewSubmission] = useState(null) 

  useEffect(() => {
    fetchMembers()
    fetchSubmissions()
  }, [clubId])

  const fetchMembers = async () => {
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
    if (!confirm(t('member.manage.confirm_approve'))) return // [수정]
    await supabase.from('club_members').update({ status: 'approved' }).eq('id', mid)
    setViewSubmission(null) 
    fetchMembers()
  }

  const handleReject = async (mid) => {
    if (!confirm(t('member.manage.confirm_reject'))) return // [수정]
    await supabase.from('club_members').delete().eq('id', mid)
    setViewSubmission(null)
    fetchMembers()
  }

  const handleChangeRole = async (mid, role) => {
    if (!confirm(t('member.manage.confirm_role_change'))) return // [수정]
    await supabase.from('club_members').update({ role }).eq('id', mid)
    fetchMembers()
  }

  const handleTransferManager = async (uid, name) => {
    if (!confirm(t('member.manage.confirm_transfer', { name }))) return // [수정]
    const { error } = await supabase.rpc('transfer_club_manager', { _club_id: clubId, _new_manager_id: uid })
    if (error) alert('Error: ' + error.message)
    else window.location.reload()
  }

  const handleKickMember = async (mid, name) => {
    if (!confirm(t('member.manage.confirm_kick', { name }))) return // [수정]
    const { error } = await supabase.from('club_members').delete().eq('id', mid)
    if (error) alert('Error: ' + error.message)
    else fetchMembers()
  }

  const pendingMembers = members.filter(m => m.status === 'pending')
  const approvedMembers = members.filter(m => m.status === 'approved')
  const canApprove = myRole === 'manager' || myRole === 'staff'
  const isManager = myRole === 'manager'

  const ProfileCell = ({ profile }) => (
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar src={profile?.avatar_url} sx={{ width: 36, height: 36, bgcolor: '#e2e8f0' }} />
      <Box>
        <Typography variant="body2" fontWeight="600">{profile?.full_name || t('chat.unknown_user')}</Typography>
        <Typography variant="caption" color="text.secondary">@{profile?.username}</Typography>
      </Box>
    </Stack>
  )

  const RoleChip = ({ role }) => {
    if (role === 'manager') return <Chip label={t('home.role_manager')} size="small" sx={{ bgcolor: '#fee2e2', color: '#b91c1c', fontWeight: 'bold', borderRadius: 1.5 }} />
    if (role === 'staff') return <Chip label={t('home.role_staff')} size="small" sx={{ bgcolor: '#dbeafe', color: '#1d4ed8', fontWeight: 'bold', borderRadius: 1.5 }} />
    return <Chip label={t('home.role_member')} size="small" sx={{ bgcolor: '#f1f5f9', color: '#64748b', borderRadius: 1.5 }} />
  }

  return (
    <Stack spacing={4}>
      
      {/* 1. 가입 신청 대기 목록 */}
      <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <CardHeader 
          title={<Typography variant="subtitle1" fontWeight="bold">{t('member.manage.pending_list', { count: pendingMembers.length })}</Typography>} // [수정]
          sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
        />
        <TableContainer>
          <Table size="medium">
            <TableBody>
              {pendingMembers.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}><Typography color="text.secondary">{t('member.manage.no_pending')}</Typography></TableCell></TableRow> // [수정]
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
                        {sub && <Chip label={t('member.manage.application')} size="small" variant="outlined" color="primary" sx={{ height: 24 }} />} {/* [수정] */}
                        {!sub && <Typography variant="caption" color="text.secondary">{t('member.manage.no_application')}</Typography>} {/* [수정] */}
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
                                {t('common.confirm')}
                              </Button>
                            )}
                            {!sub && (
                              <>
                                <Tooltip title={t('member.manage.quick_approve')}><IconButton onClick={() => handleAccept(m.id)} color="success"><Check /></IconButton></Tooltip> {/* [수정] */}
                                <Tooltip title={t('member.manage.reject')}><IconButton onClick={() => handleReject(m.id)} color="error"><Close /></IconButton></Tooltip> {/* [수정] */}
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
           title={<Typography variant="subtitle1" fontWeight="bold">{t('member.manage.all_members', { count: approvedMembers.length })}</Typography>} // [수정]
           sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5 }}
        />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="35%">{t('member.manage.col_member')}</TableCell> {/* [수정] */}
                <TableCell width="20%" align="center">{t('member.manage.col_role')}</TableCell> {/* [수정] */}
                <TableCell width="45%" align="right">{t('member.manage.col_manage')}</TableCell> {/* [수정] */}
              </TableRow>
            </TableHead>
            <TableBody>
              {approvedMembers.map(m => {
                const displayName = m.profiles?.full_name || m.profiles?.username
                const isSelf = m.user_id === currentUserId 
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
                        
                        {isManager && !isSelf && (
                          m.role === 'member' ? (
                            <Button size="small" onClick={() => handleChangeRole(m.id, 'staff')} sx={{ color: '#0f172a', textTransform:'none' }}>
                              {t('member.manage.promote')} {/* [수정] */}
                            </Button>
                          ) : m.role === 'staff' ? (
                            <Button size="small" onClick={() => handleChangeRole(m.id, 'member')} sx={{ color: '#ef4444', textTransform:'none' }}>
                              {t('member.manage.demote')} {/* [수정] */}
                            </Button>
                          ) : null
                        )}
                        
                        {isManager && !isSelf && m.role !== 'manager' && (
                          <Tooltip title={t('member.manage.transfer_manager')}> {/* [수정] */}
                             <IconButton size="small" onClick={() => handleTransferManager(m.user_id, displayName)} sx={{ color: '#f59e0b', '&:hover': { bgcolor: '#fffbeb' } }}>
                                <SwapHoriz fontSize="small" />
                             </IconButton>
                          </Tooltip>
                        )}
                        
                        {isManager && !isSelf && m.role !== 'manager' && (
                          <Tooltip title={t('member.manage.kick')}> {/* [수정] */}
                            <IconButton size="small" color="error" onClick={() => handleKickMember(m.id, displayName)}>
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
          <Typography variant="h6" fontWeight="bold">{t('member.manage.view_application')}</Typography> {/* [수정] */}
          <Typography variant="caption" color="text.secondary">{t('member.manage.applicant')}: {viewSubmission?.name}</Typography> {/* [수정] */}
        </DialogTitle>
        <DialogContent sx={{ p: 3, bgcolor: '#f8fafc' }}>
          <Stack spacing={2}>
            {viewSubmission?.submission_data?.map((item, idx) => (
              <Box key={idx} sx={{ bgcolor: 'white', p: 2.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Q. {item.question}
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontWeight: 500 }}>
                  {typeof item.answer === 'boolean' ? (item.answer ? '✅ Yes' : '⬜ No') : (item.answer || '-')}
                </Typography>
              </Box>
            ))}
            {(!viewSubmission?.submission_data || viewSubmission.submission_data.length === 0) && (
              <Typography color="text.secondary" align="center">{t('member.manage.no_content')}</Typography> // [수정]
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setViewSubmission(null)} sx={{ color: '#64748b', mr: 'auto' }}>{t('common.close')}</Button> {/* [수정] */}
          <Button variant="outlined" color="error" onClick={() => handleReject(viewSubmission?.memberId)} sx={{ borderRadius: 2 }}>{t('member.manage.reject')}</Button> {/* [수정] */}
          <Button variant="contained" color="success" onClick={() => handleAccept(viewSubmission?.memberId)} sx={{ borderRadius: 2, boxShadow: 'none' }}>{t('member.manage.approve')}</Button> {/* [수정] */}
        </DialogActions>
      </Dialog>

    </Stack>
  )
}