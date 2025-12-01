import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, TextField, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert, Stack,
  ToggleButton, ToggleButtonGroup, Accordion, AccordionSummary, AccordionDetails, 
  Paper, Checkbox, FormControlLabel, Divider, Avatar, Grid, Pagination, Switch
} from '@mui/material'
import { 
  Edit, Event, Delete, ExpandMore, Description, Image as ImageIcon, 
  FilterList, Close, Send, Comment as CommentIcon, CheckCircle, AccessTime, Cancel, HowToVote, LocationOn
} from '@mui/icons-material'

export default function BoardTab({ clubId, isAdmin, myRole, currentUserId, initialPostId }) {
  // ... (기존 state들은 동일) ...
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
  const [openWrite, setOpenWrite] = useState(false)
  const [writeTargetId, setWriteTargetId] = useState('') 
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [postType, setPostType] = useState('general') 
  const [activityDate, setActivityDate] = useState('')
  const [imageFiles, setImageFiles] = useState([]) 
  const [uploading, setUploading] = useState(false)
  
  // [NEW] 장소/시간 입력 상태 추가
  const [location, setLocation] = useState('') 

  const [snack, setSnack] = useState({ open: false, msg: '', type: 'info' })

  useEffect(() => { fetchData() }, [clubId])

  // ... (initialPostId effect, groups effect 동일) ...
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
    // [수정] location 컬럼 추가 조회
    const { data: pData, error: pError } = await supabase.from('posts')
      .select(`*, profiles!posts_author_id_fkey(username, avatar_url), groups(name)`)
      .eq('club_id', clubId)
      .order('created_at', {ascending: false})
      
    if (pError) console.error('Error fetching posts:', pError)
    if (pData) setPosts(pData)
    
    // ... (나머지 fetch 로직 동일) ...
    const postIds = pData?.map(p => p.id) || []
    if (postIds.length > 0) {
      const { data: vData } = await supabase.from('post_votes').select('*').in('post_id', postIds)
      if (vData) setPostVotes(vData)
      const { data: cData } = await supabase.from('post_comments').select(`*, profiles(username, avatar_url)`).in('post_id', postIds).order('created_at', {ascending: true})
      if (cData) setComments(cData)
    }
    supabase.from('groups').select('*').eq('club_id', clubId).then(({data}) => setGroups(data||[]))
    supabase.from('group_members').select(`*, groups!inner(*)`).eq('groups.club_id', clubId).then(({data}) => setGroupMembers(data||[]))
  }

  // ... (handleCloseSnack, formatDate, formatDateTime, handleToggleFilter, handleSelectAll, handleFileChange 동일) ...
  const handleCloseSnack = () => setSnack({ ...snack, open: false })
  const formatDate = (dateString) => { if (!dateString) return ''; return new Date(dateString).toISOString().split('T')[0] }
  const formatDateTime = (dateString) => { if (!dateString) return ''; return new Date(dateString).toLocaleString() }
  const handleToggleFilter = (id) => { if (selectedFilters.includes(id)) setSelectedFilters(selectedFilters.filter(fid => fid !== id)); else setSelectedFilters([...selectedFilters, id]); setPage(1) }
  const handleSelectAll = () => { if (selectedFilters.length === groups.length + 1) setSelectedFilters([]); else setSelectedFilters(['general', ...groups.map(g => g.id)]); setPage(1) }
  const handleFileChange = (e) => setImageFiles(prev => [...prev, ...Array.from(e.target.files)])
  const handleRemoveFile = (idx) => setImageFiles(prev => prev.filter((_, i) => i !== idx))

  const handlePost = async () => { 
    const canWriteAny = isAdmin || myRole === 'manager' || myRole === 'staff'
    if (!writeTargetId && !canWriteAny) return alert('작성할 그룹을 선택해주세요.')
    if (!title.trim()) return alert('제목을 입력해주세요.')
    if (postType === 'activity' && !activityDate) return alert('활동 날짜를 선택해주세요.')

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
      
      // [수정] insert 시 location 추가
      const { error } = await supabase.from('posts').insert([{ 
        club_id: clubId, 
        author_id: session.user.id, 
        title, content, post_type: postType, 
        group_id: finalGroupId, 
        activity_date: postType === 'activity' ? activityDate : null, 
        location: postType === 'activity' ? location : null, // location 저장
        image_url: publicUrls,
        allow_comments: allowComments
      }])

      if (error) throw error
      setSnack({ open: true, msg: '등록 완료', type: 'success' })
      handleCloseWrite(); fetchData()
    } catch (error) { 
      setSnack({ open: true, msg: '오류: ' + error.message, type: 'error' }) 
    } 
    finally { setUploading(false) }
  }

  const handleCloseWrite = () => { 
    setOpenWrite(false); setTitle(''); setContent(''); setActivityDate(''); setLocation('');
    setImageFiles([]); setPostType('general'); setWriteTargetId(''); 
    setAllowComments(true);
  }
  
  // ... (handleVote, handleDeletePost, 댓글 핸들러들, filteredPosts, totalPages 등 동일) ...
  const handleVote = async (postId, type) => { const { error } = await supabase.from('post_votes').upsert({ post_id: postId, user_id: currentUserId, vote_type: type }, { onConflict: 'post_id, user_id' }); if (error) alert('실패'); else fetchData() }
  const handleDeletePost = async (postId) => { if (!confirm('삭제하시겠습니까?')) return; await supabase.from('posts').delete().eq('id', postId); fetchData() }
  const handleCommentChange = (postId, value) => { setCommentInputs(prev => ({ ...prev, [postId]: value })) }
  const handleSubmitComment = async (postId) => {
    const text = commentInputs[postId]; if (!text || !text.trim()) return
    const { error } = await supabase.from('post_comments').insert([{ post_id: postId, user_id: currentUserId, content: text.trim() }])
    if (error) alert('실패'); else { setCommentInputs(prev => ({ ...prev, [postId]: '' })); fetchData() }
  }
  const handleDeleteComment = async (commentId) => { if (!confirm('삭제?')) return; await supabase.from('post_comments').delete().eq('id', commentId); fetchData() }
  const handleChangePanel = (panelId) => (event, isExpanded) => { setExpandedPanel(isExpanded ? panelId : false) }
  const filteredPosts = posts.filter(p => { const pGroupId = p.group_id || 'general'; return selectedFilters.includes(pGroupId) })
  const paginatedPosts = filteredPosts.slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  const myLeaderGroupIds = groupMembers.filter(gm => gm.user_id === currentUserId && gm.role === 'leader').map(gm => gm.group_id)
  const isWriter = isAdmin || myRole === 'staff' || myLeaderGroupIds.length > 0
  const writeTargetOptions = (isAdmin || myRole === 'staff') ? groups : groups.filter(g => myLeaderGroupIds.includes(g.id))

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, minHeight: '60vh' }}>
      
      {/* [왼쪽] 필터 패널 (유지) */}
      <Paper elevation={0} variant="outlined" sx={{ width: { xs: '100%', md: '30%' }, p: 0, borderRadius: 3, bgcolor: 'white', height: 'fit-content', position: { md: 'sticky' }, top: 100, overflow: 'hidden' }}>
        <Box sx={{ p: 2.5, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><FilterList fontSize="small" color="action" /> 필터</Typography>
          <Button size="small" onClick={handleSelectAll} sx={{ fontSize: '0.75rem', minWidth: 'auto' }}>전체 선택</Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <Stack spacing={0.5}>
            <FormControlLabel control={<Checkbox checked={selectedFilters.includes('general')} onChange={() => handleToggleFilter('general')} size="small" />} label={<Typography variant="body2" fontWeight={selectedFilters.includes('general')?600:400}>전체 공지</Typography>} sx={{ m: 0, p: 1, borderRadius: 2, bgcolor: selectedFilters.includes('general') ? '#eff6ff' : 'transparent', '&:hover': { bgcolor: '#f1f5f9' }}} />
            {groups.length > 0 && <Divider sx={{ my: 1 }} />}
            {groups.map(g => ( <FormControlLabel key={g.id} control={<Checkbox checked={selectedFilters.includes(g.id)} onChange={() => handleToggleFilter(g.id)} size="small" />} label={<Typography variant="body2" fontWeight={selectedFilters.includes(g.id)?600:400} sx={{color: selectedFilters.includes(g.id)?'text.primary':'text.secondary'}}>{g.name}</Typography>} sx={{ m: 0, p: 1, borderRadius: 2, bgcolor: selectedFilters.includes(g.id) ? '#fff7ed' : 'transparent', '&:hover': { bgcolor: '#fffbf0' }}} /> ))}
          </Stack>
        </Box>
      </Paper>

      {/* [오른쪽] 게시글 피드 */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h6" fontWeight="bold">피드</Typography>
          {isWriter && <Button variant="contained" onClick={() => setOpenWrite(true)} startIcon={<Edit />} sx={{ borderRadius: 2, boxShadow: 'none' }}>글쓰기</Button>}
        </Box>

        <Stack spacing={2.5}>
          {paginatedPosts.length === 0 && <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #e2e8f0' }}><Typography color="text.secondary">표시할 게시글이 없습니다.</Typography></Box>}
          
          {paginatedPosts.map(p => {
            const votes = postVotes.filter(v => v.post_id === p.id)
            const myVote = votes.find(v => v.user_id === currentUserId)?.vote_type
            const pCount = votes.filter(v => v.vote_type === 'participate').length
            const lCount = votes.filter(v => v.vote_type === 'late').length
            const aCount = votes.filter(v => v.vote_type === 'absent').length
            const isMyPost = p.author_id === currentUserId
            const myComments = comments.filter(c => c.post_id === p.id)
            let displayImages = []; if (Array.isArray(p.image_url)) displayImages = p.image_url; else if (typeof p.image_url === 'string' && p.image_url) displayImages = [p.image_url];

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
                      <Chip label={p.group_id ? p.groups?.name : '전체공지'} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 700, borderRadius: 1, bgcolor: p.group_id ? '#ffedd5' : '#dbeafe', color: p.group_id ? '#c2410c' : '#1e40af' }} />
                      {p.post_type === 'activity' && <Chip label={`📅 ${formatDate(p.activity_date)}`} size="small" sx={{ height: 22, fontSize: '0.7rem', borderRadius: 1, bgcolor: '#fef3c7', color: '#b45309' }} />}
                      {/* [수정] 게시글 목록에서도 장소 표시 */}
                      {p.location && (
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.75rem' }}>
                          <LocationOn sx={{ fontSize: 14, mr: 0.5 }} /> {p.location}
                        </Typography>
                      )}
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

                  {displayImages.length > 0 && (
                    <Grid container spacing={1} sx={{ mb: 3 }}>
                        {displayImages.map((url, index) => (
                            <Grid key={index} size={{ xs: 12, md: displayImages.length === 1 ? 12 : 6 }}>
                                <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid #e2e8f0', aspectRatio: displayImages.length === 1 ? 'auto' : '1/1', maxHeight: 400 }}>
                                    <img src={url} alt={`img-${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                  )}

                  {p.post_type === 'activity' && (
                    <Paper elevation={0} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: '#fff7ed', border: '1px solid #ffedd5' }}>
                      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#c2410c', display:'flex', alignItems:'center', gap:1 }}>
                          <HowToVote fontSize="small"/> 활동 참여 투표
                        </Typography>
                        <Box sx={{ textAlign:'right' }}>
                          {p.activity_date && <Typography variant="caption" display="block" fontWeight="bold" color="#c2410c">📅 {p.activity_date}</Typography>}
                          {p.location && <Typography variant="caption" display="block" color="#c2410c">📍 {p.location}</Typography>}
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant={myVote==='participate'?'contained':'outlined'} color="success" onClick={()=>handleVote(p.id, 'participate')} sx={{borderRadius: 2}}>참여</Button>
                        <Button size="small" variant={myVote==='late'?'contained':'outlined'} color="warning" onClick={()=>handleVote(p.id, 'late')} sx={{borderRadius: 2}}>지각</Button>
                        <Button size="small" variant={myVote==='absent'?'contained':'outlined'} color="error" onClick={()=>handleVote(p.id, 'absent')} sx={{borderRadius: 2}}>불참</Button>
                      </Stack>
                    </Paper>
                  )}

                  {/* 댓글 섹션 (유지) */}
                  <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #f1f5f9' }}>
                    {/* ... (이전과 동일) ... */}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>댓글 ({myComments.length})</Typography>
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
                            {(isAdmin || c.user_id === currentUserId) && <Typography variant="caption" color="error" sx={{ cursor: 'pointer', fontWeight: 'bold', mt: 0.5, display:'inline-block' }} onClick={() => handleDeleteComment(c.id)}>삭제</Typography>}
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                    {p.allow_comments ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField fullWidth size="small" placeholder="댓글 입력..." value={commentInputs[p.id] || ''} onChange={(e) => handleCommentChange(p.id, e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }} onKeyPress={(e) => { if (e.key === 'Enter') handleSubmitComment(p.id) }} />
                        <IconButton color="primary" onClick={() => handleSubmitComment(p.id)} disabled={!commentInputs[p.id]?.trim()}><Send /></IconButton>
                      </Box>
                    ) : (<Alert severity="info" icon={false} sx={{ py: 0 }}>댓글 중지됨</Alert>)}
                  </Box>

                  {(isAdmin || isMyPost) && <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}><IconButton size="small" onClick={() => handleDeletePost(p.id)} sx={{ color: '#94a3b8' }}><Delete fontSize="small" /></IconButton></Box>}
                </AccordionDetails>
              </Accordion>
            )
          })}
        </Stack>
        
        {totalPages > 1 && <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" shape="rounded"/></Box>}
      </Box>

      {/* 글쓰기 모달 수정 */}
      <Dialog open={openWrite} onClose={handleCloseWrite} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #f1f5f9' }}>새 게시글 작성</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>게시판 선택</InputLabel>
              <Select value={writeTargetId} label="게시판 선택" onChange={e => setWriteTargetId(e.target.value)} sx={{ borderRadius: 2 }}>
                {(isAdmin || myRole === 'staff') && <MenuItem value="general">전체 공지</MenuItem>}
                {writeTargetOptions.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            
            <ToggleButtonGroup value={postType} exclusive onChange={(e, v) => { if(v) setPostType(v) }} fullWidth color="primary" sx={{ '& .MuiToggleButton-root': { borderRadius: 2, border: '1px solid #e2e8f0' } }}>
              <ToggleButton value="general"><Description sx={{mr:1}}/> 일반글</ToggleButton>
              <ToggleButton value="activity"><Event sx={{mr:1}}/> 활동/모임</ToggleButton>
            </ToggleButtonGroup>

            {postType === 'activity' ? 
              <Stack direction="row" spacing={2}>
                {/* [수정] 날짜와 장소 입력란 병렬 배치 */}
                <TextField type="date" label="활동 날짜" InputLabelProps={{ shrink: true }} fullWidth value={activityDate} onChange={e => setActivityDate(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                <TextField label="장소 및 시간" placeholder="예: 학생회관 14시" fullWidth value={location} onChange={e => setLocation(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Stack>
              : 
              <Box>
                  <Button component="label" variant="outlined" startIcon={<ImageIcon />} fullWidth sx={{ height: 56, borderStyle: 'dashed', borderRadius: 2, color: 'text.secondary', borderColor: '#cbd5e1', textTransform: 'none' }}>
                    사진 추가하기 (여러 장 선택 가능)
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
            }

            <TextField label="제목" fullWidth value={title} onChange={e => setTitle(e.target.value)} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            <TextField label="내용" fullWidth multiline rows={6} value={content} onChange={e => setContent(e.target.value)} variant="outlined" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            
            <FormControlLabel control={<Switch checked={allowComments} onChange={e => setAllowComments(e.target.checked)} />} label={<Typography variant="body2" color="text.secondary">댓글 작성 허용</Typography>} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseWrite} sx={{ color: 'text.secondary' }}>취소</Button>
          <Button variant="contained" onClick={handlePost} disabled={uploading || !writeTargetId} sx={{ borderRadius: 2, boxShadow: 'none', px: 3 }}>{uploading ? '업로드 중...' : '등록하기'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}