import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, TextField, Button, Paper, Typography, Avatar, Stack, Divider, Alert,
  IconButton, Select, MenuItem, FormControl, InputLabel, Card
} from '@mui/material'
import { Save, CloudUpload, Image, Add, Delete, Assignment } from '@mui/icons-material'

export default function ClubSettingsTab({ clubId }) {
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
    if (!name.trim()) return alert('동아리 이름을 입력해주세요.')
    
    const { error } = await supabase.from('clubs').update({
      name,
      short_intro: shortIntro,
      icon_url: iconUrl
    }).eq('id', clubId)

    if (error) alert('저장 실패: ' + error.message)
    else {
      alert('동아리 정보가 수정되었습니다.')
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
      alert('이미지 업로드 실패')
    }
    setUploading(false)
  }

  // --- 신청서 양식 핸들러 ---
  const addQuestion = () => {
    setFormQuestions([...formQuestions, { id: Date.now(), label: '', type: 'text', required: true }])
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
    })
    
    if (error) alert('양식 저장 실패: ' + error.message)
    else alert('가입 신청서 양식이 저장되었습니다.')
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      
      {/* 1. 기본 정보 설정 */}
      <Paper sx={{ p: 4, borderRadius: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>기본 정보 설정</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          홈 화면과 검색 결과에 노출되는 정보를 수정합니다.
        </Typography>

        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={iconUrl} sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd' }}>
              <Image />
            </Avatar>
            <Box>
              <Button component="label" variant="outlined" startIcon={<CloudUpload />} disabled={uploading}>
                아이콘 변경
                <input type="file" hidden accept="image/*" onChange={handleIconUpload} />
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1, color: '#888' }}>
                권장 사이즈: 200x200px (정사각형)
              </Typography>
            </Box>
          </Box>

          <TextField 
            label="동아리 이름" fullWidth value={name} onChange={e => setName(e.target.value)} 
          />
          <TextField 
            label="한 줄 소개" fullWidth multiline rows={2} value={shortIntro} onChange={e => setShortIntro(e.target.value)} 
            placeholder="예: 열정 가득한 밴드부입니다!" helperText="검색 결과에 노출됩니다."
          />

          <Button variant="contained" size="large"  onClick={handleSave}>
            기본 정보 저장
          </Button>
        </Stack>
      </Paper>

      {/* 2. 가입 신청서 양식 설정 */}
      <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment color="primary" /> 가입 신청서 양식
            </Typography>
            <Typography variant="body2" color="text.secondary">
              신규 회원이 가입할 때 작성할 질문들을 설정하세요.
            </Typography>
          </Box>
          <Button variant="outlined" startIcon={<Add />} onClick={addQuestion}>질문 추가</Button>
        </Box>

        <Stack spacing={2}>
          {formQuestions.length === 0 && (
            <Typography align="center" color="text.secondary" sx={{ py: 4, bgcolor: 'white', borderRadius: 2, border: '1px dashed #ccc' }}>
              질문이 없습니다. [질문 추가] 버튼을 눌러보세요.<br/>(예: 학번, 전화번호, 지원동기 등)
            </Typography>
          )}

          {formQuestions.map((q, index) => (
            <Card key={q.id} sx={{ p: 2, border: '1px solid #e0e0e0', boxShadow: 'none' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                <Typography sx={{ pt: 2, fontWeight: 'bold', color: '#999' }}>Q{index + 1}</Typography>
                
                <TextField 
                  label="질문 내용 (예: 학번을 입력해주세요)" 
                  fullWidth size="small"
                  value={q.label} 
                  onChange={e => updateQuestion(q.id, 'label', e.target.value)} 
                />
                
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>답변 타입</InputLabel>
                  <Select value={q.type} label="답변 타입" onChange={e => updateQuestion(q.id, 'type', e.target.value)}>
                    <MenuItem value="text">단답형 (Text)</MenuItem>
                    <MenuItem value="textarea">장문형 (Box)</MenuItem>
                    <MenuItem value="checkbox">체크박스 (Yes/No)</MenuItem>
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
            신청서 양식 저장
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}