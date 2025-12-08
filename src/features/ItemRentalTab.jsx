import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Button, Card, CardContent, CardActions, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Stack, Skeleton, IconButton, Avatar, CardMedia, Fade 
} from '@mui/material'
import { 
  Add, CheckCircle, AccessTime, BrokenImage, 
  Inventory2, Delete, CloudUpload, Close 
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function ItemRentalTab({ clubId, currentUserId, isAdmin }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 모달 & 입력 State
  const [openAdd, setOpenAdd] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [imageFile, setImageFile] = useState(null) // [NEW] 이미지 파일
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [clubId])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const { data: itemsData, error: itemError } = await supabase.from('rental_items').select('*').eq('club_id', clubId).order('name')
      if (itemError) throw itemError

      const { data: activeRentals, error: rentError } = await supabase.from('rental_records').select('item_id, user_id, rented_at, profiles(full_name, username, avatar_url)').eq('club_id', clubId).is('returned_at', null)
      if (rentError) throw rentError

      const mergedItems = itemsData.map(item => {
        const rentalInfo = activeRentals.find(r => r.item_id === item.id)
        return { ...item, isRented: !!rentalInfo, rentalInfo: rentalInfo || null }
      })
      setItems(mergedItems)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  // --- 핸들러 ---

  // [NEW] 파일 선택 핸들러
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
    }
  }

  // [수정] 물품 추가 (이미지 업로드 포함)
  const handleAddItem = async () => {
    if (!newItemName.trim()) return alert(t('rental.alert_name'))
    
    setUploading(true)
    let publicUrl = null

    try {
      // 1. 이미지 업로드 (있을 경우)
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop()
        const filePath = `rental_items/${clubId}/${Date.now()}.${fileExt}`
        
        const { error: upErr } = await supabase.storage.from('club_files').upload(filePath, imageFile)
        if (upErr) throw upErr
        
        const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
        publicUrl = data.publicUrl
      }

      // 2. DB 저장
      const { error } = await supabase.from('rental_items').insert([{
        club_id: clubId, 
        name: newItemName, 
        description: newItemDesc,
        image_url: publicUrl // 이미지 URL 저장
      }])

      if (error) throw error
      
      setOpenAdd(false); setNewItemName(''); setNewItemDesc(''); setImageFile(null); 
      fetchItems()

    } catch (error) {
      alert('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm(t('common.confirm_delete'))) return
    const { error } = await supabase.from('rental_items').delete().eq('id', itemId)
    if (!error) fetchItems()
  }

  const handleRent = async (itemId) => {
    if (!confirm(t('rental.confirm_rent'))) return
    const { error } = await supabase.from('rental_records').insert([{ club_id: clubId, item_id: itemId, user_id: currentUserId }])
    if (error) alert('Error: ' + error.message); else fetchItems()
  }

  const handleReturn = async (itemId) => {
    if (!confirm(t('rental.confirm_return'))) return
    const { error } = await supabase.from('rental_records').update({ returned_at: new Date().toISOString() }).eq('item_id', itemId).is('returned_at', null)
    if (error) alert('Error: ' + error.message); else fetchItems()
  }

  // 다이얼로그 닫을 때 초기화
  const handleCloseDialog = () => {
    setOpenAdd(false); setNewItemName(''); setNewItemDesc(''); setImageFile(null);
  }

  return (
    <Box sx={{ minHeight: '60vh', position: 'relative' }}>
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 color="primary" /> {t('rental.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">{t('rental.desc')}</Typography>
        </Box>
        {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)} sx={{ borderRadius: 2 }}>{t('rental.btn_add')}</Button>}
      </Box>

      {loading ? (
        <Stack spacing={2}>{[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 3 }} />)}</Stack>
      ) : items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10, bgcolor: '#f8fafc', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
          <Inventory2 sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
          <Typography color="text.secondary">{t('rental.no_items')}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
          {items.map((item) => {
            const isMyRental = item.rentalInfo?.user_id === currentUserId
            
            return (
              <Fade in key={item.id}>
                <Card 
                  elevation={0} 
                  sx={{ 
                    borderRadius: 4, border: '1px solid', 
                    borderColor: item.isRented ? (isMyRental ? '#bfdbfe' : '#fed7aa') : '#e2e8f0',
                    bgcolor: 'white', overflow: 'hidden',
                    transition: '0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }
                  }}
                >
                  {/* [NEW] 이미지 영역 */}
                  <Box sx={{ position: 'relative', height: 160, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {item.image_url ? (
                      <CardMedia component="img" image={item.image_url} alt={item.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Inventory2 sx={{ fontSize: 60, color: '#cbd5e1' }} />
                    )}
                    
                    {/* 상태 칩 (이미지 위에 오버레이) */}
                    <Chip 
                      label={item.is_broken ? t('rental.status_broken') : (item.isRented ? t('rental.status_rented') : t('rental.status_avail'))} 
                      size="small" 
                      icon={item.is_broken ? <BrokenImage sx={{fontSize:14}}/> : (item.isRented ? <AccessTime sx={{fontSize:14}}/> : <CheckCircle sx={{fontSize:14}}/>)}
                      color={item.is_broken ? 'error' : (item.isRented ? 'warning' : 'success')} 
                      sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 'bold', boxShadow: 1 }} 
                    />
                  </Box>

                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="start">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20, fontSize: '0.9rem' }}>
                          {item.description || '-'}
                        </Typography>
                      </Box>
                      {isAdmin && (
                        <IconButton size="small" onClick={() => handleDeleteItem(item.id)} sx={{ mt: -0.5, mr: -1, color: '#94a3b8' }}><Delete fontSize="small" /></IconButton>
                      )}
                    </Stack>

                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                      {item.isRented ? (
                        <Stack direction="row" alignItems="center" spacing={1.5}>
                          <Avatar src={item.rentalInfo?.profiles?.avatar_url} sx={{ width: 32, height: 32 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" display="block" color="text.secondary">{t('rental.rented_by')}</Typography>
                            <Typography variant="body2" fontWeight="600">
                              {isMyRental ? t('rental.me') : (item.rentalInfo?.profiles?.full_name || t('chat.unknown_user'))}
                            </Typography>
                          </Box>
                          {(isMyRental || isAdmin) && (
                            <Button size="small" variant="contained" color="primary" onClick={() => handleReturn(item.id)} sx={{ borderRadius: 2, boxShadow: 'none' }}>
                              {t('rental.btn_return')}
                            </Button>
                          )}
                        </Stack>
                      ) : (
                        <Button fullWidth variant="outlined" color="inherit" onClick={() => handleRent(item.id)} disabled={item.is_broken} sx={{ borderRadius: 2, borderColor: '#e2e8f0', color: '#64748b' }}>
                          {item.is_broken ? t('rental.status_broken') : t('rental.btn_rent')}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            )
          })}
        </Box>
      )}

      {/* 물품 추가 모달 */}
      <Dialog open={openAdd} onClose={handleCloseDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>{t('rental.modal_add_title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* [NEW] 이미지 업로드 입력 */}
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 1 }}>
                {imageFile ? (
                    <Box sx={{ position: 'relative', width: '100%', height: 150, borderRadius: 2, overflow: 'hidden' }}>
                        <img src={URL.createObjectURL(imageFile)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <IconButton size="small" onClick={() => setImageFile(null)} sx={{ position: 'absolute', top: 5, right: 5, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover':{bgcolor:'rgba(0,0,0,0.7)'} }}><Close /></IconButton>
                    </Box>
                ) : (
                    <Button component="label" variant="outlined" fullWidth sx={{ height: 100, borderStyle: 'dashed', color: 'text.secondary', borderColor: '#cbd5e1' }} startIcon={<CloudUpload />}>
                        {t('rental.upload_photo')}
                        <input type="file" hidden accept="image/*" onChange={handleFileChange} />
                    </Button>
                )}
            </Box>

            <TextField autoFocus label={t('rental.label_name')} fullWidth variant="outlined" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
            <TextField label={t('rental.label_desc')} fullWidth multiline rows={2} variant="outlined" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">{t('common.cancel')}</Button>
          <Button onClick={handleAddItem} variant="contained" disabled={uploading}>
            {uploading ? t('common.loading') : t('common.create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}