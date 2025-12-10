import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initElectronStorage } from './store/electronStorage'

// 初始化 Electron 存储后再渲染应用
const STORAGE_KEY = 'studypilot-storage'

initElectronStorage(STORAGE_KEY).then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
