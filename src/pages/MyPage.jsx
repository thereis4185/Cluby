import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import { 
  Container, Paper, Typography, TextField, Button, Box, Avatar, 
  Stack, Divider, Alert, CircularProgress 
} from '@mui/material'
import { Edit, Save, LockReset, ArrowBack } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'

export default function MyPage({ session }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  
  // 내 정보 상태
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  
  // 비밀번호 상태
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('') // 비밀번호 확인용
  const [msg, setMsg] = useState({ type: '', text: '' })

  useEffect(() => {
    fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { user } = session
      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error
      if (data) {
        setUsername(data.username)
        setFullName(data.full_name)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Error loading user data!', error.message)
    } finally {
      setLoading(false)
    }
  }

  // 1. 프로필 사진 업로드
  const handleAvatarUpload = async (e) => {
    try {
      setUploading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${session.user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('club_files')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', session.user.id)

      if (updateError) throw updateError

      setAvatarUrl(data.publicUrl)
      setMsg({ type: 'success', text: '프로필 사진이 변경되었습니다.' })
    } catch (error) {
      setMsg({ type: 'error', text: '사진 업로드 실패: ' + error.message })
    } finally {
      setUploading(false)
    }
  }

  // 2. 기본 정보 수정
  const handleUpdateProfile = async () => {
    try {
      setLoading(true)
      const { error } = await supabase
        .from('profiles')
        .update({ username, full_name: fullName })
        .eq('id', session.user.id)

      if (error) throw error
      setMsg({ type: 'success', text: '프로필 정보가 저장되었습니다.' })
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  // 3. 비밀번호 변경
  const handlePasswordChange = async () => {
    if (newPassword.length < 6) return setMsg({ type: 'error', text: '비밀번호는 6자 이상이어야 합니다.' })
    if (newPassword !== confirmPassword) return setMsg({ type: 'error', text: '비밀번호가 일치하지 않습니다.' })

    try {
      setLoading(true)
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setMsg({ type: 'success', text: '비밀번호가 변경되었습니다.' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setMsg({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Layout><Box sx={{display:'flex', justifyContent:'center', mt:10}}><CircularProgress /></Box></Layout>

  return (
    <Layout>
      <Container maxWidth="sm">
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/')} sx={{ mb: 2, color: 'text.secondary' }}>
          홈으로
        </Button>
        
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>내 정보 수정</Typography>
          
          {msg.text && <Alert severity={msg.type} sx={{ mb: 3 }}>{msg.text}</Alert>}

          {/* 1. 프로필 사진 섹션 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{ position: 'relative', width: 100, height: 100, mb: 2 }}>
              <Avatar 
                src={avatarUrl} 
                alt={fullName}
                sx={{ width: '100%', height: '100%', border: '4px solid #f3f4f6', boxShadow: 2 }} 
              />
              
              {/* 수정된 오버레이: IconButton 제거하고 Box 사용 (깜빡임 해결) */}
              <Box
                component="label"
                sx={{
                  position: 'absolute',
                  inset: 0, // top, right, bottom, left 모두 0으로 꽉 채움
                  borderRadius: '50%',
                  bgcolor: 'rgba(0, 0, 0, 0.5)', // 반투명 검정
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  cursor: uploading ? 'wait' : 'pointer',
                  
                  // 애니메이션: 기본 상태에 transition을 두어 들어올 때/나갈 때 모두 부드럽게 처리
                  opacity: 0,
                  transition: 'opacity 0.3s ease', 
                  '&:hover': { opacity: 1 },
                }}
              >
                {uploading ? <CircularProgress size={24} color="inherit" /> : <Edit fontSize="medium" />}
                <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
              </Box>
            </Box>
            <Typography variant="caption" color="text.secondary">{session.user.email}</Typography>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {/* 2. 기본 정보 섹션 */}
          <Stack spacing={3} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight="bold">기본 정보</Typography>
            <TextField 
              label="아이디 (Username)" fullWidth 
              value={username} onChange={(e) => setUsername(e.target.value)} 
            />
            <TextField 
              label="이름 (실명)" fullWidth 
              value={fullName} onChange={(e) => setFullName(e.target.value)} 
            />
            <Button variant="contained" size="large" onClick={handleUpdateProfile}>
              정보 저장
            </Button>
          </Stack>

          <Divider sx={{ mb: 4 }} />

          {/* 3. 비밀번호 변경 섹션 */}
          <Stack spacing={3}>
            <Typography variant="subtitle1" fontWeight="bold" color="error">비밀번호 변경</Typography>
            <TextField 
              label="새 비밀번호" type="password" fullWidth 
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
            />
            <TextField 
              label="새 비밀번호 확인" type="password" fullWidth 
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              error={newPassword !== confirmPassword && confirmPassword !== ''}
              helperText={newPassword !== confirmPassword && confirmPassword !== '' ? "비밀번호가 일치하지 않습니다." : "변경할 경우에만 입력하세요."}
            />
            <Button 
              variant="outlined" 
              color="error" 
              onClick={handlePasswordChange} 
              startIcon={<LockReset />}
              disabled={!newPassword || newPassword !== confirmPassword}
            >
              비밀번호 변경
            </Button>
          </Stack>

        </Paper>
      </Container>
    </Layout>
  )
}