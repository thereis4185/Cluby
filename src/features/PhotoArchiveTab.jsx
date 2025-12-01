import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Button, TextField, IconButton, Card, 
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Grid, List, ListItemButton, ListItemIcon, ListItemText, 
  Collapse, Pagination, Stack, Tooltip, Breadcrumbs, Link, Paper,
  ToggleButton, ToggleButtonGroup, Menu, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'
import { 
  CloudUpload, CreateNewFolder, Folder, FolderOpen, Delete,
  Image as ImageIcon, ExpandLess, ExpandMore, AddCircleOutline,
  NavigateNext, Person, GridView, ViewList, Sort, Download,
  DriveFileRenameOutline // [NEW] 수정 아이콘
} from '@mui/icons-material'

// --- [컴포넌트] 재귀형 폴더 트리 아이템 ---
const FolderTreeItem = ({ node, selectedFolderId, onSelect, onToggle, expandedIds, onAddSub, onRename, canManage }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.includes(node.id);
  const isSelected = selectedFolderId === node.id;

  return (
    <>
      <ListItemButton 
        sx={{ 
          pl: node.depth * 2 + 2, py: 0.8,
          borderLeft: isSelected ? '4px solid #4F46E5' : '4px solid transparent',
          bgcolor: isSelected ? 'rgba(79, 70, 229, 0.08) !important' : 'inherit',
          '&:hover': { bgcolor: '#f1f5f9' },
          '&:hover .action-btn': { opacity: 1 } // 호버 시 버튼들 표시
        }}
        onClick={() => onSelect(node)}
      >
        <Box 
          component="span" 
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
          sx={{ mr: 1, display: 'flex', alignItems: 'center', cursor: 'pointer', visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {isExpanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
        </Box>

        <ListItemIcon sx={{ minWidth: 32, color: isSelected ? '#fbbf24' : '#94a3b8' }}>
          {isSelected || isExpanded ? <FolderOpen fontSize="small" /> : <Folder fontSize="small" />}
        </ListItemIcon>

        <ListItemText 
          primary={node.name} 
          primaryTypographyProps={{ 
            noWrap: true, variant: 'body2',
            fontWeight: isSelected ? 'bold' : 'medium',
            color: isSelected ? 'text.primary' : 'text.secondary'
          }} 
        />

        {/* 액션 버튼 그룹 (추가/수정) */}
        {canManage && (
          <Stack direction="row" spacing={0} className="action-btn" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
             <Tooltip title="이름 변경">
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); onRename(node); }}
                sx={{ p: 0.5 }}
              >
                <DriveFileRenameOutline fontSize="inherit" color="action" />
              </IconButton>
            </Tooltip>
            <Tooltip title="하위 폴더 만들기">
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); onAddSub(node.id); }}
                sx={{ p: 0.5 }}
              >
                <AddCircleOutline fontSize="inherit" color="primary" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </ListItemButton>

      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {node.children.map(child => (
            <FolderTreeItem 
              key={child.id} node={child} selectedFolderId={selectedFolderId}
              onSelect={onSelect} onToggle={onToggle} expandedIds={expandedIds}
              onAddSub={onAddSub} onRename={onRename} canManage={canManage}
            />
          ))}
        </List>
      </Collapse>
    </>
  )
}

