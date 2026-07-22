import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { getLocale, isRTL } from './i18n'
import './ui/styles.css'

document.documentElement.lang = getLocale()
document.documentElement.dir = isRTL() ? 'rtl' : 'ltr'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
