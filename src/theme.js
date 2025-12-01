import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // 인디고 블루
      light: '#818cf8',
      dark: '#3730a3',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#EC4899', // 핑크
    },
    background: {
      default: '#F9FAFB', // 쿨톤 라이트 그레이 (더 차분함)
      paper: '#ffffff',
    },
    text: {
      primary: '#111827', // 거의 검정에 가까운 진회색
      secondary: '#6B7280',
    },
  },

  typography: {
    fontFamily: '"Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },

  // [핵심 수정] 둥근 모서리를 8px로 줄임 (훨씬 단정함)
  shape: {
    borderRadius: 6, 
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px', // 버튼은 더 각지게
          boxShadow: 'none',
          padding: '8px 16px',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '12px', // 카드는 적당히
          boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)', // 얕고 깔끔한 그림자
          border: '1px solid #E5E7EB', // 연한 테두리 추가
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        },
        elevation3: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { 
          fontWeight: 600, 
          borderRadius: '6px', // 칩도 각지게
        },
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: 'none',
        }
      }
    }
  },
});

export default theme;