import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'

// 각 기능별 컴포넌트 Import
import ClubHomeTab from '../features/ClubHomeTab'
import GroupTab from '../features/GroupTab'
import GroupManageTab from '../features/GroupManageTab'
import BoardTab from '../features/BoardTab'
import ArchiveTab from '../features/ArchiveTab' // [복구] 기존 자료실
import PhotoArchiveTab from '../features/PhotoArchiveTab' // [추가] 사진첩
import LedgerTab from '../features/LedgerTab'
import CalendarTab from '../features/CalendarTab'
import MemberManageTab from '../features/MemberManageTab'
import ClubSettingsTab from '../features/ClubSettingsTab'
import ChatTab from '../features/ChatTab'

import { 
  Tabs, Tab, Box, Typography, Container, Stack, Chip, Button, Fade, Avatar 
} from '@mui/material'
import { 
  Verified, PhotoCamera, Settings 
} from '@mui/icons-material'

export default function ClubDetail() {
  const { id } = useParams()
  
  // --- [State: 인증 및 권한] ---
  const [isAdmin, setIsAdmin] = useState(false)
  const [myRole, setMyRole] = useState(null) 
  const [currentUserId, setCurrentUserId] = useState(null)
  const [myGroupMemberships, setMyGroupMemberships] = useState([]) 

  // --- [State: 데이터] ---
  const [clubData, setClubData] = useState({ 
    name: '', is_official: false, main_image_url: '', 
    intro_title: '', intro_content: '', icon_url: '' 
  })
  const [uploading, setUploading] = useState(false)

  // --- [State: 네비게이션 및 탭] ---
  const [activeTab, setActiveTab] = useState('home')
  const [targetGroupId, setTargetGroupId] = useState(null) 
  const [targetPostId, setTargetPostId] = useState(null)   

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUserId(session.user.id)
        checkPermission(session.user.id)
        fetchMyGroupStatus(session.user.id)
      }
    })
    fetchClubInfo()
  }, [id])

  // --- [Data Fetching Helpers] ---
  const checkPermission = async (userId) => {
    const { data } = await supabase.from('club_members')
      .select('role, status')
      .eq('club_id', id)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle()

    if (data) {
      setMyRole(data.role)
      if (data.role === 'manager' || data.role === 'staff') setIsAdmin(true)
    } else {
      const { data: pendingData } = await supabase.from('club_members')
        .select('status')
        .eq('club_id', id)
        .eq('user_id', userId)
        .maybeSingle()
      if (pendingData?.status === 'pending') setMyRole('pending')
      else setMyRole(null)
    }
  }

  const fetchMyGroupStatus = async (userId) => {
    const { data } = await supabase.from('club_group_members')
      .select('user_id, role, group_id')
      .eq('club_id', id)
      .eq('user_id', userId);
    if (data) setMyGroupMemberships(data);
  }

  const fetchClubInfo = async () => {
    const { data } = await supabase.from('clubs').select('*').eq('id', id).maybeSingle()
    if (data) setClubData(data)
  }

  // --- [Action Handlers] ---
  const handleJoin = async () => {
    if (!confirm('가입 신청하시겠습니까?')) return
    const { error } = await supabase.from('club_members').insert([{ user_id: currentUserId, club_id: id, status: 'pending' }])
    if (error) alert('오류: ' + error.message)
    else { alert('신청 완료! 승인을 기다려주세요.'); checkPermission(currentUserId); }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true)
    try {
      const filePath = `club_covers/${id}_${Date.now()}`
      await supabase.storage.from('club_files').upload(filePath, file)
      const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
      await supabase.from('clubs').update({ main_image_url: data.publicUrl }).eq('id', id)
      fetchClubInfo()
    } catch(err) { alert('업로드 실패') }
    setUploading(false)
  }

  // --- [Navigation Logic] ---
  const handleNavigateToBoard = (groupId = null, postId = null) => {
    setTargetGroupId(groupId)
    setTargetPostId(postId)
    setActiveTab('board')
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  const handleNavigateToChat = (groupId) => {
    setTargetGroupId(groupId)
    setActiveTab('chat')
    window.scrollTo({ top: 400, behavior: 'smooth' })
  }

  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue)
    if (newValue === 'board' || newValue === 'chat') {
      setTargetGroupId(null)
      setTargetPostId(null)
    }
  }

  const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) { hash = string.charCodeAt(i) + ((hash << 5) - hash); }
    let color = '#';
    for (let i = 0; i < 3; i += 1) { const value = (hash >> (i * 8)) & 0xff; color += `00${value.toString(16)}`.slice(-2); }
    return color;
  }

  const isMember = ['manager', 'staff', 'member'].includes(myRole)

  // --- [Render] ---
  
  const navTabs = (
    <Tabs 
      value={activeTab} 
      onChange={handleTabChange} 
      variant="scrollable"
      scrollButtons="auto"
      allowScrollButtonsMobile
      sx={{ 
        minHeight: 64,
        '& .MuiTab-root': { minHeight: 64, fontSize: '0.95rem', fontWeight: 700, px: 3, color: '#64748b' },
        '& .Mui-selected': { color: '#4F46E5 !important' },
        '& .MuiTabs-indicator': { bgcolor: '#4F46E5', height: 3, borderRadius: '3px 3px 0 0' }
      }}
    >
      <Tab label="홈" value="home" />
      {isMember && <Tab label="게시판" value="board" />}
      {isMember && <Tab label="캘린더" value="calendar" />}
      
      {/* --- 자료실 & 사진첩 구분 --- */}
      {isMember && <Tab label="자료실" value="archive" />} {/* 기존 자료실 */}
      {isMember && <Tab label="사진첩" value="photo" />}   {/* 신규 사진첩 */}
      
      {isMember && <Tab label="그룹" value="my_group" />}
      {isMember && <Tab label="채팅" value="chat" />}
      
      {/* 관리자 메뉴 */}
      {isMember && <Tab label="그룹 관리" value="group_manage" />}
      {isMember && isAdmin && <Tab label="멤버 관리" value="member_manage"/>}
      {isMember && isAdmin && <Tab label="회계장부" value="ledger"/>}
      {isMember && isAdmin && <Tab icon={<Settings sx={{fontSize:20}}/>} value="settings" sx={{ minWidth: 50, px: 1 }} />}
    </Tabs>
  )

  return (
    <Layout disableContainer={true} headerContent={navTabs}>
      
      <Box sx={{ 
        position: 'relative', width: '100%', height: { xs: 300, md: 450 }, 
        backgroundImage: `url(${clubData.main_image_url || 'https://placehold.co/1920x600/1a237e/FFF?text=Welcome'})`,
        backgroundSize: 'cover', backgroundPosition: 'center', display: 'flex', alignItems: 'flex-end',
        '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0) 100%)' }
      }}>
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, pb: 6, color: 'white' }}>
          <Stack direction={{xs:'column', md:'row'}} alignItems={{xs:'flex-start', md:'flex-end'}} spacing={4}>
            <Stack direction="row" spacing={3} alignItems="flex-end" sx={{ flexGrow: 1 }}>
              <Avatar 
                src={clubData.icon_url} 
                sx={{ 
                  width: { xs: 100, md: 140 }, height: { xs: 100, md: 140 }, 
                  bgcolor: stringToColor(clubData.name || ''), 
                  fontSize: '3.5rem', fontWeight: 'bold', 
                  border: '4px solid white', boxShadow: '0 12px 24px rgba(0,0,0,0.3)' 
                }}
              >
                {clubData.name ? clubData.name[0] : '?'}
              </Avatar>
              <Box sx={{ mb: 1 }}>
                {clubData.is_official && (
                  <Chip 
                    icon={<Verified sx={{ color: '#fff !important' }} />} 
                    label="공식 인증" size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(5px)', mb: 1.5, fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)' }} 
                  />
                )}
                <Typography variant="h2" fontWeight="900" sx={{ textShadow: '0 4px 12px rgba(0,0,0,0.5)', fontSize: {xs:'2rem', md:'3.5rem'}, lineHeight: 1.1, mb: 1 }}>
                  {clubData.name}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 400, lineHeight: 1.5, maxWidth: 600 }}>
                  {clubData.intro_title || '환영합니다!'}
                </Typography>
              </Box>
            </Stack>
            
            <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
              {!myRole && myRole !== 'pending' && (
                <Button variant="contained" size="large" onClick={handleJoin} sx={{ bgcolor: 'white', color: 'black', fontWeight: 'bold', px: 4, py: 1.5, '&:hover':{bgcolor:'#f5f5f5'} }}>
                  가입 신청하기
                </Button>
              )}
              {myRole === 'pending' && (
                <Chip label="승인 대기중" color="warning" sx={{ height: 48, px: 2, fontSize: '1rem', fontWeight: 'bold', bgcolor: 'rgba(237, 108, 2, 0.9)', color: 'white' }} />
              )}
              {isAdmin && (
                <Button 
                  component="label" 
                  variant="outlined" 
                  startIcon={<PhotoCamera />} 
                  sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', height: 48, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                >
                  커버 변경
                  <input type="file" hidden accept="image/*" onChange={handleCoverUpload} disabled={uploading} />
                </Button>
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 5, minHeight: '60vh', pb: 10 }}>
        <Fade in={true} timeout={500} key={activeTab}>
          <Box>
            {activeTab === 'home' && (
              <ClubHomeTab 
                clubData={clubData} 
                isManager={myRole === 'manager'} 
                refreshClubInfo={fetchClubInfo} 
              />
            )}
            
            {isMember && activeTab === 'my_group' && (
              <GroupTab 
                clubId={id} 
                currentUserId={currentUserId} 
                onNavigateToBoard={handleNavigateToBoard}
                onNavigateToChat={handleNavigateToChat}
              />
            )}
            
            {isMember && activeTab === 'board' && (
              <BoardTab 
                clubId={id} 
                isAdmin={isAdmin} 
                myRole={myRole} 
                currentUserId={currentUserId} 
                initialGroupId={targetGroupId}
                initialPostId={targetPostId}
              />
            )}
            
            {isMember && activeTab === 'calendar' && (
              <CalendarTab 
                clubId={id} 
                currentUserId={currentUserId} 
                isAdmin={isAdmin} 
                onNavigateToBoard={handleNavigateToBoard}
              />
            )}

            {/* --- 탭 렌더링 구분 --- */}
            {/* 1. 자료실 (기존) */}
            {isMember && activeTab === 'archive' && (
              <ArchiveTab 
                clubId={id} 
                isAdmin={isAdmin} 
              />
            )}

            {/* 2. 사진첩 (신규) */}
            {isMember && activeTab === 'photo' && (
              <PhotoArchiveTab 
                clubId={id} 
                currentUserId={currentUserId}
                myRole={myRole}
                groupMembers={myGroupMemberships}
              />
            )}
            
            {isMember && activeTab === 'chat' && (
              <ChatTab 
                clubId={id} 
                currentUserId={currentUserId} 
                initialGroupId={targetGroupId}
              />
            )}

            {isMember && activeTab === 'group_manage' && <GroupManageTab clubId={id} isAdmin={isAdmin} currentUserId={currentUserId} />}
            {isMember && activeTab === 'member_manage' && isAdmin && <MemberManageTab clubId={id} myRole={myRole} />}
            {isMember && activeTab === 'ledger' && isAdmin && <LedgerTab clubId={id} />}
            {isMember && activeTab === 'settings' && isAdmin && <ClubSettingsTab clubId={id} />}
          </Box>
        </Fade>
      </Container>
    </Layout>
  )
}