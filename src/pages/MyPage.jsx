import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import { 
  Container, Paper, Typography, TextField, Button, Box, Avatar, 
  Stack, Divider, Alert, CircularProgress 
} from '@mui/material'
import { Edit, Save, LockReset, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next' // [추가]

export default function MyPage({ session }) {
  const navigate = useNavigate()
  const { t } = useTranslation() // [추가]
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') 
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { user } = session
      const { data, error } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', user.id).single()
      if (error) throw error
      if (data) { setUsername(data.username); setFullName(data.full_name); setAvatarUrl(data.avatar_url) }
    } catch (error) { console.error('Error:', error.message) } finally { setLoading(false) }
  }

  // 1. 프로필 사진 업로드
  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]; if (!file) return
      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${session.user.id}/${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage.from('club_files').upload(filePath, file)
      if (uploadError) throw uploadError
      
      const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
      
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id)
      if (updateError) throw updateError
      
      setAvatarUrl(data.publicUrl)
      setMsg({ type: 'success', text: t('mypage.msg_avatar_updated') }) // [수정]
    } catch (error) { setMsg({ type: 'error', text: 'Error: ' + error.message }) } finally { setUploading(false) }
  }

  // 2. 기본 정보 수정
  const handleUpdateProfile = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.from('profiles').update({ username, full_name: fullName }).eq('id', session.user.id)
      if (error) throw error
      setMsg({ type: 'success', text: t('mypage.msg_profile_saved') }) // [수정]
    } catch (error) { setMsg({ type: 'error', text: error.message }) } finally { setLoading(false) }
  }

  // 3. 비밀번호 변경
  const handlePasswordChange = async () => {
    if (newPassword.length < 6) return setMsg({ type: 'error', text: t('mypage.err_password_length') }) // [수정]
    if (newPassword !== confirmPassword) return setMsg({ type: 'error', text: t('mypage.err_password_match') }) // [수정]

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMsg({ type: 'success', text: t('mypage.msg_password_changed') }) // [수정]
      setNewPassword(''); setConfirmPassword('')
    } catch (error) { setMsg({ type: 'error', text: error.message }) } finally { setLoading(false) }
  }

  if (loading) return <Layout><Box sx={{display:'flex', justifyContent:'center', mt:10}}><CircularProgress /></Box></Layout>

  return (
    <Layout>
      <Container maxWidth="sm">
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 2, color: 'text.secondary' }}>
          {t('mypage.go_home')} {/* [수정] */}
        </Button>
        
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>{t('mypage.title')}</Typography> {/* [수정] */}
          
          {msg.text && <Alert severity={msg.type} sx={{ mb: 3 }}>{msg.text}</Alert>}

          {/* 1. 프로필 사진 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative', width: 100, height: 100, mb: 2 }}>
              <Avatar src={avatarUrl} alt={fullName} sx={{ width: '100%', height: '100%', border: '4px solid #f3f4f6', boxShadow: 2 }} />
              <Box
                component="label"
                sx={{
                  position: 'absolute', inset: 0, borderRadius: '50%', bgcolor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: uploading ? 'wait' : 'pointer',
                  opacity: 0, transition: 'opacity 0.3s ease', '&:hover': { opacity: 1 },
                }}
              >
                {uploading ? <CircularProgress size={24} color="inherit" /> : <Edit fontSize="medium" />}
                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">{session.user.email}</Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* 2. 기본 정보 */}
          <Stack spacing={3} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold">{t('mypage.basic_info')}</Typography> {/* [수정] */}
            <TextField label={t('mypage.label_username')} fullWidth value={username} onChange={(e) => setUsername(e.target.value)} /> {/* [수정] */}
            <TextField label={t('mypage.label_fullname')} fullWidth value={fullName} onChange={(e) => setFullName(e.target.value)} /> {/* [수정] */}
            <Button variant="contained" size="large" onClick={handleUpdateProfile}>{t('mypage.btn_save_info')}</Button> {/* [수정] */}
          </Stack>

          <Divider sx={{ mb: 4 }} />

          {/* 3. 비밀번호 변경 */}
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight="bold" color="error">{t('mypage.change_password')}</Typography> {/* [수정] */}
            <TextField label={t('mypage.label_new_password')} type="password" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /> {/* [수정] */}
            <TextField 
              label={t('mypage.label_confirm_password')} type="password" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} // [수정]
              error={newPassword !== confirmPassword && confirmPassword !== ''}
              helperText={newPassword !== confirmPassword && confirmPassword !== '' ? t('mypage.err_password_match') : t('mypage.helper_password')} // [수정]
            />
            <Button variant="outlined" color="error" onClick={handlePasswordChange} startIcon={<LockReset />} disabled={!newPassword || newPassword !== confirmPassword}>
              {t('mypage.btn_change_password')} {/* [수정] */}
            </Button>
          </Stack>

        </Paper>
      </Container>
    </Layout>
  )
}