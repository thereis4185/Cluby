import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
// [수정] Tooltip 추가됨
import { 
  Box, Typography, Paper, InputBase, IconButton, Button, Divider, 
  Avatar, Chip, CircularProgress, Stack, Fade, Tooltip 
} from '@mui/material'
import { Search, Verified, Visibility, ArrowForward, EmojiEvents } from '@mui/icons-material'

export default function Explore({ session }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initialQuery = searchParams.get('q') || ''
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [clubs, setClubs] = useState([])
  const [myClubIds, setMyClubIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '')
  }, [searchParams])

  const fetchData = async () => {
    setLoading(true)
    const { data: allClubs } = await supabase.from('clubs').select('*').order('created_at', {ascending: false})
    
    if (session?.user?.id) {
      const { data: myMemberships } = await supabase.from('club_members').select('club_id').eq('user_id', session.user.id)
      const ids = myMemberships?.map(m => m.club_id) || []
      setMyClubIds(ids)
    }
    
    if (allClubs) setClubs(allClubs)
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchParams({ q: searchQuery })
  }

  const filteredClubs = clubs.filter(c => {
    const query = (searchParams.get('q') || '').toLowerCase()
    return c.name.toLowerCase().includes(query) || (c.intro_title && c.intro_title.toLowerCase().includes(query))
  })

  const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) { hash = string.charCodeAt(i) + ((hash << 5) - hash); }
    let color = '#';
    for (let i = 0; i < 3; i += 1) { const value = (hash >> (i * 8)) & 0xff; color += `00${value.toString(16)}`.slice(-2); }
    return color;
  }

  return (
    <Layout>
      <Box sx={{ maxWidth: 1000, mx: 'auto', py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h4" fontWeight="900" gutterBottom sx={{ color: '#1e293b' }}>
            🔍 동아리 탐색
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            새로운 관심사를 찾아보세요! 키워드로 검색할 수 있습니다.
          </Typography>

          <Paper
            component="form"
            elevation={3}
            sx={{ 
              p: '4px', display: 'flex', alignItems: 'center', 
              width: { xs: '100%', sm: 600 }, height: 64, borderRadius: '32px',
              mx: 'auto', border: '1px solid #e2e8f0'
            }}
            onSubmit={handleSearch}
          >
            <IconButton sx={{ p: '10px', ml: 1 }}><Search /></IconButton>
            <InputBase
              sx={{ ml: 1, flex: 1, fontSize: '1.1rem' }}
              placeholder="동아리 이름, 태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit" 
              variant="contained" 
              sx={{ 
                borderRadius: '30px', height: 56, px: 4, mr: '2px', fontSize: '1rem', fontWeight: 'bold',
                bgcolor: '#4F46E5', color: 'white', boxShadow: 'none',
                '&:hover': { bgcolor: '#3730a3' }
              }}
            >
              검색
            </Button>
          </Paper>
        </Box>

        <Divider textAlign="left" sx={{ mb: 4 }}>
          <Chip label={`검색 결과 ${filteredClubs.length}건`} sx={{ fontWeight: 'bold', bgcolor: '#f1f5f9' }} />
        </Divider>

        {loading ? (
          <Box sx={{ textAlign: 'center', mt: 10 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
            
            {filteredClubs.length === 0 && (
              <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 10 }}>
                <EmojiEvents sx={{ fontSize: 60, color: '#e2e8f0', mb: 2 }} />
                <Typography color="text.secondary" fontSize="1.1rem">검색 결과가 없습니다.<br/>다른 키워드로 검색해보세요!</Typography>
              </Box>
            )}

            {filteredClubs.map(club => {
              const isJoined = myClubIds.includes(club.id)
              return (
                <Fade in={true} key={club.id}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3, border: '1px solid #e2e8f0', borderRadius: 4, 
                      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      transition: '0.3s', height: '100%',
                      '&:hover': { borderColor: 'primary.main', transform: 'translateY(-5px)', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }
                    }}
                  >
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Avatar 
                          src={club.icon_url}
                          sx={{ 
                            bgcolor: stringToColor(club.name), width: 56, height: 56, 
                            fontSize: '1.5rem', fontWeight: 'bold', borderRadius: 3,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        >
                          {club.name[0]}
                        </Avatar>
                        {club.is_official && <Tooltip title="공식 인증"><Verified color="primary" /></Tooltip>}
                      </Box>

                      <Typography variant="h6" fontWeight="bold" sx={{ mb: 1 }}>
                        {club.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        mb: 3, minHeight: '40px', 
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' 
                      }}>
                        {club.short_intro || club.intro_title || '아직 소개글이 없습니다.'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ mt: 'auto' }}>
                      {isJoined ? (
                        <Button 
                          fullWidth
                          variant="outlined" 
                          color="inherit" 
                          endIcon={<ArrowForward />}
                          onClick={() => navigate(`/club/${club.id}`)}
                          sx={{ borderRadius: 3, py: 1, borderColor: '#e2e8f0' }}
                        >
                          입장하기
                        </Button>
                      ) : (
                        <Button 
                          fullWidth
                          variant="contained" 
                          startIcon={<Visibility />} 
                          onClick={() => navigate(`/club/${club.id}`)}
                          sx={{ borderRadius: 3, py: 1, fontWeight: 'bold', boxShadow: 'none' }}
                        >
                          둘러보기
                        </Button>
                      )}
                    </Box>
                  </Paper>
                </Fade>
              )
            })}
          </Box>
        )}
      </Box>
    </Layout>
  )
}