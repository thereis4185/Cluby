import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Paper, Chip, Button, TextField, Stack, Fade, IconButton, 
  Card, CardContent 
} from '@mui/material'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { format } from 'date-fns'
import { ko, ja } from 'date-fns/locale' 
import { 
  LockClock, Delete, CalendarMonth, AddCircleOutline, LocationOn, 
  ArrowForward, AccessTime
} from '@mui/icons-material'
import { useTranslation } from 'react-i18next' 

export default function CalendarTab({ clubId, currentUserId, isAdmin, onNavigateToBoard }) {
  const { t, i18n } = useTranslation() 
  const [date, setDate] = useState(new Date())
  const [activityEvents, setActivityEvents] = useState([]) 
  const [adminEvents, setAdminEvents] = useState([]) 
  const [schedTitle, setSchedTitle] = useState('')
  const [schedTime, setSchedTime] = useState('')

  const dateLocale = i18n.language === 'ja' ? ja : ko;

  useEffect(() => {
    if (clubId) {
      fetchActivities()
      if (isAdmin) fetchAdminSchedules()
    }
  }, [clubId, isAdmin])

  const fetchActivities = async () => {
    let myGroupIds = []
    if (currentUserId) {
      const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', currentUserId)
      myGroupIds = myGroups?.map(g => g.group_id) || []
    }

    // [수정] activity_time 추가 조회
    const { data } = await supabase.from('posts')
      .select(`id, title, activity_date, activity_time, location, group_id, groups(name)`)
      .eq('club_id', clubId)
      .eq('post_type', 'activity')
      .not('activity_date', 'is', null)

    const filtered = data?.filter(p => {
      if (isAdmin) return true
      if (!p.group_id) return true 
      return myGroupIds.includes(p.group_id)
    }) || []

    setActivityEvents(filtered)
  }

  const fetchAdminSchedules = async () => {
    const { data } = await supabase.from('schedules').select('*').eq('club_id', clubId)
    if (data) setAdminEvents(data)
  }

  const handleAddAdminSchedule = async () => {
    if (!schedTitle) return alert(t('calendar.alert_input_title'))
    const dateStr = format(date, 'yyyy-MM-dd')
    const { error } = await supabase.from('schedules').insert([{
      club_id: clubId, title: schedTitle, start_date: dateStr, location: schedTime
    }])
    if (error) alert('Error: ' + error.message)
    else { setSchedTitle(''); setSchedTime(''); fetchAdminSchedules() }
  }

  const handleDeleteAdminSchedule = async (id) => {
    if(!confirm(t('common.confirm_delete'))) return 
    await supabase.from('schedules').delete().eq('id', id)
    fetchAdminSchedules()
  }

  const isSameDay = (date1Str, date2Str) => {
    if (!date1Str || !date2Str) return false
    return date1Str.split('T')[0] === date2Str.split('T')[0]
  }

  const selectedDateStr = format(date, 'yyyy-MM-dd')
  const selectedDateDisplay = format(date, 'M/d (eee)', { locale: dateLocale })

  // [수정] 시간순 정렬 로직 추가
  const todayActivities = activityEvents
    .filter(e => isSameDay(e.activity_date, selectedDateStr))
    .sort((a, b) => {
       // 시간이 없으면 뒤로, 있으면 시간순 비교
       if (!a.activity_time) return 1;
       if (!b.activity_time) return -1;
       return a.activity_time.localeCompare(b.activity_time);
    })

  const todayAdminSchedules = adminEvents.filter(e => isSameDay(e.start_date, selectedDateStr))

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const d = format(date, 'yyyy-MM-dd')
      const hasActivity = activityEvents.some(e => isSameDay(e.activity_date, d))
      const hasAdmin = adminEvents.some(e => isSameDay(e.start_date, d))
      return (
        <Box sx={{ display:'flex', justifyContent:'center', gap: 0.5, mt: 0.5 }}>
          {hasActivity && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4F46E5' }} />}
          {hasAdmin && <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#db2777' }} />}
        </Box>
      )
    }
  }

  return (
    <Stack 
      direction={{ xs: 'column', md: 'row' }} 
      spacing={3} 
      sx={{ height: { xs: 'auto', md: '65vh' }, minHeight: { md: '500px' } }} 
    >
      
      {/* 캘린더 영역 */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ 
          flex: 1, p: 3, borderRadius: 3, 
          display:'flex', flexDirection:'column', justifyContent:'center', 
          bgcolor: 'white',
          height: '100%', 
          overflowY: 'auto' 
        }}
      >
        <style>{`.custom-calendar { width: 100%; border: none; font-family: inherit; } .react-calendar__tile--active { background: #4F46E5 !important; color: white; borderRadius: 8px; } .react-calendar__tile--now { background: #eef2ff; color: #4F46E5; borderRadius: 8px; } .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background: #f3f4f6; borderRadius: 8px; }`}</style>
        <Calendar onChange={setDate} value={date} tileContent={tileContent} formatDay={(locale, date) => format(date, 'd')} calendarType="gregory" className="custom-calendar" locale={i18n.language} />
        <Stack direction="row" spacing={3} sx={{ mt: 3, justifyContent: 'center', pt: 2, borderTop:'1px solid #f1f5f9', flexShrink: 0 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap:1, fontSize:'0.85rem', fontWeight: 600, color:'#475569' }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4F46E5' }} /> {t('calendar.legend_activity')}</Box> 
          {isAdmin && <Box sx={{ display:'flex', alignItems:'center', gap:1, fontSize:'0.85rem', fontWeight: 600, color:'#475569' }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#db2777' }} /> {t('calendar.legend_admin')}</Box>} 
        </Stack>
      </Paper>

      {/* 일정 상세 영역 */}
      <Paper 
        elevation={0} 
        variant="outlined" 
        sx={{ 
          flex: 1, p: 4, borderRadius: 3, bgcolor: '#f8fafc', 
          display: 'flex', flexDirection: 'column',
          height: '100%', 
          overflow: 'hidden' 
        }}
      >
        <Typography variant="h5" fontWeight="900" color="text.primary" sx={{ mb: 3, flexShrink: 0 }}>
          {selectedDateDisplay}
        </Typography>

        <Stack 
          spacing={2} 
          sx={{ 
            flex: 1, 
            overflowY: 'auto', 
            minHeight: 0,
            pr: 1, 
            pb: 1 
          }}
        >
          {todayActivities.length === 0 && todayAdminSchedules.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: '#94a3b8' }}>
              <CalendarMonth sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
              <Typography fontWeight={500}>{t('calendar.no_events')}</Typography> 
            </Box>
          )}

          {/* 활동 카드 */}
          {todayActivities.map(ev => (
            <Fade in key={ev.id}>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 4, 
                  border: '1px solid #e2e8f0',
                  bgcolor: 'white',
                  flexShrink: 0, 
                  transition: 'border-color 0.2s',
                }}
              >
                <CardContent sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: '16px !important' }}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      {/* [추가] 시간 배지 */}
                      {ev.activity_time && (
                         <Chip label={ev.activity_time} size="small" icon={<AccessTime sx={{fontSize:12}}/>} sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }} />
                      )}
                      <Chip 
                        label={ev.group_id ? ev.groups?.name : t('board.general_notice')} 
                        size="small" 
                        sx={{ 
                          bgcolor: ev.group_id ? '#fff7ed' : '#f3e8ff', 
                          color: ev.group_id ? '#c2410c' : '#6b21a8', 
                          fontWeight: 'bold', borderRadius: 1.5, height: 20, fontSize: '0.7rem'
                        }} 
                      />
                    </Stack>
                    
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#1e293b', mt: 0.5 }}>
                        {ev.title}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      {ev.location && (
                        <Typography variant="body2" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem' }}>
                          <LocationOn sx={{ fontSize: 14 }} /> {ev.location}
                        </Typography>
                      )}
                    </Stack>
                  </Box>

                  <IconButton 
                    size="small" 
                    onClick={() => onNavigateToBoard(ev.group_id, ev.id)}
                    sx={{ color: '#94a3b8', '&:hover': { color: '#4F46E5', bgcolor: '#eef2ff' } }}
                  >
                    <ArrowForward fontSize="small" />
                  </IconButton>
                </CardContent>
              </Card>
            </Fade>
          ))}

          {/* 운영진 일정 카드 */}
          {isAdmin && todayAdminSchedules.map(ev => (
            <Fade in key={ev.id}>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 4, border: '1px solid #fecdd3', bgcolor: '#fff',
                  flexShrink: 0 
                }}
              >
                <CardContent sx={{ p: 2, display:'flex', justifyContent:'space-between', alignItems:'flex-start', pb: '16px !important' }}>
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Chip label={t('calendar.badge_admin')} size="small" sx={{ bgcolor: '#fce7f3', color: '#be185d', fontWeight: 'bold', height: 20, fontSize: '0.7rem' }} /> 
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#be185d' }}>{ev.title}</Typography>
                    </Stack>
                    {ev.location && (
                      <Typography variant="body2" sx={{ color: '#be185d', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontSize: '0.85rem' }}>
                        {ev.location}
                      </Typography>
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => handleDeleteAdminSchedule(ev.id)} sx={{ color: '#db2777', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: '#fce7f3' } }}>
                    <Delete fontSize="small"/>
                  </IconButton>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Stack>

        {/* 운영진 일정 추가 폼 (기존과 동일) */}
        {isAdmin && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '2px dashed #e2e8f0', flexShrink: 0 }}>
             <Typography variant="subtitle2" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5, display:'flex', alignItems:'center', gap:1 }}>
               {t('calendar.add_admin_schedule')} 
             </Typography>
             <Stack direction="row" spacing={1}>
                <TextField 
                  size="small" 
                  placeholder={t('calendar.placeholder_title')} 
                  value={schedTitle} 
                  onChange={e => setSchedTitle(e.target.value)} 
                  fullWidth 
                  sx={{ bgcolor:'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
                />
                <TextField 
                  size="small" 
                  placeholder={t('calendar.placeholder_time')} 
                  value={schedTime} 
                  onChange={e => setSchedTime(e.target.value)} 
                  sx={{ width: '40%', bgcolor:'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} 
                />
                <IconButton 
                  color="primary" 
                  onClick={handleAddAdminSchedule} 
                  sx={{ bgcolor: '#4F46E5', color: 'white', borderRadius: 2, '&:hover': { bgcolor: '#4338ca' } }}
                >
                  <AddCircleOutline />
                </IconButton>
             </Stack>
          </Box>
        )}
      </Paper>
    </Stack>
  )
}