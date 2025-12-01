import { useState } from 'react'
import { supabase } from './supabaseClient'
import { 
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider, Tabs, Tab, Stack 
} from '@mui/material'
import { Google, Email, LockOpen } from '@mui/icons-material'

export default function Auth() {
  const [tabIndex, setTabIndex] = useState(0) // 0: 로그인, 1: 회원가입
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  // 탭 변경 시 상태 초기화
  const handleTabChange = (e, newValue) => {
    setTabIndex(newValue)
    setMsg({ type: '', text: '' })
    setEmail('')
    setPassword('')
  }

  // 1. 로그인 처리 (이메일+비번 OR 구글)
  const handleLogin = async (isGoogle = false) => {
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      let result
      if (isGoogle) {
        // 구글 로그인
        result = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
      } else {
        // 이메일+비번 로그인
        if (!email || !password) throw new Error('이메일과 비밀번호를 입력해주세요.')
        result = await supabase.auth.signInWithPassword({ email, password })
      }

      if (result.error) throw result.error
      
      // 로그인 성공 시 App.jsx가 감지하여 자동 이동
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 2. 회원가입 처리 (인증 메일 발송 OR 구글 가입)
  const handleSignup = async (isGoogle = false) => {
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      if (isGoogle) {
        // 구글로 가입 (로그인과 동일 로직)
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
        if (error) throw error
      } else {
        // 이메일 가입 (매직 링크)
        if (!email) throw new Error('인증받을 이메일을 입력해주세요.')

        // [중요] ★ 이메일 중복 체크 (SQL 함수 호출)
        const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', { 
          email_input: email 
        })

        if (rpcError) throw rpcError

        // 이미 존재하는 이메일이면 에러 발생
        if (exists) {
          throw new Error('이미 가입된 이메일입니다. [로그인] 탭을 이용해주세요.')
        }
        
        // 중복 아님 -> 인증 메일 발송
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin }
        })
        
        if (error) throw error
        setMsg({ type: 'success', text: '📨 인증 메일이 발송되었습니다! 메일함을 확인해주세요.' })
      }
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container component="main" maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={6} sx={{ p: 4, width: '100%', borderRadius: 3 }}>
        
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography component="h1" variant="h5" fontWeight="bold">Cluby</Typography>
          <Typography variant="body2" color="text.secondary">동아리 통합 관리 플랫폼</Typography>
        </Box>

        <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="로그인" />
          <Tab label="회원가입" />
        </Tabs>

        {msg.text && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

        {/* === [탭 0] 로그인 화면 === */}
        {tabIndex === 0 && (
          <Stack spacing={2}>
            <TextField 
              label="이메일" type="email" fullWidth size="small"
              value={email} onChange={e => setEmail(e.target.value)} 
            />
            <TextField 
              label="비밀번호" type="password" fullWidth size="small"
              value={password} onChange={e => setPassword(e.target.value)} 
            />
            <Button 
              fullWidth variant="contained" size="large" 
              onClick={() => handleLogin(false)} disabled={loading}
              startIcon={<LockOpen />}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>
            
            <Divider>또는</Divider>
            
            <Button 
              fullWidth variant="outlined" size="large" 
              onClick={() => handleLogin(true)} disabled={loading}
              startIcon={<Google />}
              sx={{ color: '#DB4437', borderColor: '#DB4437', '&:hover': { bgcolor: '#fff5f5', borderColor: '#C53929' } }}
            >
              Google로 로그인
            </Button>
          </Stack>
        )}

        {/* === [탭 1] 회원가입 화면 === */}
        {tabIndex === 1 && (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ fontSize: '0.9em' }}>
              이메일 인증 후 아이디와 비밀번호를 설정합니다.
            </Alert>
            <TextField 
              label="인증받을 이메일" type="email" fullWidth size="small"
              value={email} onChange={e => setEmail(e.target.value)} 
            />
            <Button 
              fullWidth variant="contained" size="large" 
              onClick={() => handleSignup(false)} disabled={loading}
              startIcon={<Email />}
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
            >
              {loading ? '전송 중...' : '인증 메일 보내기'}
            </Button>

            <Divider>또는</Divider>

            <Button 
              fullWidth variant="outlined" size="large" 
              onClick={() => handleSignup(true)} disabled={loading}
              startIcon={<Google />}
              sx={{ color: '#DB4437', borderColor: '#DB4437', '&:hover': { bgcolor: '#fff5f5', borderColor: '#C53929' } }}
            >
              Google로 가입하기
            </Button>
          </Stack>
        )}

      </Paper>
    </Container>
  )
}