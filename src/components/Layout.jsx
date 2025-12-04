import { useState, useEffect } from 'react'
import { 
  AppBar, Toolbar, Typography, Button, Box, Container, IconButton, 
  Avatar, Menu, MenuItem, ListItemIcon, Divider, Tooltip
} from '@mui/material'
import { Logout, Settings, Person, KeyboardArrowDown, ChatBubbleOutline, Language } from '@mui/icons-material' // [추가] Language 아이콘
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next' // [추가] 번역 훅

export default function Layout({ children, disableContainer = false, headerContent = null }) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation() // [추가]
  const [profile, setProfile] = useState({ username: '', full_name: '', avatar_url: '', email: '' })
  
  // 메뉴 상태 관리
  const [anchorEl, setAnchorEl] = useState(null) // 프로필 메뉴
  const [langAnchorEl, setLangAnchorEl] = useState(null) // [추가] 언어 메뉴
  
  const open = Boolean(anchorEl)
  const langOpen = Boolean(langAnchorEl) // [추가]

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', user.id).maybeSingle()
        if (data) {
          setProfile({ username: data.username, full_name: data.full_name, avatar_url: data.avatar_url, email: user.email })
        }
      }
    }
    fetchProfile()
  }, [])

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)
  
  // [추가] 언어 메뉴 핸들러
  const handleLangOpen = (event) => setLangAnchorEl(event.currentTarget)
  const handleLangClose = () => setLangAnchorEl(null)
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang)
    handleLangClose()
  }

  const handleGoToMyPage = () => { handleMenuClose(); navigate('/mypage') }
  const handleLogout = async () => { handleMenuClose(); await supabase.auth.signOut(); navigate('/'); window.location.reload() }
  const handleGoToChat = () => navigate('/chat')

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar 
        position="sticky" 
        color="inherit" 
        elevation={0} 
        sx={{ 
          bgcolor: 'rgba(255,255,255,0.95)', 
          backdropFilter: 'blur(8px)', 
          borderBottom: '1px solid #e2e8f0',
          zIndex: (theme) => theme.zIndex.drawer + 1
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: 64 }}>
          
          <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 120 }}>
            <Typography 
              variant="h5" component="div" 
              sx={{ fontWeight: 900, cursor: 'pointer', background: 'linear-gradient(45deg, #4F46E5, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}
              onClick={() => navigate('/')}
            >
              Cluby
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', mx: 2, overflow: 'hidden' }}>
            {headerContent}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 120, gap: 1 }}>
            
            {/* [추가] 언어 변경 버튼 */}
            <Tooltip title={t('layout.change_lang')}>
              <IconButton onClick={handleLangOpen} sx={{ color: 'text.secondary', '&:hover':{color:'primary.main'} }}>
                <Language />
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={langAnchorEl}
              open={langOpen}
              onClose={handleLangClose}
            >
              <MenuItem onClick={() => changeLanguage('ko')} selected={i18n.language === 'ko'}>🇰🇷 한국어</MenuItem>
              <MenuItem onClick={() => changeLanguage('ja')} selected={i18n.language === 'ja'}>🇯🇵 日本語</MenuItem>
            </Menu>

            {/* 채팅 버튼 */}
            <Tooltip title={t('layout.my_chat')}>
              <IconButton onClick={handleGoToChat} sx={{ color: 'text.secondary', '&:hover':{color:'primary.main'} }}>
                <ChatBubbleOutline />
              </IconButton>
            </Tooltip>

            {/* 프로필 버튼 */}
            <Tooltip title={t('layout.account_settings')}>
              <Button onClick={handleMenuOpen} color="inherit" sx={{ textTransform: 'none', borderRadius: 50, px: 1, py: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' } }}>
                <Avatar src={profile.avatar_url} sx={{ width: 32, height: 32, bgcolor: 'primary.main', mr: 0.5 }}><Person fontSize="small" /></Avatar>
                <KeyboardArrowDown fontSize="small" color="action" />
              </Button>
            </Tooltip>

            <Menu
              anchorEl={anchorEl} open={open} onClose={handleMenuClose} onClick={handleMenuClose}
              PaperProps={{
                elevation: 0, sx: { overflow: 'visible', filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.1))', mt: 1.5, borderRadius: 3, minWidth: 220, border: '1px solid #f3f4f6', '&:before': { content: '""', display: 'block', position: 'absolute', top: 0, right: 24, width: 10, height: 10, bgcolor: 'background.paper', transform: 'translateY(-50%) rotate(45deg)', zIndex: 0, borderLeft: '1px solid #f3f4f6', borderTop: '1px solid #f3f4f6' } }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2.5, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar src={profile.avatar_url} sx={{ width: 40, height: 40, bgcolor: 'primary.main' }} />
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="subtitle2" fontWeight="bold" noWrap>{profile.full_name || profile.username}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" noWrap>{profile.email}</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleGoToMyPage} sx={{ py: 1.5, px: 2.5 }}>
                <ListItemIcon><Settings fontSize="small" /></ListItemIcon>{t('layout.account_settings')}
              </MenuItem>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={handleLogout} sx={{ py: 1.5, px: 2.5, color: 'error.main' }}>
                <ListItemIcon><Logout fontSize="small" color="error" /></ListItemIcon>
                <Typography variant="body2" fontWeight="bold">{t('layout.logout')}</Typography>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      
      {disableContainer ? <Box sx={{ width: '100%', pb: 10 }}>{children}</Box> : <Container maxWidth={false} sx={{ px: { xs: 2, md: 5, lg: 10 }, pb: 10 }}>{children}</Container>}
    </Box>
  )
}