export default function PhotoArchiveTab({ clubId, currentUserId, myRole, groupMembers }) {
  // --- State ---
  const [flatFolders, setFlatFolders] = useState([]) 
  const [photos, setPhotos] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [expandedIds, setExpandedIds] = useState([]) 

  // UI View State
  const [viewMode, setViewMode] = useState('grid')
  const [sortOrder, setSortOrder] = useState('date_desc')
  const [anchorElSort, setAnchorElSort] = useState(null)

  // 페이지네이션
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 12

  // 모달 State
  const [openCreate, setOpenCreate] = useState(false)
  const [openRename, setOpenRename] = useState(false) // [NEW] 이름 변경 모달
  const [targetParentId, setTargetParentId] = useState(null) 
  const [targetRenameFolder, setTargetRenameFolder] = useState(null) // [NEW] 이름 변경 대상 폴더
  const [folderNameInput, setFolderNameInput] = useState('') // [NEW] 입력값 공용

  const [uploading, setUploading] = useState(false)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  // --- 권한 체크 ---
  const isAdmin = myRole === 'manager' || myRole === 'staff'
  const isGroupLeader = groupMembers?.some(m => m.user_id === currentUserId && m.role === 'leader')
  const canManageFolder = isAdmin || isGroupLeader
  const canUpload = !!myRole

  useEffect(() => { if (clubId) fetchFolders() }, [clubId])

  useEffect(() => {
    if (selectedFolder) fetchPhotos(selectedFolder.id, page)
    else setPhotos([])
  }, [selectedFolder, page, sortOrder])

  // --- 데이터 조회 ---
  const fetchFolders = async () => {
    const { data, error } = await supabase.from('photo_folders').select('*').eq('club_id', clubId).order('name', { ascending: true })
    if (error) console.error(error)
    else setFlatFolders(data || [])
  }
  // ... fetchPhotos 동일 ...
  const fetchPhotos = async (folderId, pageNum) => {
    setLoadingPhotos(true)
    const from = (pageNum - 1) * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1
    let query = supabase.from('photos').select(`id, file_name, file_url, created_at, uploader_id, profiles ( username )`, { count: 'exact' }).eq('club_id', clubId).eq('folder_id', folderId)
    if (sortOrder === 'date_desc') query = query.order('created_at', { ascending: false })
    else if (sortOrder === 'date_asc') query = query.order('created_at', { ascending: true })
    else if (sortOrder === 'name_asc') query = query.order('file_name', { ascending: true })
    const { data, count, error } = await query.range(from, to)
    if (error) { setPhotos([]) } else { setPhotos(data || []); setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE)) }
    setLoadingPhotos(false)
  }

  // --- 트리 & Breadcrumbs 동일 ---
  const folderTree = useMemo(() => {
    const buildTree = (items, parentId = null, depth = 0) => items.filter(item => item.parent_id === parentId).map(item => ({ ...item, depth, children: buildTree(items, item.id, depth + 1) }))
    return buildTree(flatFolders)
  }, [flatFolders])
  const breadcrumbs = useMemo(() => {
    if (!selectedFolder) return []; const path = []; let current = selectedFolder; while (current) { path.unshift(current); current = flatFolders.find(f => f.id === current.parent_id) } return path
  }, [selectedFolder, flatFolders])

  // --- 핸들러 ---
  const handleToggleFolder = (folderId) => setExpandedIds(prev => prev.includes(folderId) ? prev.filter(id => id !== folderId) : [...prev, folderId])
  const handleSelectFolder = (folder) => { if (selectedFolder?.id !== folder.id) { setSelectedFolder(folder); setPage(1); if (!expandedIds.includes(folder.id)) setExpandedIds(prev => [...prev, folder.id]) } }
  
  // [생성]
  const handleOpenCreate = (parentId = null) => { setTargetParentId(parentId); setFolderNameInput(''); setOpenCreate(true) }
  const handleCreateFolder = async () => {
    if (!folderNameInput.trim()) return alert('폴더명을 입력해주세요.')
    const { error } = await supabase.from('photo_folders').insert([{ club_id: clubId, name: folderNameInput, parent_id: targetParentId, creator_id: currentUserId }])
    if (error) alert('실패'); else { setOpenCreate(false); fetchFolders(); if (targetParentId) setExpandedIds(prev => [...prev, targetParentId]) }
  }

  // [수정 - NEW]
  const handleOpenRename = (folder) => { setTargetRenameFolder(folder); setFolderNameInput(folder.name); setOpenRename(true) }
  const handleRenameFolder = async () => {
    if (!folderNameInput.trim()) return alert('폴더명을 입력해주세요.')
    const { error } = await supabase.from('photo_folders').update({ name: folderNameInput }).eq('id', targetRenameFolder.id)
    if (error) alert('수정 실패'); else { setOpenRename(false); fetchFolders(); }
  }

  // [삭제]
  const handleDeleteFolder = async () => {
    if (!selectedFolder) return; if (!confirm('폴더와 내부 사진이 모두 삭제됩니다. 삭제하시겠습니까?')) return
    const { error } = await supabase.from('photo_folders').delete().eq('id', selectedFolder.id)
    if (error) alert('삭제 실패'); else { setSelectedFolder(null); fetchFolders() }
  }

  // ... handleUpload, handleDeletePhoto 동일 ...
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files); if (files.length === 0 || !selectedFolder) return; setUploading(true)
    try { await Promise.all(files.map(async (file) => {
        const fileExt = file.name.split('.').pop(); const safeName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`; const filePath = `photos/${clubId}/${selectedFolder.id}/${safeName}`
        const { error: upErr } = await supabase.storage.from('club_files').upload(filePath, file); if (upErr) throw upErr
        const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
        await supabase.from('photos').insert([{ club_id: clubId, uploader_id: currentUserId, folder_id: selectedFolder.id, file_name: file.name, file_url: data.publicUrl }])
      })); fetchPhotos(selectedFolder.id, page)
    } catch (err) { alert('업로드 실패') } finally { setUploading(false) }
  }
  const handleDeletePhoto = async (photoId) => { if (confirm('사진을 삭제하시겠습니까?')) { await supabase.from('photos').delete().eq('id', photoId); fetchPhotos(selectedFolder.id, page) } }
  const handleSortClick = (e) => setAnchorElSort(e.currentTarget); const handleSortClose = (o) => { if (o) setSortOrder(o); setAnchorElSort(null) }
  const getSortLabel = () => sortOrder === 'date_desc' ? '최신순' : sortOrder === 'date_asc' ? '오래된순' : '이름순'

  return (
    <Box sx={{ height: '75vh', display: 'flex', gap: 2 }}>
      
      {/* [LEFT] */}
      <Paper elevation={0} variant="outlined" sx={{ width: 280, display: 'flex', flexDirection: 'column', bgcolor: '#F8FAFC', borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display:'flex', justifyContent:'space-between', alignItems:'center', bgcolor: 'white', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">ALBUM EXPLORER</Typography>
          {canManageFolder && ( <Tooltip title="새 앨범 만들기"><IconButton size="small" onClick={() => handleOpenCreate(null)} color="primary"><CreateNewFolder fontSize="small" /></IconButton></Tooltip> )}
        </Box>
        <List sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
          {folderTree.map(node => (
            <FolderTreeItem 
              key={node.id} node={node} selectedFolderId={selectedFolder?.id} 
              onSelect={handleSelectFolder} onToggle={handleToggleFolder} expandedIds={expandedIds} 
              onAddSub={handleOpenCreate} onRename={handleOpenRename} canManage={canManageFolder} // [NEW] onRename 전달
            />
          ))}
          {flatFolders.length === 0 && <Typography variant="caption" sx={{ p: 2, display:'block', textAlign:'center', color:'text.secondary' }}>생성된 앨범이 없습니다.</Typography>}
        </List>
      </Paper>

      {/* [RIGHT] 동일 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {selectedFolder ? (
            <Breadcrumbs separator={<NavigateNext fontSize="small" />} aria-label="breadcrumb">
              {breadcrumbs.map((f, idx) => (
                <Link key={f.id} underline="hover" color={idx === breadcrumbs.length - 1 ? "text.primary" : "inherit"} onClick={() => handleSelectFolder(f)} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontSize: '0.9rem', fontWeight: idx === breadcrumbs.length - 1 ? 'bold' : 'normal' }}>
                  {idx === breadcrumbs.length - 1 && <FolderOpen fontSize="inherit" sx={{ mr: 0.5, color: '#fbbf24' }} />} {f.name}
                </Link>
              ))}
            </Breadcrumbs>
          ) : ( <Typography variant="body2" color="text.secondary" sx={{ display:'flex', alignItems:'center' }}><ImageIcon sx={{ mr: 1, fontSize: 18 }}/> 앨범을 선택해주세요</Typography> )}
          <Stack direction="row" spacing={1} alignItems="center">
            {selectedFolder && (
              <>
                 <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => { if(v) setViewMode(v) }} size="small" sx={{ height: 32 }}>
                  <ToggleButton value="grid"><GridView fontSize="small" /></ToggleButton>
                  <ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
                <Button startIcon={<Sort />} variant="outlined" size="small" onClick={handleSortClick} sx={{ height: 32 }}>{getSortLabel()}</Button>
                <Menu anchorEl={anchorElSort} open={Boolean(anchorElSort)} onClose={() => handleSortClose(null)}><MenuItem onClick={() => handleSortClose('date_desc')}>최신순</MenuItem><MenuItem onClick={() => handleSortClose('date_asc')}>오래된순</MenuItem><MenuItem onClick={() => handleSortClose('name_asc')}>이름순</MenuItem></Menu>
                {canUpload && ( <Button component="label" variant="contained" size="small" startIcon={uploading ? <CircularProgress size={16} color="inherit"/> : <CloudUpload />} disabled={uploading} sx={{ height: 32 }}>사진 업로드<input type="file" hidden multiple accept="image/*" onChange={handleUpload} /></Button> )}
                {canManageFolder && ( <IconButton size="small" color="error" onClick={handleDeleteFolder} sx={{ border: '1px solid #ffcdd2', borderRadius: 1 }}><Delete fontSize="small" /></IconButton> )}
              </>
            )}
          </Stack>
        </Paper>
        <Paper elevation={0} variant="outlined" sx={{ flex: 1, overflowY: 'auto', p: 0, bgcolor: 'white', borderRadius: 2 }}>
          {!selectedFolder ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}><ImageIcon sx={{ fontSize: 80, mb: 2, opacity: 0.3 }} /><Typography>좌측 목록에서 앨범을 선택하세요</Typography></Box>
          ) : loadingPhotos ? ( <Box sx={{ display:'flex', justifyContent:'center', mt: 10 }}><CircularProgress /></Box>
          ) : photos.length === 0 ? ( <Box sx={{ textAlign: 'center', mt: 10, color: 'text.secondary' }}><Typography>사진이 없습니다.</Typography></Box>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <Box sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    {photos.map(photo => (
                      <Grid item xs={6} sm={4} md={3} lg={2.4} key={photo.id}>
                        <Card variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', '&:hover': { borderColor: '#94a3b8', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' } }}>
                          <Box sx={{ height: 160, bgcolor: '#f8fafc', cursor: 'pointer', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => window.open(photo.file_url, '_blank')}><img src={photo.file_url} alt={photo.file_name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></Box>
                          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ maxWidth: '80%' }}><Person sx={{ fontSize: 16, color: '#94a3b8' }} /><Typography variant="caption" noWrap color="text.secondary" fontWeight="bold">{photo.profiles?.username || '알 수 없음'}</Typography></Stack>
                            {(isAdmin || photo.uploader_id === currentUserId) && ( <IconButton size="small" onClick={() => handleDeletePhoto(photo.id)} sx={{ p:0.5, color:'#ef5350' }}><Delete fontSize="inherit" /></IconButton> )}
                          </Box>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="medium">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow><TableCell width={60} align="center">미리보기</TableCell><TableCell>파일명</TableCell><TableCell width={120} align="center">게시자</TableCell><TableCell width={120} align="center">날짜</TableCell><TableCell width={80} align="right">관리</TableCell></TableRow></TableHead>
                    <TableBody>
                      {photos.map(photo => (
                        <TableRow key={photo.id} hover>
                          <TableCell align="center"><Box sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #eee' }}><img src={photo.file_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></Box></TableCell>
                          <TableCell component="th" scope="row"><Link href={photo.file_url} target="_blank" underline="hover" color="inherit"><Typography variant="body2">{photo.file_name}</Typography></Link></TableCell>
                          <TableCell align="center"><Typography variant="caption">{photo.profiles?.username}</Typography></TableCell>
                          <TableCell align="center"><Typography variant="caption" color="text.secondary">{new Date(photo.created_at).toLocaleDateString()}</Typography></TableCell>
                          <TableCell align="right"><Stack direction="row" justifyContent="flex-end"><IconButton size="small" href={photo.file_url} target="_blank"><Download fontSize="small" /></IconButton>{(isAdmin || photo.uploader_id === currentUserId) && ( <IconButton size="small" color="error" onClick={() => handleDeletePhoto(photo.id)}><Delete fontSize="small" /></IconButton> )}</Stack></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Paper>
        {selectedFolder && photos.length > 0 && ( <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'center' }}><Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" size="small" shape="rounded" /></Box> )}
      </Box>

      {/* 생성 Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{targetParentId ? '하위 앨범 만들기' : '새 앨범 만들기'}</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="앨범 이름" fullWidth variant="outlined" value={folderNameInput} onChange={(e) => setFolderNameInput(e.target.value)} /></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpenCreate(false)} color="inherit">취소</Button><Button onClick={handleCreateFolder} variant="contained" disabled={!folderNameInput.trim()}>생성</Button></DialogActions>
      </Dialog>

      {/* [NEW] 수정 Dialog */}
      <Dialog open={openRename} onClose={() => setOpenRename(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: '1.1rem', fontWeight: 'bold' }}>앨범 이름 변경</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label="새 이름" fullWidth variant="outlined" value={folderNameInput} onChange={(e) => setFolderNameInput(e.target.value)} /></DialogContent>
        <DialogActions sx={{ p: 2 }}><Button onClick={() => setOpenRename(false)} color="inherit">취소</Button><Button onClick={handleRenameFolder} variant="contained" disabled={!folderNameInput.trim()}>저장</Button></DialogActions>
      </Dialog>
    </Box>
  )
}