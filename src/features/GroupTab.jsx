import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Card, CardContent, Button, Chip, Stack, Fade, 
  Avatar, AvatarGroup, Divider 
} from '@mui/material'
import { 
  Groups, ArrowForward, Article, Chat, Lock, CheckCircle, 
  Public, ArrowOutward 
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function GroupTab({ clubId, currentUserId, onNavigateToBoard, onNavigateToChat }) {
  const { t } = useTranslation() // [추가]
  const [groups, setGroups] = useState([])
  const [myGroupIds, setMyGroupIds] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: allGroups } = await supabase.from('groups').select('*').eq('club_id', clubId).order('name')
      setGroups(allGroups || [])

      if (currentUserId) {
        const { data: myMemberships } = await supabase.from('group_members').select('group_id').eq('user_id', currentUserId)
        const ids = myMemberships?.map(m => m.group_id) || []
        setMyGroupIds(ids)
      }
    }
    fetchData()
  }, [clubId, currentUserId])

  const myGroups = groups.filter(g => myGroupIds.includes(g.id))
  // const otherGroups = groups.filter(g => !myGroupIds.includes(g.id)) // (사용 안 함)

  // 카드 렌더링용 공통 컴포넌트
  const GroupCard = ({ group, isMember }) => (
    <Card 
      elevation={0}
      sx={{ 
        height: '100%', 
        borderRadius: 4, 
        border: '1px solid',
        borderColor: isMember ? '#e2e8f0' : '#f1f5f9',
        bgcolor: isMember ? 'white' : '#f8fafc',
        transition: 'all 0.3s ease',
        '&:hover': { 
          transform: isMember ? 'translateY(-4px)' : 'none', 
          boxShadow: isMember ? '0 12px 24px rgba(0,0,0,0.05)' : 'none',
          borderColor: isMember ? '#cbd5e1' : '#f1f5f9'
        }
      }}
    >
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box 
              sx={{ 
                width: 48, height: 48, borderRadius: 3, 
                bgcolor: isMember ? '#eff6ff' : '#f1f5f9', 
                color: isMember ? '#2563eb' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              {isMember ? <Groups /> : <Lock />}
            </Box>
            {isMember ? (
              <Chip label={t('group.tab.joined')} size="small" icon={<CheckCircle sx={{ fontSize: 14 }} />} sx={{ bgcolor: '#ecfdf5', color: '#059669', fontWeight: 'bold', border: '1px solid #a7f3d0' }} /> // [수정]
            ) : (
              <Chip label={t('group.tab.private')} size="small" icon={<Lock sx={{ fontSize: 14 }} />} sx={{ bgcolor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }} /> // [수정]
            )}
          </Box>

          <Typography variant="h6" fontWeight="bold" sx={{ mb: 1, color: isMember ? '#1e293b' : '#64748b' }}>
            {group.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            {isMember 
              ? t('group.tab.desc_joined') 
              : t('group.tab.desc_private')} {/* [수정] */}
          </Typography>
        </Box>

        {/* 하단 버튼 영역 */}
        {isMember ? (
          <Stack direction="row" spacing={1} sx={{ mt: 'auto' }}>
            <Button 
              fullWidth 
              variant="outlined" 
              startIcon={<Article />} 
              onClick={() => onNavigateToBoard(group.id)}
              sx={{ 
                borderRadius: 2, textTransform: 'none', fontWeight: 'bold',
                borderColor: '#e2e8f0', color: '#475569',
                '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc', color: '#1e293b' }
              }}
            >
              {t('club.tabs.board')} {/* [수정] 기존 board 탭 이름 재사용 */}
            </Button>
            <Button 
              fullWidth 
              variant="contained" 
              startIcon={<Chat />} 
              onClick={() => onNavigateToChat(group.id)}
              sx={{ 
                borderRadius: 2, textTransform: 'none', fontWeight: 'bold',
                bgcolor: '#4F46E5', boxShadow: 'none',
                '&:hover': { bgcolor: '#4338ca', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }
              }}
            >
              {t('club.tabs.chat')} {/* [수정] 기존 chat 탭 이름 재사용 */}
            </Button>
          </Stack>
        ) : (
          <Button 
            fullWidth 
            disabled 
            variant="outlined" 
            sx={{ mt: 'auto', borderRadius: 2, borderColor: '#e2e8f0' }}
          >
            {t('group.tab.no_access')} {/* [수정] */}
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ minHeight: '60vh', pb: 5 }}>
      
      {/* 내 그룹 섹션 */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h5" fontWeight="900" color="text.primary" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: '50%', bgcolor: '#eef2ff', color: '#4F46E5' }}><Groups /></Box>
          {t('group.tab.my_groups')} {/* [수정] */}
          <Chip label={myGroups.length} size="small" sx={{ fontWeight: 'bold', bgcolor: '#e2e8f0' }} />
        </Typography>
        
        {myGroups.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8, bgcolor: '#f8fafc', borderRadius: 4, border: '1px dashed #cbd5e1' }}>
            <Groups sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
            <Typography color="text.secondary">{t('group.tab.no_joined_groups')}</Typography> {/* [수정] */}
          </Box>
        ) : (
          // CSS Grid 레이아웃 (MUI Grid 대신 사용)
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 3 }}>
            {myGroups.map(group => (
              <Fade in key={group.id} timeout={500}>
                <Box>
                  <GroupCard group={group} isMember={true} />
                </Box>
              </Fade>
            ))}
          </Box>
        )}
      </Box>

    </Box>
  )
}