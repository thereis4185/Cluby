import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, TextField, Button, Paper, Typography, Avatar, Stack, Divider, Alert,
  IconButton, Select, MenuItem, FormControl, InputLabel, Card
} from '@mui/material'
import { Save, CloudUpload, Image, Add, Delete, Assignment } from '@mui/icons-material'
import { useTranslation } from 'react-i18next' // [추가]

export default function ClubSettingsTab({ clubId }) {
  const { t } = useTranslation() // [추가]
  const [name, setName] = useState('')
  const [shortIntro, setShortIntro] = useState('')
  const [iconUrl, setIconUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const [formQuestions, setFormQuestions] = useState([])

  useEffect(() => {
    fetchClubData()
    fetchFormStructure()
  }, [clubId])

  const fetchClubData = async () => {
    const { data } = await supabase.from('clubs').select('name, short_intro, icon_url').eq('id', clubId).single()
    if (data) {
      setName(data.name)
      setShortIntro(data.short_intro || '')
      setIconUrl(data.icon_url || '')
    }
  }

  const fetchFormStructure = async () => {
    const { data } = await supabase.from('club_application_forms').select('form_structure').eq('club_id', clubId).maybeSingle()
    if (data) setFormQuestions(data.form_structure || [])
  }

  // --- 기본 정보 핸들러 ---
  const handleSave = async () => {
    if (!name.trim()) return alert(t('club.settings.alert_input_name')) // [수정]
    
    const { error } = await supabase.from('clubs').update({
      name,
      short_intro: shortIntro,
      icon_url: iconUrl
    }).eq('id', clubId)

    if (error) alert('Error: ' + error.message)
    else {
      alert(t('club.settings.msg_saved')) // [수정]
      window.location.reload()
    }
  }

  const handleIconUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true)
    try {
      const filePath = `club_icons/${clubId}_${Date.now()}`
      await supabase.storage.from('club_files').upload(filePath, file)
      const { data } = supabase.storage.from('club_files').getPublicUrl(filePath)
      setIconUrl(data.publicUrl)
    } catch (err) {
      alert('Error')
    }
    setUploading(false)
  }

  // --- 신청서 양식 핸들러 ---
  const addQuestion = () => {
    setFormQuestions([...formQuestions, { id: Date.now(), question: '', type: 'text', required: true }])
  }

  const removeQuestion = (id) => {
    setFormQuestions(formQuestions.filter(q => q.id !== id))
  }

  const updateQuestion = (id, field, value) => {
    setFormQuestions(formQuestions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const handleSaveForm = async () => {
    const { error } = await supabase.from('club_application_forms').upsert({ 
      club_id: clubId, 
      form_structure: formQuestions 
    }, { onConflict: 'club_id' }) 
    
    if (error) alert('Error: ' + error.message)
    else alert(t('club.settings.msg_form_saved')) // [수정]
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      
      {/* 1. 기본 정보 설정 */}
      <Paper sx={{ p: 4, borderRadius: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>{t('club.settings.basic_info_title')}</Typography> {/* [수정] */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {t('club.settings.basic_info_desc')} {/* [수정] */}
        </Typography>

        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={iconUrl} sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd' }}>
              <Image />
            </Avatar>
            <Box>
              <Button component="label" variant="outlined" startIcon={<CloudUpload />} disabled={uploading}>
                {t('club.settings.change_icon')} {/* [수정] */}
                <input type="file" hidden accept="image/*" onChange={handleIconUpload} />
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: '#888' }}>
                {t('club.settings.icon_guide')} {/* [수정] */}
              </Typography>
            </Box>
          </Box>

          <TextField 
            label={t('club.settings.label_club_name')} fullWidth value={name} onChange={e => setName(e.target.value)} // [수정]
          />
          <TextField 
            label={t('club.settings.label_short_intro')} fullWidth multiline rows={2} value={shortIntro} onChange={e => setShortIntro(e.target.value)} // [수정]
            placeholder={t('club.settings.placeholder_short_intro')} helperText={t('club.settings.helper_short_intro')} // [수정]
          />

          <Button variant="contained" size="large"  onClick={handleSave}>
            {t('club.settings.btn_save_basic')} {/* [수정] */}
          </Button>
        </Stack>
      </Paper>

      {/* 2. 가입 신청서 양식 설정 */}
      <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" /> {t('club.settings.form_title')} {/* [수정] */}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('club.settings.form_desc')} {/* [수정] */}
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<Add />} onClick={addQuestion}>{t('club.settings.add_question')}</Button> {/* [수정] */}
        </Box>

        <Stack spacing={2}>
          {formQuestions.length === 0 && (
            <Typography align="center" color="text.secondary" sx={{ py: 4, bgcolor: 'white', borderRadius: 2, border: '1px dashed #ccc' }}>
              {t('club.settings.no_questions')} {/* [수정] */}
            </Typography>
          )}

          {formQuestions.map((q, index) => (
            <Card key={q.id} sx={{ p: 2, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Typography sx={{ pt: 2, fontWeight: 'bold', color: '#999' }}>Q{index + 1}</Typography>
                
                <TextField 
                  label={t('club.settings.label_question')} 
                  fullWidth size="small"
                  value={q.question} 
                  onChange={e => updateQuestion(q.id, 'question', e.target.value)} 
                />
                
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>{t('club.settings.label_type')}</InputLabel> {/* [수정] */}
                  <Select value={q.type} label={t('club.settings.label_type')} onChange={e => updateQuestion(q.id, 'type', e.target.value)}>
                    <MenuItem value="text">{t('club.settings.type_text')}</MenuItem> {/* [수정] */}
                    <MenuItem value="textarea">{t('club.settings.type_textarea')}</MenuItem> {/* [수정] */}
                    <MenuItem value="checkbox">{t('club.settings.type_checkbox')}</MenuItem> {/* [수정] */}
                  </Select>
                </FormControl>

                <IconButton color="error" onClick={() => removeQuestion(q.id)}>
                  <Delete />
                </IconButton>
              </Stack>
            </Card>
          ))}

          <Divider sx={{ my: 2 }} />
          
          <Button variant="contained" color="primary" size="large"  onClick={handleSaveForm} disabled={formQuestions.length === 0}>
            {t('club.settings.btn_save_form')} {/* [수정] */}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}