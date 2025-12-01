import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Paper, Typography, List, ListItemButton, ListItemText, 
  TextField, IconButton, Avatar, Chip
} from '@mui/material'
import { Send, Public, Workspaces, Groups, Chat as ChatIcon } from '@mui/icons-material'

export default function ChatTab({ clubId, currentUserId }) {
  const [channels, setChannels] = useState([{ id: 'general', name: '전체 채팅', type: 'general' }])
  const [activeChannel, setActiveChannel] = useState(channels[0])
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  const [myProfile, setMyProfile] = useState(null)

  // 0. 내 프로필 정보 (이름 포함해서 가져오기)
  useEffect(() => {
    const getProfile = async () => {
      // [수정] full_name 추가 조회
      const { data } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', currentUserId).single()
      if (data) setMyProfile(data)
    }
    if (currentUserId) getProfile()
  }, [currentUserId])

  // 1. 채널 목록
  useEffect(() => {
    const fetchMyChannels = async () => {
      const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(name, club_id)')
        .eq('user_id', currentUserId)
        .eq('groups.club_id', clubId)

      const groupChannels = myGroups?.map(g => ({ 
        id: g.group_id, 
        name: `${g.groups.name}`, 
        type: 'group' 
      })) || []

      setChannels([{ id: 'general', name: '전체 채팅', type: 'general' }, ...groupChannels])
      setActiveChannel({ id: 'general', name: '전체 채팅', type: 'general' })
    }
    if (currentUserId && clubId) fetchMyChannels()
  }, [clubId, currentUserId])

  // 2. 메시지 로딩 & 실시간 구독
  useEffect(() => {
    if (!activeChannel) return

    const fetchMessages = async () => {
      let query = supabase.from('chat_messages')
        // [수정] profiles(username, full_name, avatar_url) -> 이름 추가 조회
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('club_id', clubId)
        .order('created_at', { ascending: true })

      if (activeChannel.type === 'general') {
        query = query.is('group_id', null)
      } else {
        query = query.eq('group_id', activeChannel.id)
      }
      
      const { data } = await query
      if (data) {
        setMessages(data)
        scrollToBottom()
      }
    }
    fetchMessages()

    const channel = supabase
      .channel(`chat:${clubId}:${activeChannel.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `club_id=eq.${clubId}` 
        }, 
        async (payload) => {
          if (payload.new.user_id === currentUserId) return 

          const isGeneral = activeChannel.type === 'general' && payload.new.group_id === null
          const isGroup = activeChannel.type === 'group' && payload.new.group_id === activeChannel.id
          
          if (isGeneral || isGroup) {
            // [수정] 실시간 메시지 수신 시에도 이름(full_name) 가져오기
            const { data: userProfile } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', payload.new.user_id).single()
            const newMsg = { ...payload.new, profiles: userProfile }
            setMessages(prev => [...prev, newMsg])
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChannel, clubId, currentUserId])

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 100)
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const groupId = activeChannel.type === 'general' ? null : activeChannel.id
    const content = newMessage
    setNewMessage('')

    const tempMsg = {
      id: Date.now(),
      club_id: clubId,
      group_id: groupId,
      user_id: currentUserId,
      content: content,
      created_at: new Date().toISOString(),
      profiles: myProfile
    }
    setMessages(prev => [...prev, tempMsg])
    scrollToBottom()

    await supabase.from('chat_messages').insert([{
      club_id: clubId,
      group_id: groupId,
      user_id: currentUserId,
      content: content
    }])
  }

  const stringToColor = (string) => {
    let hash = 0;
    for (let i = 0; i < string.length; i += 1) hash = string.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i += 1) color += `00${(hash >> (i * 8) & 0xff).toString(16)}`.slice(-2);
    return color;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, height: '70vh', gap: 2 }}>
      
      {/* 왼쪽: 목록 */}
      <Paper sx={{ width: { xs: '100%', md: '30%' }, overflow: 'auto', border: '1px solid #e0e0e0', borderRadius: 3 }}>
        <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #eee' }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ChatIcon color="primary" /> 채팅 목록
          </Typography>
        </Box>
        <List>
          {channels.map((channel) => (
            <ListItemButton 
              key={channel.id} 
              selected={activeChannel.id === channel.id}
              onClick={() => setActiveChannel(channel)}
              sx={{ '&.Mui-selected': { bgcolor: '#eef2ff', borderRight: '4px solid #4F46E5' } }}
            >
              <Avatar sx={{ bgcolor: channel.type === 'general' ? '#4F46E5' : '#F59E0B', width: 32, height: 32, mr: 1.5 }}>
                {channel.type === 'general' ? <Public fontSize="small" /> : <Groups fontSize="small" />}
              </Avatar>
              <ListItemText primary={channel.name} primaryTypographyProps={{ fontWeight: 'bold', fontSize: '0.9rem' }} />
            </ListItemButton>
          ))}
        </List>
      </Paper>

      {/* 오른쪽: 대화창 */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 3, border: '1px solid #e0e0e0', overflow: 'hidden' }}>
        
        <Box sx={{ p: 2, borderBottom: '1px solid #eee', bgcolor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">{activeChannel.name}</Typography>
          <Chip label="실시간" color="success" size="small" variant="outlined" />
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, bgcolor: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.map((msg) => {
            const isMe = msg.user_id === currentUserId
            // [수정] 이름 표시 로직: full_name이 있으면 쓰고, 없으면 username(아이디) 사용
            const displayName = msg.profiles?.full_name || msg.profiles?.username || '알 수 없음'
            
            return (
              <Box key={msg.id} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 1.5 }}>
                {!isMe && (
                  <Avatar src={msg.profiles?.avatar_url} sx={{ bgcolor: stringToColor(displayName), width: 36, height: 36 }}>
                    {displayName[0]}
                  </Avatar>
                )}
                <Box sx={{ maxWidth: '70%' }}>
                  {/* [수정] 이름 표시 */}
                  {!isMe && <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>{displayName}</Typography>}
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 1.5, px: 2, borderRadius: 4, 
                      bgcolor: isMe ? '#4F46E5' : 'white', 
                      color: isMe ? 'white' : 'text.primary',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      borderTopLeftRadius: !isMe ? 0 : 16,
                      borderTopRightRadius: isMe ? 0 : 16
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                  </Paper>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: isMe ? 'right' : 'left', mt: 0.5, fontSize: '0.7rem' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Box>
            )
          })}
          <div ref={messagesEndRef} />
        </Box>

        <Box component="form" onSubmit={handleSend} sx={{ p: 2, bgcolor: 'white', borderTop: '1px solid #eee', display: 'flex', gap: 1 }}>
          <TextField 
            fullWidth size="small" placeholder="메시지를 입력하세요..." 
            value={newMessage} onChange={e => setNewMessage(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 20 } }}
          />
          <IconButton type="submit" color="primary" disabled={!newMessage.trim()} sx={{ bgcolor: '#eef2ff', '&:hover':{bgcolor:'#e0e7ff'} }}>
            <Send />
          </IconButton>
        </Box>

      </Paper>
    </Box>
  )
}