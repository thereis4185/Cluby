import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Paper, Typography, List, ListItem, ListItemText, ListItemButton,
  IconButton, Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, Chip, InputAdornment, Stack, Avatar
} from '@mui/material'
import { Add, Delete, Star, StarBorder, Search, PersonAdd, Groups, VerifiedUser } from '@mui/icons-material'

export default function GroupManageTab({ clubId, isAdmin, currentUserId }) {
  const [groups, setGroups] = useState([])
  const [selectedGroupId, setSelectedGroupId] = useState(null)
  const [groupMembers, setGroupMembers] = useState([])
  const [clubMembers, setClubMembers] = useState([]) 

  const [searchQuery, setSearchQuery] = useState('')
  const [newGroupName, setNewGroupName] = useState('') 
  const [openAddMember, setOpenAddMember] = useState(false)
  const [targetMemberId, setTargetMemberId] = useState('')

  const [isGroupLeader, setIsGroupLeader] = useState(false)

  useEffect(() => {
    if (clubId) { fetchGroups(); fetchClubMembers(); }
  }, [clubId])
  
  useEffect(() => { 
    if (selectedGroupId) {
      fetchGroupMembers(selectedGroupId)
      if (currentUserId) checkGroupLeader(selectedGroupId)
    }
  }, [selectedGroupId, currentUserId])

  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').eq('club_id', clubId).order('name')
    if (data) setGroups(data)
  }

  const fetchClubMembers = async () => {
    const { data } = await supabase.from('club_members').select('*, profiles(username, full_name, avatar_url)').eq('club_id', clubId).eq('status', 'approved')
    if (data) setClubMembers(data)
  }

  const fetchGroupMembers = async (groupId) => {
    const { data } = await supabase.from('group_members').select('*, profiles(username, full_name, avatar_url)').eq('group_id', groupId)
    if (data) setGroupMembers(data)
  }

  const checkGroupLeader = async (groupId) => {
    if (isAdmin) { setIsGroupLeader(true); return; }
    const { data } = await supabase.from('group_members').select('role').eq('group_id', groupId).eq('user_id', currentUserId).eq('role', 'leader').single()
    setIsGroupLeader(!!data)
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return alert('그룹 이름을 입력해주세요.')
    const { error } = await supabase.from('groups').insert([{ club_id: clubId, name: newGroupName.trim() }])
    if (error) alert('그룹 생성 실패: ' + error.message)
    else { alert('그룹이 생성되었습니다.'); setNewGroupName(''); fetchGroups() }
  }

  const handleDeleteGroup = async (gid) => {
    if (!confirm('그룹을 삭제하시겠습니까?')) return
    await supabase.from('groups').delete().eq('id', gid)
    if (selectedGroupId === gid) setSelectedGroupId(null)
    fetchGroups()
  }

  const handleAddMember = async () => {
    if (!targetMemberId) return
    const { error } = await supabase.from('group_members').insert([{ user_id: targetMemberId, group_id: selectedGroupId }])
    if (error) {
      if (error.code === '23505') alert('이미 그룹에 속해 있는 멤버입니다.')
      else alert('오류 발생: ' + error.message)
    } else { 
      fetchGroupMembers(selectedGroupId)
      setOpenAddMember(false)
      setTargetMemberId('')
    }
  }

  const handleRemoveMember = async (userId) => {
    if (!confirm('제외하시겠습니까?')) return
    await supabase.from('group_members').delete().eq('user_id', userId).eq('group_id', selectedGroupId)
    fetchGroupMembers(selectedGroupId)
  }

  const toggleLeader = async (userId, currentRole) => {
    const newRole = currentRole === 'leader' ? 'member' : 'leader'
    await supabase.from('group_members').update({ role: newRole }).eq('user_id', userId).eq('group_id', selectedGroupId)
    fetchGroupMembers(selectedGroupId)
  }

  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const availableMembers = clubMembers.filter(cm => !groupMembers.some(gm => gm.user_id === cm.user_id))
  const canEdit = isAdmin || isGroupLeader

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ minHeight: '70vh' }}>
      
      {/* 왼쪽: 그룹 목록 패널 */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ width: { xs: '100%', md: '35%' }, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}
      >
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>그룹 목록</Typography>
          <TextField 
            fullWidth size="small" placeholder="그룹 검색..." 
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>, sx: { bgcolor: 'white', borderRadius: 2 } }}
            sx={{ mb: 2 }}
          />
          {isAdmin && (
             <Stack direction="row" spacing={1}>
                <TextField 
                  size="small" fullWidth placeholder="새 그룹 이름" 
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)} 
                  sx={{ bgcolor: 'white', borderRadius: 2 }}
                />
                <Button variant="contained" onClick={handleCreateGroup} sx={{ minWidth: '40px', borderRadius: 2 }}><Add /></Button>
             </Stack>
          )}
        </Box>

        <List sx={{ flexGrow: 1, overflowY: 'auto', px: 1, py: 1 }}>
          {filteredGroups.length === 0 && <Typography variant="caption" color="text.secondary" sx={{ p: 2, display:'block', textAlign:'center' }}>그룹이 없습니다.</Typography>}
          {filteredGroups.map(group => (
            <ListItem 
              key={group.id} 
              disablePadding 
              sx={{ mb: 1 }}
              secondaryAction={
                isAdmin && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} sx={{ color: '#cbd5e1', '&:hover': { color: '#ef4444' } }}>
                    <Delete fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemButton 
                selected={selectedGroupId === group.id} 
                onClick={() => setSelectedGroupId(group.id)}
                sx={{ 
                  borderRadius: 2, 
                  '&.Mui-selected': { bgcolor: '#eff6ff', border: '1px solid #bfdbfe', '&:hover': { bgcolor: '#dbeafe' } },
                  '&:not(.Mui-selected):hover': { bgcolor: '#f1f5f9' }
                }}
              >
                {/* [수정] 아이콘 제거됨 */}
                <ListItemText primary={group.name} primaryTypographyProps={{ fontWeight: selectedGroupId === group.id ? 600 : 400 }} sx={{ pl: 1 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* 오른쪽: 상세 정보 패널 */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ width: { xs: '100%', md: '65%' }, p: 0, display: 'flex', flexDirection: 'column', borderRadius: 3, overflow: 'hidden' }}
      >
        {selectedGroupId ? (
          <>
            {/* 헤더 */}
            <Box sx={{ p: 3, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff' }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                   {groups.find(g => g.id === selectedGroupId)?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">총 {groupMembers.length}명의 멤버</Typography>
              </Box>
              {canEdit && (
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => setOpenAddMember(true)} size="small" sx={{ borderRadius: 2, boxShadow: 'none' }}>
                  멤버 추가
                </Button>
              )}
            </Box>
            
            {/* 멤버 리스트 */}
            <List sx={{ flexGrow: 1, overflowY: 'auto', px: 2, py: 2 }}>
              {groupMembers.length === 0 && (
                <Box sx={{ py: 10, textAlign: 'center', color: 'text.secondary' }}>
                  <Groups sx={{ fontSize: 48, color: '#e2e8f0', mb: 1 }} />
                  <Typography>아직 그룹 멤버가 없습니다.</Typography>
                </Box>
              )}
              {groupMembers.map(member => (
                <ListItem 
                  key={member.user_id} 
                  sx={{ 
                    mb: 1, border: '1px solid #f1f5f9', borderRadius: 3, 
                    transition: '0.2s', '&:hover': { bgcolor: '#fafafa', borderColor: '#e2e8f0' }
                  }}
                >
                   <Avatar src={member.profiles?.avatar_url} sx={{ mr: 2, width: 40, height: 40 }} />
                   <ListItemText 
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontWeight="600">{member.profiles?.full_name || member.profiles?.username}</Typography>
                        {member.role === 'leader' && <Chip label="그룹장" size="small" icon={<VerifiedUser sx={{fontSize: '14px !important'}} />} sx={{ height: 20, bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 'bold', '& .MuiChip-icon': { color: '#1e40af' } }} />}
                      </Stack>
                    }
                    secondary={member.profiles?.username}
                  />
                  {canEdit && (
                    <Stack direction="row" spacing={0}>
                      <IconButton size="small" onClick={() => toggleLeader(member.user_id, member.role)} color={member.role === 'leader' ? 'primary' : 'default'} title={member.role === 'leader' ? "그룹장 해제" : "그룹장 임명"}>
                        {member.role === 'leader' ? <Star /> : <StarBorder />}
                      </IconButton>
                      <IconButton size="small" onClick={() => handleRemoveMember(member.user_id)} color="error" title="멤버 제외">
                        <Delete />
                      </IconButton>
                    </Stack>
                  )}
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', bgcolor: '#f8fafc' }}>
            <Groups sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" fontWeight="bold">그룹을 선택해주세요</Typography>
            <Typography variant="body2">좌측 목록에서 그룹을 선택하여 멤버를 관리하세요.</Typography>
          </Box>
        )}
      </Paper>

      {/* 멤버 추가 모달 */}
      <Dialog open={openAddMember} onClose={() => setOpenAddMember(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>멤버 추가</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>추가할 멤버 선택</Typography>
          <Select fullWidth value={targetMemberId} onChange={e => setTargetMemberId(e.target.value)} displayEmpty sx={{ borderRadius: 2 }}>
            <MenuItem value="" disabled>멤버 목록</MenuItem>
            {availableMembers.map(m => (
              <MenuItem key={m.user_id} value={m.user_id}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Avatar src={m.profiles?.avatar_url} sx={{ width: 24, height: 24 }} />
                  <Typography>{m.profiles?.username}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddMember(false)} sx={{ color: 'text.secondary' }}>취소</Button>
          <Button variant="contained" onClick={handleAddMember} disabled={!targetMemberId} sx={{ borderRadius: 2, boxShadow: 'none' }}>추가하기</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}