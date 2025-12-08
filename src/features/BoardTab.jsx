import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, TextField, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, Stack,
  ToggleButton, ToggleButtonGroup, Accordion, AccordionSummary, AccordionDetails, 
  Paper, Checkbox, FormControlLabel, Divider, Avatar, Grid, Pagination, Switch,
  List, ListItem, ListItemText, ListItemAvatar
} from '@mui/material'
import { 
  Edit, Event, Delete, ExpandMore, Description, Image as ImageIcon, 
  FilterList, Close, Send, Comment as CommentIcon, HowToVote, LocationOn,
  AddCircleOutline, RemoveCircleOutline, Visibility, Person
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function BoardTab({ clubId, isAdmin, myRole, currentUserId, initialPostId }) {
  const { t } = useTranslation()
  const [posts, setPosts] = useState([])
  const [groups, setGroups] = useState([])
  const [groupMembers, setGroupMembers] = useState([])
  const [postVotes, setPostVotes] = useState([])
  const [comments, setComments] = useState([])
  const [commentInputs, setCommentInputs] = useState({}) 
  const [selectedFilters, setSelectedFilters] = useState(['general'])
  const [page, setPage] = useState(1)
  const POSTS_PER_PAGE = 10
  const [expandedPanel, setExpandedPanel] = useState(initialPostId || false)
  
  // 글쓰기 관련 State
  const [openWrite, setOpenWrite] = useState(false)
  const [writeTargetId, setWriteTargetId] = useState('') 
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [postType, setPostType] = useState('general') 
  const [activityDate, setActivityDate] = useState('')
  const [location, setLocation] = useState('')
  const [imageFiles, setImageFiles] = useState([]) 
  const [uploading, setUploading] = useState(false)
  
  // 투표 관련 State
  const [voteOptions, setVoteOptions] = useState(['참여', '불참']) 
  const [newVoteOption, setNewVoteOption] = useState('')
  const [votePublic, setVotePublic] = useState(false) 

  // 투표자 명단 보기 모달 State
  const [openVoters, setOpenVoters] = useState(false)
  const [selectedVotePost, setSelectedVotePost] = useState(null) 

  const [snack, setSnack] = useState({ open: false, msg: '', type: 'info' })

  useEffect(() => { fetchData() }, [clubId])

  useEffect(() => {
    if (initialPostId) {
      setExpandedPanel(initialPostId)
      setPage(1)
    }
  }, [initialPostId])

  useEffect(() => {
    if (groups.length > 0 && groupMembers.length > 0) {
      const myGids = groupMembers.filter(gm => gm.user_id === currentUserId).map(gm => gm.group_id)
      if (isAdmin || myRole === 'staff') setSelectedFilters(['general', ...groups.map(g => g.id)])
      else setSelectedFilters(['general', ...myGids])
    }
  }, [groups, groupMembers, isAdmin, myRole, currentUserId])

  const fetchData = async () => {
    const { data: pData, error: pError } = await supabase.from('posts')
      .select(`*, profiles!posts_author_id_fkey(username, avatar_url), groups(name)`)
      .eq('club_id', clubId)
      .order('created_at', {ascending: false})
      
    if (pError) console.error('Error fetching posts:', pError)
    if (pData) setPosts(pData)
    
    const postIds = pData?.map(p => p.id) || []
    if (postIds.length > 0) {
      const { data: vData } = await supabase.from('post_votes')
        .select('*, profiles(username, full_name, avatar_url)')
        .in('post_id', postIds)
      if (vData) setPostVotes(vData)
      
      const { data: cData } = await supabase.from('post_comments').select(`*, profiles(username, avatar_url)`).in('post_id', postIds).order('created_at', {ascending: true})
      if (cData) setComments(cData)
    }
    supabase.from('groups').select('*').eq('club_id', clubId).then(({data}) => setGroups(data||[]))
    supabase.from('group_members').select(`*, groups!inner(*)`).eq('groups.club_id', clubId).then(({data}) => setGroupMembers(data||[]))
  }

  const handleCloseSnack = () => setSnack({ ...snack, open: false })
  const formatDate = (dateString) => { if (!dateString) return ''; return new Date(dateString).toISOString().split('T')[0] }
  const formatDateTime = (dateString) => { if (!dateString) return ''; return new Date(dateString).toLocaleString() }
  const handleToggleFilter = (id) => { if (selectedFilters.includes(id)) setSelectedFilters(selectedFilters.filter(fid => fid !== id)); else setSelectedFilters([...selectedFilters, id]); setPage(1) }
  const handleSelectAll = () => { if (selectedFilters.length === groups.length + 1) setSelectedFilters([]); else setSelectedFilters(['general', ...groups.map(g => g.id)]); setPage(1) }
  const handleFileChange = (e) => setImageFiles(prev => [...prev, ...Array.from(e.target.files)])
  const handleRemoveFile = (idx) => setImageFiles(prev => prev.filter((_, i) => i !== idx))

  const handleAddOption = () => {
    if (newVoteOption.trim() && !voteOptions.includes(newVoteOption.trim())) {
      setVoteOptions([...voteOptions, newVoteOption.trim()])
      setNewVoteOption('')
    }
  }
  const handleRemoveOption = (option) => {
    setVoteOptions(voteOptions.filter(o => o !== option))
  }

  const handlePost = async () => { 
    const canWriteAny = isAdmin || myRole === 'manager' || myRole === 'staff'
    if (!writeTargetId && !canWriteAny) return alert(t('board.alert_select_group'))
    if (!title.trim()) return alert(t('board.alert_input_title'))
    if (postType === 'activity' && !activityDate) return alert(t('board.alert_select_date'))
    if (postType === 'activity' && voteOptions.length < 2) return alert(t('board.alert_vote_options'))

    setUploading(true)
    let publicUrls = []

    try {
      if (imageFiles.length > 0) {
        const uploadPromises = imageFiles.map(async (file) => {
            const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${file.name.split('.').pop()}`
            const filePath = `${clubId}/posts/${safeName}`
            const { error: upErr } = await supabase.storage.from('club_files').upload(filePath, file)
            if (upErr) throw upErr
            const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
            return data.publicUrl
        })
        publicUrls = await Promise.all(uploadPromises)
      }

      const { data: { session } } = await supabase.auth.getSession()
      const finalGroupId = writeTargetId === 'general' ? null : writeTargetId
      
      const { error } = await supabase.from('posts').insert([{ 
        club_id: clubId, 
        author_id: session.user.id, 
        title, content, post_type: postType, 
        group_id: finalGroupId, 
        activity_date: postType === 'activity' ? activityDate : null, 
        location: postType === 'activity' ? location : null, 
        image_url: publicUrls,
        allow_comments: allowComments,
        vote_options: postType === 'activity' ? voteOptions : null,
        vote_public: postType === 'activity' ? votePublic : false
      }])

      if (error) throw error
      setSnack({ open: true, msg: t('board.msg_posted'), type: 'success' })
      handleCloseWrite(); fetchData()
    } catch (error) { 
      setSnack({ open: true, msg: 'Error: ' + error.message, type: 'error' }) 
    } 
    finally { setUploading(false) }
  }

  const handleCloseWrite = () => { 
    setOpenWrite(false); setTitle(''); setContent(''); setActivityDate(''); setLocation('');
    setImageFiles([]); setPostType('general'); setWriteTargetId(''); 
    setAllowComments(true);
    setVoteOptions(['참여', '불참']); setVotePublic(false);
  }
  
  const handleVote = async (postId, option) => { 
    const { error } = await supabase.from('post_votes').upsert({ 
      post_id: postId, user_id: currentUserId, vote_type: option 
    }, { onConflict: 'post_id, user_id' }); 
    if (error) alert('Error'); else fetchData() 
  }
  
  const handleDeletePost = async (postId) => { if (!confirm(t('common.confirm_delete'))) return; await supabase.from('posts').delete().eq('id', postId); fetchData() }
  const handleCommentChange = (postId, value) => { setCommentInputs(prev => ({ ...prev, [postId]: value })) }
  const handleSubmitComment = async (postId) => {
    const text = commentInputs[postId]; if (!text || !text.trim()) return
    const { error } = await supabase.from('post_comments').insert([{ post_id: postId, user_id: currentUserId, content: text.trim() }])
    if (error) alert('Error'); else { setCommentInputs(prev => ({ ...prev, [postId]: '' })); fetchData() }
  }
  const handleDeleteComment = async (commentId) => { if (!confirm(t('common.confirm_delete'))) return; await supabase.from('post_comments').delete().eq('id', commentId); fetchData() }
  const handleChangePanel = (panelId) => (event, isExpanded) => { setExpandedPanel(isExpanded ? panelId : false) }
  const filteredPosts = posts.filter(p => { const pGroupId = p.group_id || 'general'; return selectedFilters.includes(pGroupId) })
  const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const myLeaderGroupIds = groupMembers.filter(gm => gm.user_id === currentUserId && gm.role === 'leader').map(gm => gm.group_id)
  const isWriter = isAdmin || myRole === 'staff' || myLeaderGroupIds.length > 0
  const writeTargetOptions = (isAdmin || myRole === 'staff') ? groups : groups.filter(g => myLeaderGroupIds.includes(g.id))

  const handleOpenVoters = (post) => {
    setSelectedVotePost(post)
    setOpenVoters(true)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, minHeight: '60vh' }}>
      
      <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', md: '30%' }, p: 0, borderRadius: 3, bgcolor: 'white', height: 'fit-content', position: { md: 'sticky' }, top: 100, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FilterList fontSize="small" color="action" /> {t('board.filter')}</Typography>
          <Button size="small" onClick={handleSelectAll} sx={{ fontSize: '0.75rem', minWidth: 'auto' }}>{t('board.select_all')}</Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={selectedFilters.includes('general')} onChange={() => handleToggleFilter('general')} size="small" />} label={<Typography variant="body2" fontWeight={selectedFilters.includes('general')?600:400}>{t('board.general_notice')}</Typography>} sx={{ m: 0, p: 1, borderRadius: 2, bgcolor: selectedFilters.includes('general') ? '#eff6ff' : 'transparent', '&:hover': { bgcolor: '#f1f5f9' }}} />
            {groups.length > 0 && <Divider sx={{ my: 1 }} />}
            {groups.map(g => ( <FormControlLabel key={g.id} control={<Checkbox checked={selectedFilters.includes(g.id)} onChange={() => handleToggleFilter(g.id)} size="small" />} label={<Typography variant="body2" fontWeight={selectedFilters.includes(g.id)?600:400} sx={{color: selectedFilters.includes(g.id)?'text.primary':'text.secondary'}}>{g.name}</Typography>} sx={{ m: 0, p: 1, borderRadius: 2, bgcolor: selectedFilters.includes(g.id) ? '#fff7ed' : 'transparent', '&:hover': { bgcolor: '#fffbf0' }}} /> ))}
          </Stack>
        </Box>
      </Paper>

      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6" fontWeight="bold">{t('board.feed')}</Typography>
          {isWriter && <Button variant="contained" onClick={() => setOpenWrite(true)} startIcon={<Edit />} sx={{ borderRadius: 2, boxShadow: 'none' }}>{t('board.write_post')}</Button>}
        </Box>

        <Stack spacing={2.5}>
          {paginatedPosts.length === 0 && <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #e2e8f0' }}><Typography color="text.secondary">{t('board.no_posts')}</Typography></Box>}
          
          {paginatedPosts.map(p => {
            const votes = postVotes.filter(v => v.post_id === p.id)
            const myVote = votes.find(v => v.user_id === currentUserId)?.vote_type
            const isMyPost = p.author_id === currentUserId
            const canViewVoters = isAdmin || isMyPost || p.vote_public
            
            const myComments = comments.filter(c => c.post_id === p.id)
            let displayImages = []; if (Array.isArray(p.image_url)) displayImages = p.image_url; else if (typeof p.image_url === 'string' && p.image_url) displayImages = [p.image_url];
            const options = p.vote_options || ['참여', '지각', '불참']

            return (
              <Accordion 
                key={p.id} 
                expanded={expandedPanel === p.id}
                onChange={handleChangePanel(p.id)}
                disableGutters 
                elevation={0}
                sx={{ 
                  borderRadius: '16px !important', border: '1px solid #e2e8f0', bgcolor: 'white',
                  '&:before': { display: 'none' }, transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', borderColor: 'transparent' }
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore sx={{ color: '#94a3b8' }} />} sx={{ px: 3, py: 1.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 1 }}>
                    <Box sx={{ display:'flex', alignItems: 'center', gap: 1, flexWrap:'wrap' }}>
                      <Chip label={p.group_id ? p.groups?.name : t('board.general_notice')} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1, bgcolor: p.group_id ? '#ffedd5' : '#dbeafe', color: p.group_id ? '#c2410c' : '#1e40af' }} />
                      {p.post_type === 'activity' && <Chip label={`📅 ${formatDate(p.activity_date)}`} size="small" sx={{ height: 22, fontSize: '0.7rem', borderRadius: 1, bgcolor: '#fef3c7', color: '#b45309' }} />}
                      {p.location && ( <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.75rem' }}><LocationOn sx={{ fontSize: 14, mr: 0.5 }} /> {p.location}</Typography> )}
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{formatDate(p.created_at)}</Typography>
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ fontSize: '1.1rem', lineHeight: 1.3 }}>{p.title}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={p.profiles?.avatar_url} sx={{ width: 20, height: 20 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>{p.profiles?.username}</Typography>
                      {myComments.length > 0 && <Chip icon={<CommentIcon sx={{ fontSize: 12 }} />} label={myComments.length} size="small" sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#f1f5f9' }} />}
                    </Box>
                  </Box>
                </AccordionSummary>
                
                <AccordionDetails sx={{ px: 3, pb: 3, pt: 0 }}>
                  <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, color: '#334151', mb: 3 }}>{p.content}</Typography>

                  {/* [수정] 이미지 표시: 무조건 세로 정렬(Stack), 원본 비율 유지(height: auto) */}
                  {displayImages.length > 0 && (
                    <Stack spacing={2} sx={{ mb: 3 }}>
                        {displayImages.map((url, index) => (
                            <Box key={index} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <img src={url} alt={`img-${index}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                            </Box>
                        ))}
                    </Stack>
                  )}

                  {p.post_type === 'activity' && (
                    <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: '#fff7ed', border: '1px solid #ffedd5' }}>
                      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#c2410c', display:'flex', alignItems:'center', gap:1 }}>
                          <HowToVote fontSize="small"/> {t('board.vote_title')}
                        </Typography>
                        {canViewVoters && (
                          <Button size="small" startIcon={<Visibility />} onClick={() => handleOpenVoters(p)} sx={{ color: '#ea580c', fontSize: '0.75rem' }}>
                            {t('board.view_voters')}
                          </Button>
                        )}
                      </Box>
                      
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                        {options.map((opt) => {
                          const count = votes.filter(v => v.vote_type === opt).length
                          const isSelected = myVote === opt
                          return (
                            <Button 
                              key={opt}
                              size="small" 
                              variant={isSelected ? 'contained' : 'outlined'} 
                              color={isSelected ? "warning" : "inherit"}
                              onClick={() => handleVote(p.id, opt)} 
                              sx={{ borderRadius: 2, borderColor: isSelected ? 'transparent' : '#fed7aa', color: isSelected ? 'white' : '#9a3412', bgcolor: isSelected ? '#ea580c' : 'white' }}
                            >
                              {opt} ({count})
                            </Button>
                          )
                        })}
                      </Stack>
                    </Paper>
                  )}

                  <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #f1f5f9' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>{t('board.comments')} ({myComments.length})</Typography>
                    <Stack spacing={2} sx={{ mb: 3 }}>
                      {myComments.map(c => (
                        <Box key={c.id} sx={{ display: 'flex', gap: 1.5 }}>
                          <Avatar src={c.profiles?.avatar_url} sx={{ width: 32, height: 32 }} />
                          <Box sx={{ flex: 1, bgcolor: '#f8fafc', p: 1.5, borderRadius: 3, borderTopLeftRadius: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>{c.profiles?.username}</Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>{formatDateTime(c.created_at)}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.9rem' }}>{c.content}</Typography>
                            {(isAdmin || c.user_id === currentUserId) && <Typography variant="caption" color="error" sx={{ cursor: 'pointer', fontWeight: 'bold', mt: 0.5, display:'inline-block' }} onClick={() => handleDeleteComment(c.id)}>{t('common.delete')}</Typography>}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    {p.allow_comments ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" placeholder={t('board.comment_placeholder')} value={commentInputs[p.id] || ''} onChange={(e) => handleCommentChange(p.id, e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} onKeyPress={(e) => { if (e.key === 'Enter') handleSubmitComment(p.id) }} />
                        <IconButton color="primary" onClick={() => handleSubmitComment(p.id)} disabled={!commentInputs[p.id]?.trim()}><Send /></IconButton>
                      </Box>
                    ) : (<Alert severity="info" icon={false} sx={{ py: 0 }}>{t('board.comments_disabled')}</Alert>)}
                  </Box>

                  {(isAdmin || isMyPost) && <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}><IconButton size="small" onClick={() => handleDeletePost(p.id)} sx={{ color: '#94a3b8' }}><Delete fontSize="small" /></IconButton></Box>}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Stack>
        
        {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" shape="rounded"/></Box>}
      </Box>

      {/* 글쓰기 모달 */}
      <Dialog open={openWrite} onClose={handleCloseWrite} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>{t('board.write_new_post')}</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t('board.select_board')}</InputLabel>
              <Select value={writeTargetId} label={t('board.select_board')} onChange={e => setWriteTargetId(e.target.value)} sx={{ borderRadius: 2 }}>
                {(isAdmin || myRole === 'staff') && <MenuItem value="general">{t('board.general_notice')}</MenuItem>}
                {writeTargetOptions.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            
            <ToggleButtonGroup value={postType} exclusive onChange={(e, v) => { if(v) setPostType(v) }} fullWidth color="primary" sx={{ '& .MuiToggleButton-root': { borderRadius: 2, border: '1px solid #e2e8f0' } }}>
              <ToggleButton value="general"><Description sx={{mr:1}}/> {t('board.type_general')}</ToggleButton>
              <ToggleButton value="activity"><Event sx={{mr:1}}/> {t('board.type_activity')}</ToggleButton>
            </ToggleButtonGroup>

            {/* 사진 업로드 (공통) */}
            <Box>
                <Button component="label" variant="outlined" startIcon={<ImageIcon />} fullWidth sx={{ height: 56, borderStyle: 'dashed', borderRadius: 2, color: 'text.secondary', borderColor: '#cbd5e1', textTransform: 'none' }}>
                  {t('board.add_photos')}
                  <input type="file" hidden accept="image/*" multiple onChange={handleFileChange} />
                </Button>
                {imageFiles.length > 0 && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2, overflowX: 'auto', pb: 1 }}>
                      {imageFiles.map((file, index) => (
                          <Box key={index} sx={{ position: 'relative', width: 80, height: 80, flexShrink: 0, borderRadius: 2, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                              <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <IconButton size="small" onClick={() => handleRemoveFile(index)} sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', p: 0.5, '&:hover':{bgcolor:'rgba(0,0,0,0.7)'} }}><Close fontSize="small" sx={{ fontSize: 16 }} /></IconButton>
                          </Box>
                      ))}
                  </Stack>
                )}
            </Box>

            {postType === 'activity' && (
              <>
                <Stack direction="row" spacing={2}>
                  <TextField type="date" label={t('board.label_date')} InputLabelProps={{ shrink: true }} fullWidth value={activityDate} onChange={e => setActivityDate(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  <TextField label={t('board.label_location')} placeholder={t('board.placeholder_location')} fullWidth value={location} onChange={e => setLocation(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>

                {/* 투표 옵션 설정 */}
                <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                   <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>{t('board.label_vote_options')}</Typography>
                   <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                     <TextField 
                       size="small" fullWidth placeholder={t('board.placeholder_vote_option')} 
                       value={newVoteOption} onChange={e => setNewVoteOption(e.target.value)}
                       onKeyPress={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
                       sx={{ bgcolor: 'white' }}
                     />
                     <Button variant="contained" onClick={handleAddOption} disabled={!newVoteOption.trim()} sx={{ minWidth: 60 }}>
                       <AddCircleOutline />
                     </Button>
                   </Stack>
                   <Stack direction="row" flexWrap="wrap" gap={1}>
                     {voteOptions.map((opt, idx) => (
                       <Chip key={idx} label={opt} onDelete={() => handleRemoveOption(opt)} />
                     ))}
                   </Stack>
                </Box>
                
                {/* 투표 공개 설정 */}
                <FormControlLabel control={<Switch checked={votePublic} onChange={e => setVotePublic(e.target.checked)} />} label={<Typography variant="body2">{t('board.allow_vote_view')}</Typography>} />
              </>
            )}

            <TextField label={t('board.label_title')} fullWidth value={title} onChange={e => setTitle(e.target.value)} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label={t('board.label_content')} fullWidth multiline rows={6} value={content} onChange={e => setContent(e.target.value)} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            
            <FormControlLabel control={<Switch checked={allowComments} onChange={e => setAllowComments(e.target.checked)} />} label={<Typography variant="body2" color="text.secondary">{t('board.allow_comments')}</Typography>} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseWrite} sx={{ color: 'text.secondary' }}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={handlePost} disabled={uploading || !writeTargetId} sx={{ borderRadius: 2, boxShadow: 'none', px: 3 }}>{uploading ? t('common.loading') : t('board.btn_submit')}</Button>
        </DialogActions>
      </Dialog>

      {/* 투표자 명단 확인 모달 */}
      <Dialog open={openVoters} onClose={() => setOpenVoters(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 3 } }}>
         <DialogTitle sx={{ fontWeight: 'bold', borderBottom: '1px solid #eee' }}>{t('board.vote_result_title')}</DialogTitle>
         <DialogContent sx={{ p: 0 }}>
           {selectedVotePost && (
             <Box>
               {(selectedVotePost.vote_options || ['참여', '지각', '불참']).map(opt => {
                  const voters = postVotes.filter(v => v.post_id === selectedVotePost.id && v.vote_type === opt)
                  return (
                    <Accordion key={opt} disableGutters elevation={0} defaultExpanded sx={{ borderBottom: '1px solid #f1f5f9' }}>
                      <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: '#f8fafc' }}>
                        <Typography fontWeight="bold" sx={{ color: '#1e293b' }}>{opt} <Box component="span" sx={{ color: '#64748b', fontWeight: 400, ml: 1 }}>({voters.length})</Box></Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <List dense>
                          {voters.length === 0 && <ListItem><ListItemText primary={t('board.no_voters')} primaryTypographyProps={{ color: 'text.secondary', fontSize: '0.9rem', textAlign:'center' }} /></ListItem>}
                          {voters.map(v => (
                            <ListItem key={v.user_id}>
                              <ListItemAvatar>
                                <Avatar src={v.profiles?.avatar_url} sx={{ width: 30, height: 30 }} />
                              </ListItemAvatar>
                              <ListItemText primary={v.profiles?.full_name || v.profiles?.username} />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )
               })}
             </Box>
           )}
         </DialogContent>
         <DialogActions sx={{ p: 2 }}>
           <Button onClick={() => setOpenVoters(false)} color="inherit">{t('common.close')}</Button>
         </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={handleCloseSnack}><Alert onClose={handleCloseSnack} severity={snack.type}>{snack.msg}</Alert></Snackbar>
    </Box>
  )
}