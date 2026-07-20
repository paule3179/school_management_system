// StrictMode intentionally not used to avoid dev double-invoking effects

import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'

import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')).render(
  // StrictMode double-invokes effects in development, which can trigger repeated
  // data-loading and look like an HMR/reload loop.
  // Keep StrictMode disabled for local dev stability; enable in production if needed.
  <AuthProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
)

