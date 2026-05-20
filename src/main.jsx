import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { registerSW } from 'virtual:pwa-register'

// Crear una instancia de QueryClient
const queryClient = new QueryClient()

// Registro condicional del Service Worker de la PWA en producción
if (import.meta.env.PROD) {
  registerSW({
    onNeedRefresh() {
      console.log('[PWA] Nueva versión disponible. Recargando para actualizar...');
      window.location.reload();
    },
    onOfflineReady() {
      console.log('[PWA] Aplicación lista para trabajar sin conexión (offline mode).');
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
