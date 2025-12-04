import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Button, Paper, TextField, Stack, Fade
} from '@mui/material'
import { Edit, Save } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function ClubHomeTab({ clubData, isManager, refreshClubInfo }) {
  const { t } = useTranslation() // [추가]
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    if (clubData) {
      setEditTitle(clubData.intro_title || '')
      setEditContent(clubData.intro_content || '')
    }
  }, [clubData])

  const handleSave = async () => {
    const { error } = await supabase.from('clubs').update({
      intro_title: editTitle,
      intro_content: editContent
    }).eq('id', clubData.id)
    
    if (error) alert(t('club.home_tab.save_fail'))
    else { 
      setIsEditing(false)
      refreshClubInfo()
    }
  }

  if (!clubData) return null

  return (
    <Fade in={true}>
      <Box sx={{ position: 'relative', mx: 'auto' }}>
        
        {/* 편집 버튼 (우측 상단) */}
        {isManager && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            {isEditing ? (
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setIsEditing(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave}>
                  {t('common.save')}
                </Button>
              </Stack>
            ) : (
              <Button variant="text" startIcon={<Edit />} onClick={() => setIsEditing(true)}>
                {t('club.home_tab.edit_intro')}
              </Button>
            )}
          </Box>
        )}

        {/* 본문 내용 */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #eee', minHeight: 300, bgcolor: isEditing ? '#fff' : '#fff' }}>
          {isEditing ? (
            <Stack spacing={4}>
              <TextField 
                label={t('club.home_tab.label_headline')} 
                fullWidth 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                variant="standard" 
                placeholder={t('club.home_tab.placeholder_headline')} 
                inputProps={{ style: { fontSize: '1.5rem', fontWeight: 'bold' } }} 
              />
              <TextField 
                label={t('club.home_tab.label_content')} 
                fullWidth 
                multiline 
                rows={15} 
                value={editContent} 
                onChange={e => setEditContent(e.target.value)} 
                placeholder={t('club.home_tab.placeholder_content')} 
              />
            </Stack>
          ) : (
            <>
              <Typography variant="h5" fontWeight="bold" gutterBottom color="text.primary" sx={{ mb: 3 }}>
                {clubData.intro_title || t('club.home_tab.welcome_fallback')}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#4b5563', fontSize: '1.1rem' }}>
                {clubData.intro_content || t('club.home_tab.content_fallback')}
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Fade>
  )
}