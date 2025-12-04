import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import Layout from '../components/Layout'
import { 
  Box, Paper, Typography, List, ListItemButton, ListItemText, ListItemAvatar,
  Avatar, IconButton, TextField, Chip, Container, Divider, Stack, Skeleton // [추가] Skeleton
} from '@mui/material'
import { Send, Public, Groups, Chat as ChatIcon } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' 

export default function ChatPage({ session }) {
  const { t } = useTranslation() 
  const currentUserId = session?.user?.id
  
  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true) // [NEW] 채널 로딩 상태
  const messagesEndRef = useRef(null)

  // 1. 내 모든 채팅방 목록 가져오기
  useEffect(() => {
    if (currentUserId) fetchAllChannels()
  }, [currentUserId])

  const fetchAllChannels = async () => {
    setLoading(true) // 로딩 시작
    // (A) 가입한 동아리의 전체 채팅방
    const { data: clubs } = await supabase.from('club_members')
      .select('club_id, clubs(name)')
      .eq('user_id', currentUserId)
      .eq('status', 'approved')

    const generalChannels = clubs?.map(c => ({
      id: `general_${c.club_id}`,
      realId: null, 
      clubId: c.club_id,
      name: c.clubs.name,
      type: 'general',
      clubName: c.clubs.name
    })) || []

    // (B) 소속된 그룹 채팅방
    const { data: groups } = await supabase.from('group_members')
      .select('group_id, groups(name, club_id, clubs(name))')
      .eq('user_id', currentUserId)

    const groupChannels = groups?.map(g => ({
      id: `group_${g.group_id}`,
      realId: g.group_id,
      clubId: g.groups.club_id,
      name: g.groups.name,
      type: 'group',
      clubName: g.groups.clubs.name
    })) || []

    const all = [...generalChannels, ...groupChannels]
    setChannels(all)
    setLoading(false) // 로딩 종료
    
    // 처음에 첫 번째 방 자동 선택
    if (all.length > 0) {
      handleEnterRoom(all[0])
    }
  }

  // 2. 채팅방 입장 & 메시지 로딩
  const handleEnterRoom = (channel) => {
    setActiveChannel(channel)
    fetchMessages(channel)
  }

  const fetchMessages = async (channel) => {
    let query = supabase.from('chat_messages')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('club_id', channel.clubId)
      .order('created_at', { ascending: true })

    if (channel.type === 'general') query = query.is('group_id', null)
    else query = query.eq('group_id', channel.realId)

    const { data } = await query
    if (data) {
      setMessages(data)
      scrollToBottom()
    }
    
    // 기존 구독 해제 후 재구독
    supabase.removeAllChannels()
    subscribeChat(channel)
  }

  const subscribeChat = (channel) => {
    supabase
      .channel(`chat:${channel.id}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `club_id=eq.${channel.clubId}` }, 
        async (payload) => {
          const isCurrent = (channel.type === 'general' && payload.new.group_id === null) ||
                            (channel.type === 'group' && payload.new.group_id === channel.realId)
          
          if (isCurrent) {
            const { data: user } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', payload.new.user_id).single()
            setMessages(prev => [...prev, { ...payload.new, profiles: user }])
            scrollToBottom()
          }
        }
      )
      .subscribe()
  }

  const scrollToBottom = () => setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeChannel) return
    
    const content = newMessage
    setNewMessage('')

    await supabase.from('chat_messages').insert([{
      club_id: activeChannel.clubId,
      group_id: activeChannel.realId,
      user_id: currentUserId,
      content
    }])
  }

  const stringToColor = (string) => {
    let hash = 0; for (let i = 0; i < string.length; i++) hash = string.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#'; for (let i = 0; i < 3; i++) color += `00${(hash >> (i * 8) & 0xff).toString(16)}`.slice(-2);
    return color;
  }

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ mt: 2, height: '80vh' }}>
        <Paper sx={{ height: '100%', display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid #e0e0e0' }}>
          
          {/* [왼쪽] 채팅방 목록 (30%) */}
          <Box sx={{ width: { xs: '80px', md: '300px' }, borderRight: '1px solid #eee', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2.5, borderBottom: '1px solid #eee', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ChatIcon color="primary" /> {t('chat_page.my_chat')} 
              </Typography>
            </Box>
            
            <List sx={{ flexGrow: 1, overflowY: 'auto' }}>
              {loading ? (
                // [NEW] 로딩 스켈레톤 UI
                Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ p: 2, display: 'flex', gap: 2 }}>
                    <Skeleton variant="circular" width={40} height={40} />
                    <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }}>
                      <Skeleton width="60%" />
                      <Skeleton width="40%" />
                    </Box>
                  </Box>
                ))
              ) : (
                channels.map((ch) => (
                  <ListItemButton 
                    key={ch.id} 
                    selected={activeChannel?.id === ch.id}
                    onClick={() => handleEnterRoom(ch)}
                    sx={{ 
                      py: 1.5, 
                      '&.Mui-selected': { bgcolor: 'white', borderLeft: '4px solid #4F46E5' },
                      justifyContent: { xs: 'center', md: 'flex-start' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: ch.type === 'general' ? '#4F46E5' : '#7C3AED', color: 'white' }}>
                        {ch.type === 'general' ? <Public fontSize="small" /> : <Groups fontSize="small" />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={ch.name} 
                      secondary={ch.type === 'group' ? t('chat_page.small_group') : t('chat_page.all')} 
                      primaryTypographyProps={{ fontWeight: 'bold', noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true, fontSize: '0.75rem' }}
                      sx={{ display: { xs: 'none', md: 'block' } }}
                    />
                  </ListItemButton>
                ))
              )}
            </List>
          </Box>

          {/* [오른쪽] 채팅 화면 (70%) */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
            {activeChannel ? (
              <>
                {/* 채팅방 헤더 */}
                <Box sx={{ p: 2, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {activeChannel.type === 'general' ? <Public fontSize="small" color="action"/> : <Groups fontSize="small" color="action"/>}
                      {activeChannel.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {activeChannel.type === 'group' ? `${activeChannel.clubName} > ${t('chat_page.small_group')}` : activeChannel.clubName} 
                    </Typography>
                  </Box>
                  <Chip label={t('chat.badge_live')} color="success" size="small" variant="filled" /> 
                </Box>

                {/* 메시지 리스트 */}
                <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {messages.map((msg, idx) => {
                    const isMe = msg.user_id === currentUserId
                    const name = msg.profiles?.full_name || msg.profiles?.username || t('chat.unknown_user') 
                    const isSequence = idx > 0 && messages[idx - 1].user_id === msg.user_id

                    return (
                      <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 1, mt: isSequence ? 0 : 1 }}>
                        {!isMe && (
                          <Box sx={{ width: 32 }}>
                            {!isSequence && <Avatar src={msg.profiles?.avatar_url} sx={{ width: 32, height: 32, bgcolor: stringToColor(name), fontSize: '0.8rem' }}>{name[0]}</Avatar>}
                          </Box>
                        )}
                        <Box sx={{ maxWidth: '65%' }}>
                          {!isMe && !isSequence && <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{name}</Typography>}
                          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 3, bgcolor: isMe ? '#4F46E5' : 'white', color: isMe ? 'white' : 'text.primary', border: isMe ? 'none' : '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.5 }}>{msg.content}</Typography>
                          </Paper>
                        </Box>
                      </Box>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </Box>

                {/* 입력창 */}
                <Box component="form" onSubmit={handleSend} sx={{ p: 2, borderTop: '1px solid #eee' }}>
                  <Stack direction="row" spacing={1}>
                    <TextField fullWidth size="small" placeholder={t('chat.input_placeholder')} value={newMessage} onChange={e => setNewMessage(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 5, bgcolor: '#f8fafc' } }} /> 
                    <IconButton type="submit" color="primary" disabled={!newMessage.trim()} sx={{ bgcolor: '#eef2ff', '&:hover':{bgcolor:'#e0e7ff'} }}><Send /></IconButton>
                  </Stack>
                </Box>
              </>
            ) : (
              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Typography>{t('chat_page.select_room')}</Typography> 
              </Box>
            )}
          </Box>

        </Paper>
      </Container>
    </Layout>
  )
}