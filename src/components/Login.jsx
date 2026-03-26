import React, { useState } from 'react'

const PASSWORDS = {
  directiva:     'necaxa2026',
  cuerpo_tecnico: 'rayos2026',
}

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    setTimeout(() => {
      if (password === PASSWORDS.directiva) {
        sessionStorage.setItem('necaxa_role', 'directiva')
        onLogin('directiva')
      } else if (password === PASSWORDS.cuerpo_tecnico) {
        sessionStorage.setItem('necaxa_role', 'cuerpo_tecnico')
        onLogin('cuerpo_tecnico')
      } else {
        setError('Contraseña incorrecta')
        setLoading(false)
      }
    }, 400)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#131313',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8, padding: '48px 40px', width: 340,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
      }}>
        {/* Logo + título */}
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Club_Necaxa_Logo.svg"
          alt="Necaxa"
          style={{ width: 64, height: 64, objectFit: 'contain' }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
            fontSize: 22, letterSpacing: 3, color: '#efefef', textTransform: 'uppercase',
          }}>Necaxa</div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 12, letterSpacing: 2, color: '#555', textTransform: 'uppercase', marginTop: 2,
          }}>Dashboard de Rendimiento</div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#111', border: `1px solid ${error ? '#c81a1a' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 4, padding: '12px 14px',
                fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#efefef',
                outline: 'none', transition: 'border-color .15s',
              }}
              onFocus={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.25)' }}
              onBlur={e => { if (!error) e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: '#c81a1a', fontFamily: "'Barlow', sans-serif",
              textAlign: 'center', letterSpacing: 0.5,
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              background: loading || !password ? '#2a2a2a' : '#c81a1a',
              color: loading || !password ? '#555' : '#fff',
              border: 'none', borderRadius: 4, padding: '12px 0',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
              fontSize: 14, letterSpacing: 2, textTransform: 'uppercase',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'background .15s',
            }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
