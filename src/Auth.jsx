import { useState } from 'react'
import { supabase } from './supabaseClient'
import { 
  Container, Box, TextField, Button, Typography, Paper, Alert, Divider, Tabs, Tab, Stack 
} from '@mui/material'
import { Google, Email, LockOpen } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function Auth() {
  const { t } = useTranslation() // [추가]
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

  // 1. 로그인 처리
  const handleLogin = async (isGoogle = false) => {
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      let result
      if (isGoogle) {
        result = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
      } else {
        if (!email || !password) throw new Error(t('auth.alert_input_email_pw')) // [수정]
        result = await supabase.auth.signInWithPassword({ email, password })
      }

      if (result.error) throw result.error
      
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 2. 회원가입 처리
  const handleSignup = async (isGoogle = false) => {
    setLoading(true)
    setMsg({ type: '', text: '' })

    try {
      if (isGoogle) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin }
        })
        if (error) throw error
      } else {
        if (!email) throw new Error(t('auth.alert_input_email')) // [수정]

        const { data: exists, error: rpcError } = await supabase.rpc('check_email_exists', { 
          email_input: email 
        })

        if (rpcError) throw rpcError

        if (exists) {
          throw new Error(t('auth.alert_email_exists')) // [수정]
        }
        
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin }
        })
        
        if (error) throw error
        setMsg({ type: 'success', text: t('auth.msg_email_sent') }) // [수정]
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
          <Typography variant="body2" color="text.secondary">{t('auth.subtitle')}</Typography> {/* [수정] */}
        </Box>

        <Tabs value={tabIndex} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label={t('auth.tab_login')} /> {/* [수정] */}
          <Tab label={t('auth.tab_signup')} /> {/* [수정] */}
        </Tabs>

        {msg.text && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

        {/* === [탭 0] 로그인 화면 === */}
        {tabIndex === 0 && (
          <Stack spacing={2}>
            <TextField 
              label={t('auth.label_email')} type="email" fullWidth size="small" // [수정]
              value={email} onChange={e => setEmail(e.target.value)} 
            />
            <TextField 
              label={t('auth.label_password')} type="password" fullWidth size="small" // [수정]
              value={password} onChange={e => setPassword(e.target.value)} 
            />
            <Button 
              fullWidth variant="contained" size="large" 
              onClick={() => handleLogin(false)} disabled={loading}
              startIcon={<LockOpen />}
            >
              {loading ? t('common.loading') : t('auth.btn_login')} {/* [수정] */}
            </Button>
            
            <Divider>{t('auth.or')}</Divider> {/* [수정] */}
            
            <Button 
              fullWidth variant="outlined" size="large" 
              onClick={() => handleLogin(true)} disabled={loading}
              startIcon={<Google />}
              sx={{ color: '#DB4437', borderColor: '#DB4437', '&:hover': { bgcolor: '#fff5f5', borderColor: '#C53929' } }}
            >
              {t('auth.btn_google_login')} {/* [수정] */}
            </Button>
          </Stack>
        )}

        {/* === [탭 1] 회원가입 화면 === */}
        {tabIndex === 1 && (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ fontSize: '0.9em' }}>
              {t('auth.signup_guide')} {/* [수정] */}
            </Alert>
            <TextField 
              label={t('auth.label_email_verify')} type="email" fullWidth size="small" // [수정]
              value={email} onChange={e => setEmail(e.target.value)} 
            />
            <Button 
              fullWidth variant="contained" size="large" 
              onClick={() => handleSignup(false)} disabled={loading}
              startIcon={<Email />}
              sx={{ bgcolor: '#2e7d32', '&:hover': { bgcolor: '#1b5e20' } }}
            >
              {loading ? t('auth.sending') : t('auth.btn_send_email')} {/* [수정] */}
            </Button>

            <Divider>{t('auth.or')}</Divider> {/* [수정] */}

            <Button 
              fullWidth variant="outlined" size="large" 
              onClick={() => handleSignup(true)} disabled={loading}
              startIcon={<Google />}
              sx={{ color: '#DB4437', borderColor: '#DB4437', '&:hover': { bgcolor: '#fff5f5', borderColor: '#C53929' } }}
            >
              {t('auth.btn_google_signup')} {/* [수정] */}
            </Button>
          </Stack>
        )}

      </Paper>
    </Container>
  )
}