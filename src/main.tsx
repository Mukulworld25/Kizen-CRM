import React, { Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#060B18', color: '#FFFFFF', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ textAlign: 'center', padding: '32px', maxWidth: '420px', borderRadius: '24px', backgroundColor: '#0D162D', border: '1px solid rgba(245,166,35,0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#F5A623', marginBottom: '8px' }}>Kizen Education CRM</h2>
            <p style={{ fontSize: '13px', color: '#94A3B8', marginBottom: '24px' }}>Updating system session for your browser...</p>
            <button
              onClick={() => {
                localStorage.clear()
                sessionStorage.clear()
                window.location.reload()
              }}
              style={{ padding: '12px 24px', backgroundColor: '#F5A623', color: '#060B18', fontWeight: '800', fontSize: '13px', borderRadius: '12px', border: 'none', cursor: 'pointer', letterSpacing: '0.5px' }}
            >
              Reload & Clear Cache
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
