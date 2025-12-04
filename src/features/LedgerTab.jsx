import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Paper, Box, Typography, TextField, Select, MenuItem, Button, 
  IconButton, Divider, Stack, Chip, ToggleButton, ToggleButtonGroup
} from '@mui/material'
import { Delete, Add, Settings, CurrencyExchange } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function LedgerTab({ clubId, isAdmin }) { // [수정] isAdmin prop 필요
  const { t } = useTranslation()
  const [ledgers, setLedgers] = useState([])
  const [currency, setCurrency] = useState('KRW') // [NEW] 화폐 단위 (KRW | JPY)
  
  const [data, setData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    desc: '', 
    type: 'expense', 
    amount: '' 
  })

  useEffect(() => { 
    if (clubId) {
      fetchClubCurrency() // [NEW] 클럽 설정 불러오기
      fetchLedgers() 
    }
  }, [clubId])

  // [NEW] 클럽의 화폐 단위 가져오기
  const fetchClubCurrency = async () => {
    const { data } = await supabase.from('clubs').select('currency').eq('id', clubId).single()
    if (data && data.currency) setCurrency(data.currency)
  }

  // [NEW] 화폐 단위 변경 (관리자 전용)
  const handleCurrencyChange = async (e, newCurrency) => {
    if (!newCurrency) return
    setCurrency(newCurrency)
    
    // DB에 저장 (clubs 테이블에 currency 컬럼이 있어야 함)
    const { error } = await supabase.from('clubs').update({ currency: newCurrency }).eq('id', clubId)
    if (error) alert('Error: ' + error.message)
  }

  const fetchLedgers = async () => {
    const { data } = await supabase.from('ledgers').select('*').eq('club_id', clubId).order('date', {ascending: false}).order('created_at', {ascending: false})
    if (data) setLedgers(data)
  }

  const handleAdd = async () => {
    if (!data.desc || !data.amount) return alert(t('ledger.alert_input_all')) // [수정]
    const { error } = await supabase.from('ledgers').insert([{ 
      club_id: clubId, date: data.date, description: data.desc, type: data.type, amount: parseInt(data.amount) 
    }])
    if (error) alert('Error: ' + error.message)
    else {
      alert(t('ledger.msg_recorded')) // [수정]
      setData({ ...data, desc: '', amount: '' })
      fetchLedgers()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirm_delete'))) return
    await supabase.from('ledgers').delete().eq('id', id)
    fetchLedgers()
  }

  const income = ledgers.filter(l => l.type === 'income').reduce((acc, cur) => acc + cur.amount, 0)
  const expense = ledgers.filter(l => l.type === 'expense').reduce((acc, cur) => acc + cur.amount, 0)
  const balance = income - expense

  // [NEW] 화폐 단위 심볼 및 포맷터
  const currencySymbol = currency === 'KRW' ? '원' : '円';
  const formatMoney = (amount) => amount.toLocaleString();

  return (
    <Box>
      {/* 1. 요약 대시보드 */}
      <Paper elevation={0} variant="outlined" sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: '#fff', borderColor: '#e2e8f0', position: 'relative' }}>
        
        {/* [NEW] 관리자 전용 화폐 단위 설정 버튼 (우측 상단) */}
        {isAdmin && (
          <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
            <ToggleButtonGroup
              value={currency}
              exclusive
              onChange={handleCurrencyChange}
              size="small"
              sx={{ height: 24 }}
            >
              <ToggleButton value="KRW" sx={{ fontSize: '0.7rem', px: 1 }}>KRW (원)</ToggleButton>
              <ToggleButton value="JPY" sx={{ fontSize: '0.7rem', px: 1 }}>JPY (円)</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-around" alignItems="center">
          
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>{t('ledger.total_income')}</Typography> {/* [수정] */}
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#10B981' }}>+{formatMoney(income)}</Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider flexItem sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>{t('ledger.total_expense')}</Typography> {/* [수정] */}
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#EF4444' }}>-{formatMoney(expense)}</Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider flexItem sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>{t('ledger.current_balance')}</Typography> {/* [수정] */}
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
              {formatMoney(balance)}
              <span style={{ fontSize: '1rem', fontWeight: '500', color: '#94a3b8', marginLeft: 4 }}>{currencySymbol}</span>
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 2. 입력 폼 */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
          <Add fontSize="small" color="primary" /> {t('ledger.record_new')} {/* [수정] */}
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <TextField 
            type="date" size="small" 
            value={data.date} onChange={e => setData({ ...data, date: e.target.value })} 
            sx={{ width: { xs: '100%', md: 160 }, bgcolor: 'white' }} 
          />
          <Select 
            size="small" 
            value={data.type} onChange={e => setData({ ...data, type: e.target.value })} 
            sx={{ width: { xs: '100%', md: 120 }, bgcolor: 'white' }}
          >
            <MenuItem value="expense" sx={{ color: '#EF4444', fontWeight:'bold' }}>{t('ledger.type_expense')}</MenuItem> {/* [수정] */}
            <MenuItem value="income" sx={{ color: '#10B981', fontWeight:'bold' }}>{t('ledger.type_income')}</MenuItem> {/* [수정] */}
          </Select>
          <TextField 
            placeholder={t('ledger.placeholder_desc')} size="small" fullWidth  // [수정]
            value={data.desc} onChange={e => setData({ ...data, desc: e.target.value })} 
            sx={{ bgcolor: 'white' }}
          />
          <TextField 
            placeholder={t('ledger.placeholder_amount')} type="number" size="small" // [수정]
            value={data.amount} onChange={e => setData({ ...data, amount: e.target.value })} 
            sx={{ width: { xs: '100%', md: 180 }, bgcolor: 'white' }} 
            InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">{currencySymbol}</Typography> }} // [수정]
          />
          <Button 
            variant="contained" onClick={handleAdd} disableElevation 
            sx={{ minWidth: 90, height: 40, fontWeight: 'bold', bgcolor: '#334155', '&:hover': { bgcolor: '#1e293b' } }}
          >
            {t('common.create')} {/* [수정] */}
          </Button>
        </Stack>
      </Paper>

      {/* 3. 내역 리스트 */}
      <Stack spacing={1.5}>
        {ledgers.map((l) => (
          <Paper 
            key={l.id} 
            elevation={0} 
            variant="outlined"
            sx={{ 
              p: 2, px: 3, borderRadius: 2, 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              transition: 'all 0.2s',
              '&:hover': { borderColor: '#94a3b8', bgcolor: '#fbfcfd' }
            }}
          >
            {/* 좌측: 날짜 & 정보 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* 날짜 */}
              <Box sx={{ textAlign: 'center', minWidth: 50 }}>
                <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">
                  {l.date.split('-')[1]}
                </Typography>
                <Typography variant="h6" display="block" fontWeight="bold" lineHeight={1} color="#475569">
                  {l.date.split('-')[2]}
                </Typography>
              </Box>
              
              <Divider orientation="vertical" flexItem sx={{ height: 24, alignSelf: 'center', bgcolor:'#e2e8f0' }} />

              {/* 내용 */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip 
                    label={l.type === 'income' ? t('ledger.chip_income') : t('ledger.chip_expense')} // [수정]
                    size="small" 
                    sx={{ 
                      height: 22, fontSize: '0.75rem', fontWeight: '800',
                      bgcolor: l.type === 'income' ? '#ecfdf5' : '#fef2f2',
                      color: l.type === 'income' ? '#059669' : '#dc2626',
                      border: '1px solid',
                      borderColor: l.type === 'income' ? '#a7f3d0' : '#fecaca'
                    }} 
                  />
                  <Typography variant="body1" fontWeight="600" sx={{ color: '#1e293b' }}>
                    {l.description}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            {/* 우측: 금액 & 삭제 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Typography 
                variant="subtitle1" 
                fontWeight="bold"
                sx={{ 
                  color: l.type === 'income' ? '#10B981' : '#EF4444',
                  fontSize: '1.1rem',
                  letterSpacing: '-0.5px'
                }}
              >
                {l.type === 'income' ? '+' : '-'}{formatMoney(l.amount)}
              </Typography>
              <IconButton size="small" onClick={() => handleDelete(l.id)} sx={{ color: '#e2e8f0', '&:hover': { color: '#ef4444' } }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
        
        {ledgers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #e2e8f0' }}>
            <Typography>{t('ledger.no_records')}</Typography> {/* [수정] */}
          </Box>
        )}
      </Stack>
    </Box>
  )
}