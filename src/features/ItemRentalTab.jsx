import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Button, Card, CardContent, CardActions, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Stack, Skeleton, IconButton, Avatar, Tooltip, Fab
} from '@mui/material'
import { 
  Add, Build, CheckCircle, AccessTime, BrokenImage, 
  Inventory2, Delete, Person
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function ItemRentalTab({ clubId, currentUserId, isAdmin }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([]) // 물품 + 현재 대여 상태 합친 데이터
  const [loading, setLoading] = useState(true)
  
  // 모달 State
  const [openAdd, setOpenAdd] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')

  useEffect(() => {
    fetchItems()
  }, [clubId])

  const fetchItems = async () => {
    setLoading(true)
    try {
      // 1. 물품 목록 가져오기
      const { data: itemsData, error: itemError } = await supabase
        .from('rental_items')
        .select('*')
        .eq('club_id', clubId)
        .order('name')
      
      if (itemError) throw itemError

      // 2. 현재 대여중인(반납 안 된) 기록 가져오기
      const { data: activeRentals, error: rentError } = await supabase
        .from('rental_records')
        .select('item_id, user_id, rented_at, profiles(full_name, username, avatar_url)')
        .eq('club_id', clubId)
        .is('returned_at', null) // 반납 안 된 것만

      if (rentError) throw rentError

      // 3. 데이터 병합 (물품 + 대여 정보)
      const mergedItems = itemsData.map(item => {
        const rentalInfo = activeRentals.find(r => r.item_id === item.id)
        return {
          ...item,
          isRented: !!rentalInfo,
          rentalInfo: rentalInfo || null // 빌려간 사람 정보
        }
      })

      setItems(mergedItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // --- 핸들러 ---

  // 물품 추가
  const handleAddItem = async () => {
    if (!newItemName.trim()) return alert(t('rental.alert_name'))
    const { error } = await supabase.from('rental_items').insert([{
      club_id: clubId, name: newItemName, description: newItemDesc
    }])
    if (error) alert('Error: ' + error.message)
    else {
      setOpenAdd(false); setNewItemName(''); setNewItemDesc(''); fetchItems()
    }
  }

  // 물품 삭제
  const handleDeleteItem = async (itemId) => {
    if (!confirm(t('common.confirm_delete'))) return
    const { error } = await supabase.from('rental_items').delete().eq('id', itemId)
    if (!error) fetchItems()
  }

  // 대여하기
  const handleRent = async (itemId) => {
    if (!confirm(t('rental.confirm_rent'))) return
    const { error } = await supabase.from('rental_records').insert([{
      club_id: clubId, item_id: itemId, user_id: currentUserId
    }])
    if (error) alert('Error: ' + error.message)
    else fetchItems()
  }

  // 반납하기
  const handleReturn = async (itemId) => {
    if (!confirm(t('rental.confirm_return'))) return
    // 해당 아이템의 '반납 안 된' 기록을 찾아서 반납 처리
    const { error } = await supabase
      .from('rental_records')
      .update({ returned_at: new Date().toISOString() })
      .eq('item_id', itemId)
      .is('returned_at', null)
    
    if (error) alert('Error: ' + error.message)
    else fetchItems()
  }

  return (
    <Box sx={{ minHeight: '60vh', position: 'relative' }}>
      
      {/* 헤더 및 설명 */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Inventory2 color="primary" /> {t('rental.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('rental.desc')}
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAdd(true)} sx={{ borderRadius: 2 }}>
            {t('rental.btn_add')}
          </Button>
        )}
      </Box>

      {/* 물품 리스트 */}
      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map(i => <Skeleton key={i} variant="rectangular" height={80} sx={{ borderRadius: 3 }} />)}
        </Stack>
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
              <Card 
                key={item.id} 
                elevation={0} 
                sx={{ 
                  borderRadius: 4, border: '1px solid', 
                  borderColor: item.isRented ? (isMyRental ? '#bfdbfe' : '#fed7aa') : '#e2e8f0',
                  bgcolor: item.isRented ? (isMyRental ? '#eff6ff' : '#fff7ed') : 'white',
                  transition: '0.2s', '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Chip 
                      label={item.is_broken ? t('rental.status_broken') : (item.isRented ? t('rental.status_rented') : t('rental.status_avail'))} 
                      size="small" 
                      icon={item.is_broken ? <BrokenImage sx={{fontSize:14}}/> : (item.isRented ? <AccessTime sx={{fontSize:14}}/> : <CheckCircle sx={{fontSize:14}}/>)}
                      color={item.is_broken ? 'error' : (item.isRented ? 'warning' : 'success')} 
                      sx={{ fontWeight: 'bold' }} 
                    />
                    {isAdmin && (
                      <IconButton size="small" onClick={() => handleDeleteItem(item.id)} sx={{ mt: -0.5, mr: -0.5, color: '#94a3b8' }}>
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>

                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {item.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 20 }}>
                    {item.description || '-'}
                  </Typography>

                  <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px dashed', borderColor: 'divider' }}>
                    {item.isRented ? (
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar src={item.rentalInfo?.profiles?.avatar_url} sx={{ width: 28, height: 28 }} />
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
            )
          })}
        </Box>
      )}

      {/* 물품 추가 모달 */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t('rental.modal_add_title')}</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label={t('rental.label_name')} fullWidth variant="outlined" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
          <TextField margin="dense" label={t('rental.label_desc')} fullWidth variant="outlined" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAdd(false)} color="inherit">{t('common.cancel')}</Button>
          <Button onClick={handleAddItem} variant="contained">{t('common.create')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}