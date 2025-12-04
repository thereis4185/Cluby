import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// ▼ 이 두 줄이 꼭 있어야 합니다!
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme' 

import App from './App.jsx'
import './index.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    {/* ▼ App을 ThemeProvider로 감싸주셨나요? */}
    <ThemeProvider theme={theme}>
      <CssBaseline /> {/* 이게 없으면 배경색이 안 바뀝니다 */}
      <App />
    </ThemeProvider>
  </BrowserRouter>
)