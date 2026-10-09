import './styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startStt } from './voice/stt'
import { applyTheme, loadThemePref } from './theme'

applyTheme(loadThemePref())

// Load the speech model in the background right away.
startStt()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
