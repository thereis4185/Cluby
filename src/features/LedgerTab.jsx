import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Paper, Box, Typography, TextField, Select, MenuItem, Button, 
  IconButton, Divider, Stack, Chip 
} from '@mui/material'
import { Delete, Add } from '@mui/icons-material'

export default function LedgerTab({ clubId }) {
  const [ledgers, setLedgers] = useState([])
  const [data, setData] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    desc: '', 
    type: 'expense', 
    amount: '' 
  })

  useEffect(() => { fetchLedgers() }, [clubId])

  const fetchLedgers = async () => {
    const { data } = await supabase.from('ledgers').select('*').eq('club_id', clubId).order('date', {ascending: false}).order('created_at', {ascending: false})
    if (data) setLedgers(data)
  }

  const handleAdd = async () => {
    if (!data.desc || !data.amount) return alert('내용과 금액을 입력해주세요.')
    const { error } = await supabase.from('ledgers').insert([{ 
      club_id: clubId, date: data.date, description: data.desc, type: data.type, amount: parseInt(data.amount) 
    }])
    if (error) alert('기록 실패: ' + error.message)
    else {
      alert('기록되었습니다.')
      setData({ ...data, desc: '', amount: '' })
      fetchLedgers()
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('ledgers').delete().eq('id', id)
    fetchLedgers()
  }

  const income = ledgers.filter(l => l.type === 'income').reduce((acc, cur) => acc + cur.amount, 0)
  const expense = ledgers.filter(l => l.type === 'expense').reduce((acc, cur) => acc + cur.amount, 0)
  const balance = income - expense

  return (
    <Box>
      {/* 1. 요약 대시보드 */}
      <Paper elevation={0} variant="outlined" sx={{ p: 4, mb: 4, borderRadius: 3, bgcolor: '#fff', borderColor: '#e2e8f0' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-around" alignItems="center">
          
          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>총 수입</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#10B981' }}>+{income.toLocaleString()}</Typography>
          </Box>
          
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider flexItem sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>총 지출</Typography>
            <Typography variant="h6" fontWeight="bold" sx={{ color: '#EF4444' }}>-{expense.toLocaleString()}</Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Divider flexItem sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />

          <Box sx={{ textAlign: 'center', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" fontWeight="bold" sx={{ mb: 1 }}>현재 잔액</Typography>
            {/* [수정] 폰트 사이즈 h5로 줄이고 굵기 조정 */}
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#1e293b' }}>
              {balance.toLocaleString()}<span style={{ fontSize: '1rem', fontWeight: '500', color: '#94a3b8', marginLeft: 4 }}>원</span>
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* 2. 입력 폼 */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, bgcolor: '#F8FAFC', border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#334155' }}>
          <Add fontSize="small" color="primary" /> 장부 기록하기
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
            <MenuItem value="expense" sx={{ color: '#EF4444', fontWeight:'bold' }}>지출 (-)</MenuItem>
            <MenuItem value="income" sx={{ color: '#10B981', fontWeight:'bold' }}>수입 (+)</MenuItem>
          </Select>
          <TextField 
            placeholder="내용 (예: 정기 회식비)" size="small" fullWidth 
            value={data.desc} onChange={e => setData({ ...data, desc: e.target.value })} 
            sx={{ bgcolor: 'white' }}
          />
          <TextField 
            placeholder="금액" type="number" size="small" 
            value={data.amount} onChange={e => setData({ ...data, amount: e.target.value })} 
            sx={{ width: { xs: '100%', md: 180 }, bgcolor: 'white' }} 
            InputProps={{ endAdornment: <Typography variant="caption" color="text.secondary">원</Typography> }}
          />
          <Button 
            variant="contained" onClick={handleAdd} disableElevation 
            sx={{ minWidth: 90, height: 40, fontWeight: 'bold', bgcolor: '#334155', '&:hover': { bgcolor: '#1e293b' } }}
          >
            추가
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
                  {l.date.split('-')[1]}월
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
                    label={l.type === 'income' ? '수입' : '지출'} 
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
              {/* [수정] 폰트 스타일 변경: 모노스페이스 제거, 볼드체, 사이즈 키움 */}
              <Typography 
                variant="subtitle1" 
                fontWeight="bold"
                sx={{ 
                  color: l.type === 'income' ? '#10B981' : '#EF4444',
                  fontSize: '1.1rem',
                  letterSpacing: '-0.5px'
                }}
              >
                {l.type === 'income' ? '+' : '-'}{l.amount.toLocaleString()}
              </Typography>
              <IconButton size="small" onClick={() => handleDelete(l.id)} sx={{ color: '#e2e8f0', '&:hover': { color: '#ef4444' } }}>
                <Delete fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
        
        {ledgers.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary', bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #e2e8f0' }}>
            <Typography>아직 기록된 장부 내역이 없습니다.</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  )
}