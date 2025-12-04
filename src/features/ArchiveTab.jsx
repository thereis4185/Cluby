import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Paper, Box, Button, Typography, Card, CardContent, CardActions, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Breadcrumbs, Link, Stack, IconButton,
  ToggleButton, ToggleButtonGroup, Menu, MenuItem, 
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Tooltip
} from '@mui/material'
import { 
  CloudUpload, CreateNewFolder, Folder, Delete, 
  Image as ImageIcon, Description, GridView, ViewList, Sort,
  Download, ArrowBack, DriveFileRenameOutline
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function ArchiveTab({ clubId, isAdmin }) {
  const { t } = useTranslation() // [추가]
  const [archives, setArchives] = useState([])
  const [folders, setFolders] = useState([])
  const [currentFolderId, setCurrentFolderId] = useState(null)
  const [folderPath, setFolderPath] = useState([])
  const [uploading, setUploading] = useState(false)
  const [viewMode, setViewMode] = useState('grid') 
  const [sortOrder, setSortOrder] = useState('date_desc')
  const [anchorElSort, setAnchorElSort] = useState(null)

  // 모달 State
  const [openFolder, setOpenFolder] = useState(false)
  const [openRename, setOpenRename] = useState(false) 
  const [folderNameInput, setFolderNameInput] = useState('') 
  const [targetRenameFolder, setTargetRenameFolder] = useState(null) 

  useEffect(() => { fetchContents() }, [clubId, currentFolderId])

  const fetchContents = async () => {
    let folderQuery = supabase.from('folders').select('*').eq('club_id', clubId)
    if (currentFolderId) folderQuery = folderQuery.eq('parent_id', currentFolderId)
    else folderQuery = folderQuery.is('parent_id', null)
    const { data: folderData } = await folderQuery; if (folderData) setFolders(folderData)

    let fileQuery = supabase.from('archives').select(`*, profiles(username)`).eq('club_id', clubId)
    if (currentFolderId) fileQuery = fileQuery.eq('folder_id', currentFolderId)
    else fileQuery = fileQuery.is('folder_id', null)
    const { data: fileData } = await fileQuery; if (fileData) setArchives(fileData)
  }

  const getSortedData = (data, type = 'file') => {
    return [...data].sort((a, b) => {
      const nameA = type === 'folder' ? a.name : a.file_name; const nameB = type === 'folder' ? b.name : b.file_name
      const dateA = new Date(a.created_at); const dateB = new Date(b.created_at)
      switch (sortOrder) {
        case 'name_asc': return nameA.localeCompare(nameB)
        case 'name_desc': return nameB.localeCompare(nameA)
        case 'date_asc': return dateA - dateB
        case 'date_desc': return dateB - dateA
        default: return 0
      }
    })
  }
  const sortedFolders = getSortedData(folders, 'folder'); const sortedArchives = getSortedData(archives, 'file')

  // [생성]
  const handleOpenCreate = () => { setFolderNameInput(''); setOpenFolder(true) }
  const handleCreateFolder = async () => {
    if (!folderNameInput.trim()) return
    const { error } = await supabase.from('folders').insert([{ club_id: clubId, name: folderNameInput, parent_id: currentFolderId }])
    if (error) alert('Error'); else { setOpenFolder(false); fetchContents() }
  }

  // [수정]
  const handleOpenRename = (folder) => { setTargetRenameFolder(folder); setFolderNameInput(folder.name); setOpenRename(true) }
  const handleRenameFolder = async () => {
    if (!folderNameInput.trim()) return
    const { error } = await supabase.from('folders').update({ name: folderNameInput }).eq('id', targetRenameFolder.id)
    if (error) alert('Error'); else { setOpenRename(false); fetchContents() }
  }

  // ... (나머지 핸들러 동일) ...
  const handleDeleteFolder = async (fid) => { if (!confirm(t('common.confirm_delete'))) return; await supabase.from('folders').delete().eq('id', fid); fetchContents() } // [수정]
  const handleDeleteArchive = async (aid) => { if (!confirm(t('common.confirm_delete'))) return; await supabase.from('archives').delete().eq('id', aid); fetchContents() } // [수정]
  const handleFile = async (e) => {
    const file = e.target.files[0]; if (!file) return; setUploading(true)
    try {
      const fileExt = file.name.split('.').pop().toLowerCase(); const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${fileExt}`; const filePath = `${clubId}/${safeFileName}`
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExt); const autoCategory = isImage ? 'photo' : 'doc'
      const { error: uploadError } = await supabase.storage.from('club_files').upload(filePath, file); if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('club_files').getPublicUrl(filePath)
      const { data: { session } } = await supabase.auth.getSession()
      await supabase.from('archives').insert([{ club_id: clubId, uploader_id: session.user.id, file_name: file.name, file_url: publicUrl, category: autoCategory, folder_id: currentFolderId }])
      fetchContents()
    } catch(err) { alert(err.message) } finally { setUploading(false); e.target.value = null }
  }
  const handleEnterFolder = (folder) => { setFolderPath([...folderPath, folder]); setCurrentFolderId(folder.id) }
  const handleNavigateUp = (index) => { if (index === -1) { setFolderPath([]); setCurrentFolderId(null) } else { const newPath = folderPath.slice(0, index + 1); setFolderPath(newPath); setCurrentFolderId(newPath[newPath.length - 1].id) } }
  const handleGoParent = () => { handleNavigateUp(folderPath.length - 2) }
  const handleSortClick = (e) => setAnchorElSort(e.currentTarget); const handleSortClose = (o) => { if (o) setSortOrder(o); setAnchorElSort(null) }
  
  // [수정] 정렬 라벨 다국어
  const getSortLabel = () => {
    if (sortOrder === 'date_desc') return t('archive.sort_latest')
    if (sortOrder === 'date_asc') return t('archive.sort_oldest')
    if (sortOrder === 'name_asc') return t('archive.sort_name_asc')
    return t('archive.sort_name_desc')
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }} elevation={0} variant="outlined">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link component="button" variant="body1" underline="hover" color="inherit" onClick={() => handleNavigateUp(-1)} sx={{ fontWeight: !currentFolderId ? 'bold' : 'normal', display:'flex', alignItems:'center' }}>
              <Folder fontSize="small" sx={{mr:0.5, color: !currentFolderId ? 'primary.main' : 'inherit'}}/> {t('archive.home')}
            </Link>
            {folderPath.map((folder, index) => ( <Link key={folder.id} component="button" variant="body1" underline="hover" color="inherit" onClick={() => handleNavigateUp(index)} sx={{ fontWeight: index === folderPath.length - 1 ? 'bold' : 'normal' }}>{folder.name}</Link> ))}
          </Breadcrumbs>
          <Stack direction="row" spacing={1} alignItems="center">
             <ToggleButtonGroup value={viewMode} exclusive onChange={(e, v) => { if(v) setViewMode(v) }} size="small" sx={{ height: 32 }}><ToggleButton value="grid"><GridView fontSize="small" /></ToggleButton><ToggleButton value="list"><ViewList fontSize="small" /></ToggleButton></ToggleButtonGroup>
            <Button startIcon={<Sort />} variant="outlined" size="small" onClick={handleSortClick} sx={{ height: 32 }}>{getSortLabel()}</Button>
            <Menu anchorEl={anchorElSort} open={Boolean(anchorElSort)} onClose={() => handleSortClose(null)}>
              <MenuItem onClick={() => handleSortClose('date_desc')}>{t('archive.sort_latest')}</MenuItem>
              <MenuItem onClick={() => handleSortClose('date_asc')}>{t('archive.sort_oldest')}</MenuItem>
              <MenuItem onClick={() => handleSortClose('name_asc')}>{t('archive.sort_name_asc')}</MenuItem>
              <MenuItem onClick={() => handleSortClose('name_desc')}>{t('archive.sort_name_desc')}</MenuItem>
            </Menu>
            {isAdmin && ( 
              <> 
                <Button variant="outlined" size="small" startIcon={<CreateNewFolder />} onClick={handleOpenCreate} sx={{ height: 32 }}>{t('archive.new_folder')}</Button>
                <Button component="label" variant="contained" size="small" startIcon={<CloudUpload />} disabled={uploading} sx={{ height: 32 }}>
                  {t('common.upload')}<input type="file" hidden onChange={handleFile} disabled={uploading} />
                </Button> 
              </> 
            )}
          </Stack>
        </Box>
      </Paper>

      {viewMode === 'grid' ? (
        <Stack direction="row" flexWrap="wrap" gap={2}>
          {currentFolderId && ( <Card variant="outlined" sx={{ width: 150, cursor: 'pointer', bgcolor: '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={handleGoParent}><CardContent sx={{ textAlign: 'center' }}><ArrowBack sx={{ fontSize: 40, color: '#64748b' }} /></CardContent></Card> )}
          {sortedFolders.map(folder => (
            <Card key={folder.id} variant="outlined" sx={{ width: 150, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5', borderColor: '#bdbdbd' }, transition: '0.2s' }} onClick={() => handleEnterFolder(folder)}>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Folder sx={{ fontSize: 40, color: '#ffb74d' }} /><Typography noWrap variant="subtitle2" fontWeight="bold" sx={{ mt: 1 }}>{folder.name}</Typography><Typography variant="caption" color="text.secondary">{t('archive.type_folder')}</Typography>
              </CardContent>
              {isAdmin && (
                <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                   <Tooltip title={t('common.edit')}><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenRename(folder); }}><DriveFileRenameOutline fontSize="small" /></IconButton></Tooltip>
                   <Tooltip title={t('common.delete')}><IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}><Delete fontSize="small" /></IconButton></Tooltip>
                </CardActions>
              )}
            </Card>
          ))}
          {sortedArchives.map(file => (
            <Card key={file.id} variant="outlined" sx={{ width: 150, '&:hover': { bgcolor: '#fafafa' } }}>
              <CardContent sx={{ textAlign: 'center', p: 2 }}>{file.category === 'photo' ? <ImageIcon sx={{ fontSize: 40, color: '#42a5f5' }} /> : <Description sx={{ fontSize: 40, color: '#ef5350' }} />}<Typography noWrap variant="subtitle2" sx={{ mt: 1 }} title={file.file_name}>{file.file_name}</Typography></CardContent>
              <CardActions sx={{ justifyContent: 'center', pt: 0 }}><IconButton size="small" href={file.file_url} target="_blank"><Download fontSize="small"/></IconButton>{isAdmin && <IconButton size="small" color="error" onClick={() => handleDeleteArchive(file.id)}><Delete fontSize="small"/></IconButton>}</CardActions>
            </Card>
          ))}
        </Stack>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined">
          <Table size="medium">
            <TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow>
                <TableCell width="60" align="center">{currentFolderId && ( <Tooltip title={t('archive.go_parent')}><IconButton size="small" onClick={handleGoParent}><ArrowBack fontSize="small" /></IconButton></Tooltip> )}</TableCell>
                <TableCell>{t('archive.col_name')}</TableCell><TableCell width={120} align="center">{t('archive.col_uploader')}</TableCell><TableCell width={120} align="center">{t('archive.col_date')}</TableCell><TableCell width={120} align="right">{t('archive.col_manage')}</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {sortedFolders.map(folder => (
                <TableRow key={folder.id} hover onClick={() => handleEnterFolder(folder)} sx={{ cursor: 'pointer' }}>
                  <TableCell align="center"><Folder sx={{ color: '#ffb74d' }} /></TableCell>
                  <TableCell component="th" scope="row"><Typography variant="body2" fontWeight="bold">{folder.name}</Typography></TableCell>
                  <TableCell align="center"><Typography variant="caption" color="text.secondary">-</Typography></TableCell>
                  <TableCell align="center"><Typography variant="caption" color="text.secondary">{new Date(folder.created_at).toLocaleDateString()}</Typography></TableCell>
                  <TableCell align="right">
                    {isAdmin && ( <Stack direction="row" justifyContent="flex-end"><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenRename(folder); }}><DriveFileRenameOutline fontSize="small" /></IconButton><IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id) }}><Delete fontSize="small" /></IconButton></Stack> )}
                  </TableCell>
                </TableRow>
              ))}
              {sortedArchives.map(file => (
                <TableRow key={file.id} hover>
                  <TableCell align="center">{file.category === 'photo' ? <ImageIcon fontSize="small" color="primary" /> : <Description fontSize="small" color="error" />}</TableCell>
                  <TableCell component="th" scope="row"><Link href={file.file_url} target="_blank" underline="hover" color="inherit"><Typography variant="body2">{file.file_name}</Typography></Link></TableCell>
                  <TableCell align="center"><Typography variant="caption">{file.profiles?.username}</Typography></TableCell>
                  <TableCell align="center"><Typography variant="caption" color="text.secondary">{new Date(file.created_at).toLocaleDateString()}</Typography></TableCell>
                  <TableCell align="right"><Stack direction="row" justifyContent="flex-end"><IconButton size="small" href={file.file_url} target="_blank"><Download fontSize="small" /></IconButton>{isAdmin && <IconButton size="small" color="error" onClick={() => handleDeleteArchive(file.id)}><Delete fontSize="small" /></IconButton>}</Stack></TableCell>
                </TableRow>
              ))}
              {sortedFolders.length === 0 && sortedArchives.length === 0 && ( <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><Typography color="text.secondary">{t('archive.empty')}</Typography></TableCell></TableRow> )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* 생성 모달 */}
      <Dialog open={openFolder} onClose={() => setOpenFolder(false)}>
        <DialogTitle>{t('archive.create_folder_title')}</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label={t('archive.input_folder_name')} fullWidth variant="standard" value={folderNameInput} onChange={e => setFolderNameInput(e.target.value)} /></DialogContent>
        <DialogActions><Button onClick={() => setOpenFolder(false)}>{t('common.cancel')}</Button><Button onClick={handleCreateFolder} variant="contained">{t('common.create')}</Button></DialogActions>
      </Dialog>

      {/* 수정 모달 */}
      <Dialog open={openRename} onClose={() => setOpenRename(false)}>
        <DialogTitle>{t('archive.rename_title')}</DialogTitle>
        <DialogContent><TextField autoFocus margin="dense" label={t('archive.input_new_name')} fullWidth variant="standard" value={folderNameInput} onChange={e => setFolderNameInput(e.target.value)} /></DialogContent>
        <DialogActions><Button onClick={() => setOpenRename(false)}>{t('common.cancel')}</Button><Button onClick={handleRenameFolder} variant="contained">{t('common.save')}</Button></DialogActions>
      </Dialog>
    </Box>
  )
}