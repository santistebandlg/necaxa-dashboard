import React from 'react'

export function Header({ sidebarOpen, onToggle, badge }) {
  return (
    <div className="hdr">
      <div className="hbtn" onClick={onToggle}>
        <span /><span /><span />
      </div>
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Club_Necaxa_Logo.svg"
        alt="Necaxa"
        style={{ width: 36, height: 36, objectFit: 'contain', flexShrink: 0 }}
      />
      <div>
        <div className="htitle">Necaxa</div>
        <div className="hsub">Dashboard de Rendimiento</div>
      </div>
      <div style={{ flex: 1 }} />
      <div className="hbadge">{badge}</div>
    </div>
  )
}

export function Sidebar({ open, current, onNav }) {
  const items = [
    { id: 'colectivo',      icon: '📋', label: 'Colectivo',       group: 'Informes' },
    { id: 'individual',     icon: '👤', label: 'Individual',      group: 'Informes' },
    { id: 'perfil',         icon: '🪪', label: 'Perfil',          group: 'Informes' },
    { id: 'recuperaciones', icon: '🔄', label: 'Recuperaciones',  group: 'Análisis' },
    { id: 'balones',        icon: '❌', label: 'Balones Perdidos', group: 'Análisis' },
    { id: 'duelos',         icon: '⚔️', label: 'Duelos',          group: 'Análisis' },
    { id: 'fisico',         icon: '🏃', label: 'Físico',          group: 'Análisis' },
  ]
  const groups = ['Informes', 'Análisis']
  return (
    <nav className={`sb${open ? '' : ' closed'}`}>
      {groups.map(g => (
        <React.Fragment key={g}>
          <div className="sb-sec">{g}</div>
          {items.filter(i => i.group === g).map(item => (
            <div
              key={item.id}
              className={`ni${current === item.id ? ' active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              <div className="nicon">{item.icon}</div>
              <div className="nlabel">{item.label}</div>
            </div>
          ))}
        </React.Fragment>
      ))}
      <div className="sb-bot">
        <div className="ni" style={{ opacity: .4, cursor: 'default' }}>
          <div className="nicon" style={{ fontSize: 11 }}>⚙️</div>
          <div className="nlabel" style={{ fontSize: 11 }}>Configuración</div>
        </div>
      </div>
    </nav>
  )
}

export function JornadaFilter({ jornadas, active, onChange }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef()

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (i) => {
    if (active.includes(i) && active.length <= 1) return
    const next = active.includes(i)
      ? active.filter(x => x !== i)
      : [...active, i].sort((a, b) => a - b)
    onChange(next)
  }

  const selectAll = () => onChange(jornadas.map((_, i) => i))
  const clearAll  = () => onChange([jornadas.length - 1])

  const label = active.length === jornadas.length
    ? `Todas (${jornadas.length})`
    : active.length === 1
    ? jornadas[active[0]]
    : `${active.length} jornadas`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--s2)', border: '1px solid var(--border)',
          borderRadius: 3, padding: '7px 12px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 13, letterSpacing: 1, color: 'var(--white)',
          minWidth: 160, justifyContent: 'space-between',
          transition: 'border-color .15s',
          ...(open ? { borderColor: 'var(--red)' } : {}),
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>Jornadas:</span>
        <span>{label}</span>
        <span style={{ color: 'var(--gray)', fontSize: 11, marginLeft: 4 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#1a1a1a', border: '1px solid var(--border)',
          borderRadius: 4, zIndex: 200, minWidth: 180,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            <button onClick={selectAll} style={{
              flex: 1, background: 'none', border: 'none', borderRight: '1px solid var(--border)',
              color: 'var(--gray3)', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '7px 0',
              cursor: 'pointer', textTransform: 'uppercase',
            }}>Todas</button>
            <button onClick={clearAll} style={{
              flex: 1, background: 'none', border: 'none',
              color: 'var(--gray3)', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '7px 0',
              cursor: 'pointer', textTransform: 'uppercase',
            }}>Última</button>
          </div>
          {jornadas.map((j, i) => {
            const isActive = active.includes(i)
            return (
              <div key={j} onClick={() => toggle(i)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', cursor: 'pointer',
                background: isActive ? 'rgba(200,26,26,.12)' : 'none',
                borderBottom: '1px solid var(--border)', transition: 'background .1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(200,26,26,.18)' : 'var(--s2)'}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(200,26,26,.12)' : 'none'}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                  border: `2px solid ${isActive ? 'var(--red)' : 'var(--gray2)'}`,
                  background: isActive ? 'var(--red)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isActive && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 13, letterSpacing: 1, color: isActive ? 'var(--white)' : 'var(--gray3)',
                }}>{j}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function TorneoFilter({ torneos, active, onChange }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef()

  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (t) => {
    const next = active.includes(t) ? active.filter(x => x !== t) : [...active, t]
    if (next.length === 0) return
    onChange(next)
  }

  const selectAll = () => onChange([...torneos])

  const isAllSelected = active.length === torneos.length

  const label = isAllSelected
    ? 'Todos'
    : active.length === 1
    ? active[0]
    : `${active.length} torneos`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--s2)', border: '1px solid var(--border)',
          borderRadius: 3, padding: '7px 12px', cursor: 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
          fontSize: 13, letterSpacing: 1, color: 'var(--white)',
          minWidth: 160, justifyContent: 'space-between',
          transition: 'border-color .15s',
          ...(open ? { borderColor: 'var(--red)' } : {}),
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>Torneo:</span>
        <span>{label}</span>
        <span style={{ color: 'var(--gray)', fontSize: 11, marginLeft: 4 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          background: '#1a1a1a', border: '1px solid var(--border)',
          borderRadius: 4, zIndex: 200, minWidth: 200,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)', overflow: 'hidden',
        }}>
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={selectAll} style={{
              width: '100%', background: 'none', border: 'none',
              color: 'var(--gray3)', fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700, fontSize: 11, letterSpacing: 1, padding: '7px 14px',
              cursor: 'pointer', textTransform: 'uppercase', textAlign: 'left',
            }}>Seleccionar todos</button>
          </div>
          {torneos.map(t => {
            const isActive = active.includes(t)
            return (
              <div key={t} onClick={() => toggle(t)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', cursor: 'pointer',
                background: isActive ? 'rgba(200,26,26,.12)' : 'none',
                borderBottom: '1px solid var(--border)', transition: 'background .1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = isActive ? 'rgba(200,26,26,.18)' : 'var(--s2)'}
                onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(200,26,26,.12)' : 'none'}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                  border: `2px solid ${isActive ? 'var(--red)' : 'var(--gray2)'}`,
                  background: isActive ? 'var(--red)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {isActive && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>}
                </div>
                <span style={{
                  fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
                  fontSize: 13, letterSpacing: 1, color: isActive ? 'var(--white)' : 'var(--gray3)',
                }}>{t}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function Legend({ items }) {
  return (
    <div className="leg">
      {items.map((item, i) => (
        <div key={i} className="li">
          {item.type === 'line'
            ? <div className="ll" style={{ background: item.color }} />
            : <div className="ld" style={{ background: item.color }} />
          }
          {item.label}
        </div>
      ))}
    </div>
  )
}

export function XGBar({ label, value, max, variant = 'r' }) {
  const pct = max ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="xr">
      <div className="xl">{label}</div>
      <div className="xt">
        <div className={`xf ${variant}`} style={{ width: `${pct}%` }}>{value}</div>
      </div>
    </div>
  )
}

export function SectionHeader({ title, right }) {
  return (
    <div className="sech">
      <div className="sectl">{title}</div>
      {right && <div className="secr">{right}</div>}
    </div>
  )
}

export function PhaseDivider({ label }) {
  return (
    <div className="phdiv">
      <div className="phdiv-line" />
      <div className="phdiv-lbl">{label}</div>
      <div className="phdiv-line" />
    </div>
  )
}

export function Card({ title, children }) {
  return (
    <div className="card">
      {title && <div className="ctitle">{title}</div>}
      {children}
    </div>
  )
}

export function Loading({ message = 'Cargando datos...' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-wrap">
      <div style={{ fontSize: 40 }}>⚠️</div>
      <h2>Error al cargar datos</h2>
      <p>{message}</p>
      <p style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
        Asegúrate de abrir el proyecto con <strong style={{ color: '#aaa' }}>npm run dev</strong> y que el script de Google esté publicado correctamente.
      </p>
      <button className="btn-retry" onClick={onRetry}>REINTENTAR</button>
    </div>
  )
}
