import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import { Capacitor } from '@capacitor/core'
import './index.css'
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Esconde splash nativo assim que o WebView monta (evita overlap com a tela de loading).
if (Capacitor.isNativePlatform()) {
  void SplashScreen.hide().catch(() => {
    /* plugin pode não estar pronto em hot reload */
  })
}
