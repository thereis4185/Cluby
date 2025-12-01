import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Auth from './Auth'
import Register from './pages/Register' // 새로 만들 페이지
import Home from './pages/Home'
import ClubDetail from './pages/ClubDetail'
import { Box, CircularProgress } from '@mui/material'
import MyPage from './pages/MyPage'
import Explore from './pages/Explore'
import ChatPage from './pages/ChatPage'

export default function App() {
  const [session, setSession] = useState(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // 1. 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserStatus(session)
    })

    // 2. 로그인/로그아웃 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserStatus(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 사용자 상태 체크 함수
  const checkUserStatus = async (session) => {
    if (!session) {
      setSession(null)
      setLoading(false)
      return
    }

    setSession(session)

    // DB에서 가입 완료 여부 확인
    const { data, error } = await supabase
      .from('profiles')
      .select('is_registered')
      .eq('id', session.user.id)
      .single()

    if (data && data.is_registered) {
      setIsRegistered(true)
    } else {
      setIsRegistered(false)
      // 가입 안 된 상태면 Register 페이지로 리다이렉트 (단, 이미 거기 있으면 제외)
      if (location.pathname !== '/register') {
        navigate('/register')
      }
    }
    setLoading(false)
  }

  // 로딩 중일 때
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // 로그인이 안 되어 있으면 -> 로그인 화면
  if (!session) {
    return <Auth />
  }

  return (
    <Routes>
      {/* 가입 정보 입력 페이지 (로그인은 했으나 정보가 없는 경우) */}
      <Route path="/register" element={<Register session={session} onComplete={() => setIsRegistered(true)} />} />
  
      <Route path="/" element={<Home session={session} />} />
      <Route path="/club/:id" element={<ClubDetail />} />
      <Route path="/mypage" element={<MyPage session={session} />} />
      <Route path="/explore" element={<Explore session={session} />} />
      <Route path="/chat" element={<ChatPage session={session} />} />
      
      {/* 정식 회원만 접근 가능한 페이지들 */}
      {isRegistered ? (
        <>
          <Route path="/" element={<Home session={session} />} />
          <Route path="/club/:id" element={<ClubDetail />} />
        </>
      ) : (
        // 가입 안 된 사람이 억지로 URL 접근하면 Register로 보냄
        <Route path="*" element={<Register session={session} onComplete={() => setIsRegistered(true)} />} />
      )}
    </Routes>
  )
}