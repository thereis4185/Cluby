import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Typography, TextField, Button, Alert, Stack, Box } from '@mui/material'
import { Save, Logout } from '@mui/icons-material'

export default function Register({ session, onComplete }) {
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // 기본 유효성 검사
    if (password !== confirmPw) return setError('비밀번호가 일치하지 않습니다.')
    if (password.length < 6) return setError('비밀번호는 6자 이상이어야 합니다.')
    if (!username || !fullName) return setError('모든 정보를 입력해주세요.')

    setLoading(true)
    try {
      // [NEW] ★ 아이디 중복 체크 (SQL 함수 호출)
      const { data: exists, error: rpcError } = await supabase.rpc('check_username_exists', { 
        username_input: username 
      })
      
      if (rpcError) throw rpcError
      
      if (exists) {
        throw new Error('이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.')
      }

      // 1. 비밀번호 설정
      const { error: pwError } = await supabase.auth.updateUser({ password: password })
      if (pwError) throw pwError

      // 2. 프로필 정보 저장 및 가입 완료 처리
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          username: username, 
          full_name: fullName,
          is_registered: true 
        })
        .eq('id', session.user.id)

      if (dbError) {
        // 만약 찰나의 순간에 DB 제약조건에 걸렸을 경우를 대비
        if (dbError.code === '23505') throw new Error('이미 사용 중인 아이디입니다.')
        throw dbError
      }

      alert('가입이 완료되었습니다! 환영합니다.')
      onComplete()
      navigate('/')

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <Container maxWidth="xs" sx={{ height: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" align="center" gutterBottom>
          👋 환영합니다!
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          서비스 이용을 위해 추가 정보를 입력해주세요.<br/>
          (아이디와 비밀번호를 설정합니다)
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField 
              label="아이디 (Username)" required fullWidth 
              value={username} onChange={e => setUsername(e.target.value)} 
              helperText="영문, 숫자 사용 가능 (중복 불가)"
            />
            <TextField 
              label="이름 (실명)" required fullWidth 
              value={fullName} onChange={e => setFullName(e.target.value)} 
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="primary" fontWeight="bold">
                🔒 로그인에 사용할 비밀번호 설정
              </Typography>
              <TextField 
                label="비밀번호" type="password" required fullWidth sx={{ mt: 1 }}
                value={password} onChange={e => setPassword(e.target.value)} 
              />
              <TextField 
                label="비밀번호 확인" type="password" required fullWidth sx={{ mt: 2 }}
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} 
              />
            </Box>

            <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<Save />}>
              {loading ? '확인 중...' : '가입 완료'}
            </Button>
            
            <Button variant="text" color="secondary" onClick={handleLogout} startIcon={<Logout />}>
              처음으로 돌아가기 (가입 취소)
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}