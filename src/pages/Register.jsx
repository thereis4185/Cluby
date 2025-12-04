import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Container, Paper, Typography, TextField, Button, Alert, Stack, Box } from '@mui/material'
import { Save, Logout } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function Register({ session, onComplete }) {
  const { t } = useTranslation() // [추가]
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
    if (password !== confirmPw) return setError(t('register.err_password_match')) // [수정]
    if (password.length < 6) return setError(t('register.err_password_length')) // [수정]
    if (!username || !fullName) return setError(t('register.err_input_all')) // [수정]

    setLoading(true)
    try {
      // 아이디 중복 체크
      const { data: exists, error: rpcError } = await supabase.rpc('check_username_exists', { 
        username_input: username 
      })
      
      if (rpcError) throw rpcError
      
      if (exists) {
        throw new Error(t('register.err_username_exists')) // [수정]
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
        if (dbError.code === '23505') throw new Error(t('register.err_username_exists')) // [수정]
        throw dbError
      }

      alert(t('register.msg_welcome')) // [수정]
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
          {t('register.title')} {/* [수정] */}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
          {t('register.desc')} {/* [수정] */}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <TextField 
              label={t('register.label_username')} required fullWidth  // [수정]
              value={username} onChange={e => setUsername(e.target.value)} 
              helperText={t('register.helper_username')} // [수정]
            />
            <TextField 
              label={t('register.label_fullname')} required fullWidth  // [수정]
              value={fullName} onChange={e => setFullName(e.target.value)} 
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="caption" color="primary" fontWeight="bold">
                {t('register.password_guide')} {/* [수정] */}
              </Typography>
              <TextField 
                label={t('register.label_password')} type="password" required fullWidth sx={{ mt: 1 }} // [수정]
                value={password} onChange={e => setPassword(e.target.value)} 
              />
              <TextField 
                label={t('register.label_confirm_password')} type="password" required fullWidth sx={{ mt: 2 }} // [수정]
                value={confirmPw} onChange={e => setConfirmPw(e.target.value)} 
              />
            </Box>

            <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<Save />}>
              {loading ? t('common.loading') : t('register.btn_complete')} {/* [수정] */}
            </Button>
            
            <Button variant="text" color="secondary" onClick={handleLogout} startIcon={<Logout />}>
              {t('register.btn_cancel')} {/* [수정] */}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}