import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Box, Typography, Button, Paper, TextField, Stack, Fade
} from '@mui/material'
import { Edit, Save } from '@mui/icons-material'

// props로 clubData와 refresh 함수를 받아옵니다.
export default function ClubHomeTab({ clubData, isManager, refreshClubInfo }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')

  // clubData가 바뀔 때마다 에디터 상태 업데이트
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
    
    if (error) alert('저장 실패')
    else { 
      setIsEditing(false); 
      refreshClubInfo(); // 부모 컴포넌트의 데이터를 갱신해달라고 요청
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
                <Button variant="outlined" onClick={() => setIsEditing(false)}>취소</Button>
                <Button variant="contained" startIcon={<Save />} onClick={handleSave}>저장하기</Button>
              </Stack>
            ) : (
              <Button variant="text" startIcon={<Edit />} onClick={() => setIsEditing(true)}>소개글 수정</Button>
            )}
          </Box>
        )}

        {/* 본문 내용 */}
        <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid #eee', minHeight: 300, bgcolor: isEditing ? '#fff' : '#fff' }}>
          {isEditing ? (
            <Stack spacing={4}>
              <TextField 
                label="헤드라인 (짧은 소개)" 
                fullWidth 
                value={editTitle} 
                onChange={e => setEditTitle(e.target.value)} 
                variant="standard" 
                placeholder="예: 열정과 낭만이 있는 사진 동아리 픽셀입니다!"
                inputProps={{ style: { fontSize: '1.5rem', fontWeight: 'bold' } }} 
              />
              <TextField 
                label="상세 소개글" 
                fullWidth 
                multiline 
                rows={15} 
                value={editContent} 
                onChange={e => setEditContent(e.target.value)} 
                placeholder="동아리 활동 내용, 모집 기간 등을 자유롭게 적어주세요."
              />
            </Stack>
          ) : (
            <>
              <Typography variant="h5" fontWeight="bold" gutterBottom color="text.primary" sx={{ mb: 3 }}>
                {clubData.intro_title || '환영합니다!'}
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#4b5563', fontSize: '1.1rem' }}>
                {clubData.intro_content || '아직 등록된 소개글이 없습니다.'}
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    </Fade>
  )
}