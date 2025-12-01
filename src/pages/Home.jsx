import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { 
  Typography, Button, Box, Card, CardContent, CardActions, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, 
  Paper, InputBase, Container, Fade, Avatar, Stack
} from '@mui/material'
import { Add, Delete, Search, ArrowForward, EmojiEvents, Groups } from '@mui/icons-material'

export default function Home({ session }) {
  const [myClubs, setMyClubs] = useState([])
  const [searchQuery, setSearchQuery] = useState('') 
  const [open, setOpen] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (session?.user?.id) fetchClubs()
  }, [session])

  const fetchClubs = async () => {
    const { data: mems } = await supabase.from('club_members').select('*, clubs(*)').eq('user_id', session.user.id)
    if (mems) setMyClubs(mems)
  }

  const createClub = async () => {
    if (!newClubName) return
    const { data } = await supabase.from('clubs').insert([{ name: newClubName }]).select()
    await supabase.from('club_members').insert([{ user_id: session.user.id, club_id: data[0].id, role: 'manager', status: 'approved' }])
    setOpen(false); setNewClubName(''); fetchClubs()
  }

  const handleDeleteClub = async (e, clubId, clubName) => {
    e.stopPropagation() // 카드 클릭 이벤트 방지
    if (!confirm(`'${clubName}'을(를) 정말 삭제하시겠습니까?`)) return
    const { error } = await supabase.from('clubs').delete().eq('id', clubId)
    if (error) alert('실패: ' + error.message); else { alert('삭제되었습니다.'); fetchClubs() }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    navigate(`/explore?q=${encodeURIComponent(searchQuery)}`)
  }

  // 역할에 따른 배지 스타일
  const getRoleBadge = (status, role) => {
    if (status === 'pending') return { label: '승인 대기', color: '#f59e0b', bg: '#fffbeb' } // Amber
    if (role === 'manager') return { label: '👑 관리자', color: '#dc2626', bg: '#fef2f2' } // Red
    if (role === 'staff') return { label: '🛡 운영진', color: '#2563eb', bg: '#eff6ff' } // Blue
    return { label: '멤버', color: '#059669', bg: '#ecfdf5' } // Green
  }

  // 문자열 -> 색상 변환 (프로필 아바타용)
  const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) { hash = string.charCodeAt(i) + ((hash << 5) - hash); }
    let color = '#';
    for (let i = 0; i < 3; i += 1) { const value = (hash >> (i * 8)) & 0xff; color += `00${value.toString(16)}`.slice(-2); }
    return color;
  }

  return (
    <Layout>
      {/* Hero Section */}
      <Box sx={{ 
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(120deg, #1e3a8a 0%, #3b82f6 50%, #8b5cf6 100%)', // Deep Blue -> Purple
        color: 'white', 
        pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 14 },
        mb: 8, borderRadius: '0 0 50px 50px', 
        mt: -4, mx: -3, px: 3,
        textAlign: 'center',
        boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.5)'
      }}>
        {/* 배경 장식 원 (데코레이션) */}
        <Box sx={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)', filter: 'blur(50px)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, right: -50, width: 200, height: 200, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)', filter: 'blur(40px)' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" fontWeight="900" sx={{ mb: 2, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            흩어진 동아리 업무, 이젠 한 곳에서 <br/><br/><br/>
          </Typography>
          <Typography variant="h6" sx={{ mb: 6, opacity: 0.9, fontWeight: 300, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            대학 생활의 모든 즐거움이 시작되는 곳,<br/>Cluby에서 당신의 동아리를 찾아보세요.
          </Typography>

          {/* 검색창 */}
          <Paper
            component="form"
            onSubmit={handleSearchSubmit}
            elevation={8}
            sx={{ 
              display: 'flex', alignItems: 'center', 
              width: { xs: '100%', sm: 600 }, height: 68, 
              borderRadius: '34px', mx: 'auto', p: '8px',
              transition: '0.3s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }
            }}
          >
            <Box sx={{ pl: 2, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
              <Search />
            </Box>
            <InputBase 
              sx={{ ml: 2, flex: 1, fontSize: '1.1rem' }} 
              placeholder="관심 있는 분야나 동아리를 검색해보세요" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
            <Button 
              type="submit"
              variant="contained" 
              sx={{ 
                borderRadius: '26px', height: 52, px: 4, 
                fontSize: '1rem', fontWeight: 'bold',
                bgcolor: '#1e40af', '&:hover': { bgcolor: '#172554' },
                boxShadow: 'none'
              }}
            >
              검색
            </Button>
          </Paper>

          {/* 동아리 생성 텍스트 버튼 */}
          <Button 
            onClick={() => setOpen(true)}
            startIcon={<Add />}
            sx={{ 
              mt: 4, color: 'white', opacity: 0.8, 
              '&:hover': { opacity: 1, bgcolor: 'rgba(255,255,255,0.1)' },
              borderRadius: 2, px: 2, py: 1
            }}
          >
            아직 동아리가 없나요? 새로운 동아리 만들기
          </Button>
        </Container>
      </Box>

      {/* My Clubs Section */}
      <Container maxWidth="lg" sx={{ mb: 10 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, borderBottom: '2px solid #f1f5f9', pb: 2 }}>
          <Typography variant="h5" fontWeight="800" color="#1e293b">
            내 활동 동아리
          </Typography>
          <Chip 
            label={myClubs.length} 
            size="small" 
            sx={{ ml: 2, fontWeight: 'bold', bgcolor: '#e2e8f0', color: '#475569' }} 
          />
        </Box>
        
        {myClubs.length === 0 ? (
          <Paper 
            elevation={0}
            sx={{ 
              p: 8, textAlign: 'center', borderRadius: 4, 
              border: '2px dashed #cbd5e1', bgcolor: '#f8fafc' 
            }}
          >
            <Groups sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" fontWeight="bold">아직 가입한 동아리가 없습니다.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>위 검색창을 통해 마음에 드는 동아리를 찾아보세요!</Typography>
          </Paper>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {myClubs.map(item => {
              const badge = getRoleBadge(item.status, item.role)
              return (
                <Fade in={true} timeout={500} key={item.id}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      height: '100%', borderRadius: 4,
                      border: '1px solid #e2e8f0',
                      display: 'flex', flexDirection: 'column',
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        transform: 'translateY(-8px)', 
                        boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
                        borderColor: 'transparent'
                      }
                    }}
                  >
                    <CardContent sx={{ p: 3, flexGrow: 1 }}>
                      {/* 상단: 아바타 & 삭제버튼 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Avatar 
                          sx={{ 
                            bgcolor: stringToColor(item.clubs?.name || ''), 
                            width: 56, height: 56, 
                            fontSize: '1.5rem', fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        >
                          {item.clubs?.name?.[0]}
                        </Avatar>
                        
                        {/* 관리자일 경우 삭제 버튼 (작고 흐리게) */}
                        {item.role === 'manager' && (
                          <IconButton 
                            size="small" 
                            onClick={(e) => handleDeleteClub(e, item.club_id, item.clubs?.name)}
                            sx={{ color: '#cbd5e1', '&:hover': { color: '#ef4444', bgcolor: '#fee2e2' } }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>

                      {/* 타이틀 & 배지 */}
                      <Typography variant="h6" fontWeight="bold" noWrap sx={{ mb: 1, fontSize: '1.1rem' }}>
                        {item.clubs?.name}
                      </Typography>
                      
                      <Chip 
                        label={badge.label} 
                        size="small" 
                        sx={{ 
                          bgcolor: badge.bg, color: badge.color, 
                          fontWeight: 'bold', borderRadius: 1.5,
                          border: `1px solid ${badge.color}20` 
                        }} 
                      />
                    </CardContent>

                    <CardActions sx={{ p: 3, pt: 0 }}>
                      <Button 
                        fullWidth 
                        variant={item.status === 'approved' ? "contained" : "outlined"}
                        color="primary"
                        disabled={item.status !== 'approved'}
                        onClick={() => navigate(`/club/${item.club_id}`)}
                        endIcon={item.status === 'approved' && <ArrowForward />}
                        sx={{ 
                          py: 1.2, borderRadius: 2, 
                          boxShadow: 'none', 
                          fontWeight: 'bold',
                          textTransform: 'none'
                        }}
                      >
                        {item.status === 'approved' ? '동아리 입장' : '승인 대기 중'}
                      </Button>
                    </CardActions>
                  </Card>
                </Fade>
              )
            })}
          </Box>
        )}
      </Container>

      {/* 동아리 생성 Modal */}
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)} 
        PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 450 } }}
      >
        <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold', pt: 4, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: '50%', color: '#3b82f6' }}>
              <Add fontSize="large" />
            </Box>
          </Box>
          동아리 생성
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            새로운 커뮤니티를 시작해보세요!<br/>멋진 동아리 이름을 지어주세요.
          </Typography>
          <TextField 
            autoFocus 
            fullWidth 
            placeholder="예: 코딩 스터디, 맛집 탐방대"
            value={newClubName} 
            onChange={e => setNewClubName(e.target.value)} 
            sx={{ 
              '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f8fafc' } 
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, justifyContent: 'stretch', gap: 1 }}>
          <Button onClick={() => setOpen(false)} size="large" fullWidth sx={{ color: 'text.secondary', borderRadius: 2, bgcolor: '#f1f5f9' }}>취소</Button>
          <Button onClick={createClub} variant="contained" size="large" fullWidth sx={{ borderRadius: 2, boxShadow: 'none' }}>생성하기</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}