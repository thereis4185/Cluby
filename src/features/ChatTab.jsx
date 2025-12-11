import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Paper, Typography, List, ListItemButton, ListItemText, 
  TextField, IconButton, Avatar, Chip, useMediaQuery, useTheme
} from '@mui/material'
import { Send, Public, Groups, Chat as ChatIcon, ArrowBack } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function ChatTab({ clubId, currentUserId }) {
  const { t, i18n } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md')) 

  const [channels, setChannels] = useState([])
  const [activeChannel, setActiveChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  const [myProfile, setMyProfile] = useState(null)

  // 0. 프로필 로드
  useEffect(() => {
    const getProfile = async () => {
      const { data } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', currentUserId).single()
      if (data) setMyProfile(data)
    }
    if (currentUserId) getProfile()
  }, [currentUserId])

  // 1. 채널 목록 로드
  useEffect(() => {
    const fetchMyChannels = async () => {
      const { data: myGroups } = await supabase.from('group_members').select('group_id, groups!inner(name, club_id)').eq('user_id', currentUserId).eq('groups.club_id', clubId)
      const groupChannels = myGroups?.map(g => ({ id: g.group_id, name: `${g.groups.name}`, type: 'group' })) || []
      
      const generalChat = { id: 'general', name: t('chat.general_chat'), type: 'general' }
      setChannels([generalChat, ...groupChannels])
      
      if (!isMobile) {
        setActiveChannel(prev => prev || generalChat)
      }
    }
    if (currentUserId && clubId) fetchMyChannels()
  }, [clubId, currentUserId, t, isMobile])

  // 2. 메시지 로드 & 구독
  useEffect(() => {
    if (!activeChannel) return
    const fetchMessages = async () => {
      let query = supabase.from('chat_messages').select('*, profiles(username, full_name, avatar_url)').eq('club_id', clubId).order('created_at', { ascending: true })
      if (activeChannel.type === 'general') query = query.is('group_id', null)
      else query = query.eq('group_id', activeChannel.id)
      const { data } = await query; if (data) { setMessages(data); scrollToBottom() }
    }
    fetchMessages()
    const channel = supabase.channel(`chat:${clubId}:${activeChannel.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `club_id=eq.${clubId}` }, async (payload) => {
      if (payload.new.user_id === currentUserId) return 
      const isGeneral = activeChannel.type === 'general' && payload.new.group_id === null
      const isGroup = activeChannel.type === 'group' && payload.new.group_id === activeChannel.id
      if (isGeneral || isGroup) {
        const { data: userProfile } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', payload.new.user_id).single()
        setMessages(prev => [...prev, { ...payload.new, profiles: userProfile }])
        scrollToBottom()
      }
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeChannel, clubId, currentUserId])

  const scrollToBottom = () => { setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100) }

  const handleSend = async (e) => {
    e.preventDefault(); if (!newMessage.trim()) return
    const groupId = activeChannel.type === 'general' ? null : activeChannel.id
    const content = newMessage; setNewMessage('')
    const tempMsg = { id: Date.now(), club_id: clubId, group_id: groupId, user_id: currentUserId, content: content, created_at: new Date().toISOString(), profiles: myProfile }
    setMessages(prev => [...prev, tempMsg]); scrollToBottom()
    await supabase.from('chat_messages').insert([{ club_id: clubId, group_id: groupId, user_id: currentUserId, content: content }])
  }

  const stringToColor = (string) => { let hash = 0; for (let i = 0; i < string.length; i++) hash = string.charCodeAt(i) + ((hash << 5) - hash); let color = '#'; for (let i = 0; i < 3; i++) color += `00${(hash >> (i * 8) & 0xff).toString(16)}`.slice(-2); return color; }

  const showList = !isMobile || !activeChannel
  const showRoom = !isMobile || activeChannel

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: { xs: 'calc(100vh - 180px)', md: '70vh' }, gap: 2 }}>
      
      {/* 1. 채팅 목록 패널 */}
      {showList && (
        <Paper sx={{ width: { xs: '100%', md: '30%' }, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 3, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eee' }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon color="primary" /> {t('chat.list_title')}
            </Typography>
          </Box>
          <List sx={{ flex: 1, overflowY: 'auto' }}>
            {channels.map((channel) => (
              <ListItemButton 
                key={channel.id} 
                selected={activeChannel?.id === channel.id}
                onClick={() => setActiveChannel(channel)}
                sx={{ '&.Mui-selected': { bgcolor: '#eef2ff', borderRight: '4px solid #4F46E5' }, py: 2 }}
              >
                <Avatar sx={{ bgcolor: channel.type === 'general' ? '#4F46E5' : '#F59E0B', width: 36, height: 36, mr: 1.5 }}>
                  {channel.type === 'general' ? <Public fontSize="small" /> : <Groups fontSize="small" />}
                </Avatar>
                <ListItemText primary={channel.name} primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.95rem' }} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}

      {/* 2. 채팅방 패널 */}
      {showRoom && (
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
          {activeChannel ? (
            <>
              {/* 헤더 */}
              <Box sx={{ p: 1.5, borderBottom: '1px solid #eee', bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isMobile && (
                    <IconButton onClick={() => setActiveChannel(null)} size="small">
                      <ArrowBack />
                    </IconButton>
                  )}
                  <Typography variant="subtitle1" fontWeight="bold" noWrap sx={{ maxWidth: { xs: 150, md: 300 } }}>
                    {activeChannel.name}
                  </Typography>
                </Box>
                <Chip label={t('chat.badge_live')} color="success" size="small" variant="filled" sx={{ height: 20, fontSize: '0.7rem' }} />
              </Box>

              {/* 메시지 영역 */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {messages.map((msg, idx) => {
                  const isMe = msg.user_id === currentUserId
                  const displayName = msg.profiles?.full_name || msg.profiles?.username || t('chat.unknown_user')
                  
                  // [NEW] 날짜 구분선 로직
                  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }
                  const currentDate = new Date(msg.created_at).toLocaleDateString(i18n.language, dateOptions)
                  const prevDate = idx > 0 ? new Date(messages[idx-1].created_at).toLocaleDateString(i18n.language, dateOptions) : null
                  const showDate = currentDate !== prevDate

                  return (
                    <Box key={msg.id}>
                      {/* [NEW] 날짜가 바뀌면 날짜 칩 표시 */}
                      {showDate && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                          <Chip label={currentDate} size="small" sx={{ bgcolor: '#e2e8f0', color: '#64748b', fontSize: '0.75rem', fontWeight: 500 }} />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 1 }}>
                        {!isMe && ( <Avatar src={msg.profiles?.avatar_url} sx={{ bgcolor: stringToColor(displayName), width: 32, height: 32, mt: 0.5, fontSize: '0.8rem' }}>{displayName[0]}</Avatar> )}
                        <Box sx={{ maxWidth: '75%' }}>
                          {!isMe && <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{displayName}</Typography>}
                          <Paper elevation={0} sx={{ p: 1.2, px: 1.8, borderRadius: 3, bgcolor: isMe ? '#4F46E5' : 'white', color: isMe ? 'white' : 'text.primary', border: isMe ? 'none' : '1px solid #e2e8f0', borderTopLeftRadius: !isMe ? 0 : 12, borderTopRightRadius: isMe ? 0 : 12 }}>
                            <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.content}</Typography>
                          </Paper>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: isMe ? 'right' : 'left', mt: 0.2, fontSize: '0.65rem' }}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )
                })}
                <div ref={messagesEndRef} />
              </Box>

              {/* 입력창 */}
              <Box component="form" onSubmit={handleSend} sx={{ p: 1.5, bgcolor: 'white', borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
                <TextField fullWidth size="small" placeholder={t('chat.input_placeholder')} value={newMessage} onChange={e => setNewMessage(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 20, bgcolor: '#f8fafc' } }} />
                <IconButton type="submit" color="primary" disabled={!newMessage.trim()} sx={{ bgcolor: '#eef2ff', '&:hover':{bgcolor:'#e0e7ff'} }}><Send /></IconButton>
              </Box>
            </>
          ) : (
             <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                <Typography>{t('chat_page.select_room')}</Typography>
             </Box>
          )}
        </Paper>
      )}
    </Box>
  )
}