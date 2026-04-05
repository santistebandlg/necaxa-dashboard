import React, { useState } from 'react'
import { StatBarChart } from './Charts'
import { RED, GOLD, WHT } from '../utils/chartUtils'
import { getPlayerPhoto } from '../utils/playerPhotos'

const ROLE_ORDER = [
  'Portero','Stopper Izquierdo','Libero','Stopper Derecho',
  'Lateral que Interioriza','Pivote','Interior Defensivo','Interior Ofensivo',
  'Extremo - Lateral que Interioriza','Extremo','Interior Defensivo - Ofensivo','Delantero',
]

function fmt(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'number') return v % 1 === 0 ? String(v) : v.toFixed(2)
  return String(v)
}

function fmtPct(v) {
  if (v === null || v === undefined) return '—'
  const n = parseFloat(v)
  if (isNaN(n)) return '—'
  // If value is between 0 and 1 (decimal ratio), multiply by 100
  const pct = n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n)
  return pct + '%'
}

function pctColor(v) {
  if (v === null || v === undefined) return 'var(--gray3)'
  const pct = v > 0 && v <= 1 ? v * 100 : v
  if (pct >= 70) return '#3fb950'
  if (pct >= 50) return '#e8b832'
  return '#c81a1a'
}

function PlayerAvatar({ name, ini, size = 72 }) {
  const photo = getPlayerPhoto(name)
  const [imgError, setImgError] = React.useState(false)
  if (photo && !imgError) return (
    <img
      src={photo}
      alt={name}
      onError={() => setImgError(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0, border: '2px solid var(--border)' }}
    />
  )
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: RED, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
      fontSize: size * 0.33, color: '#fff', letterSpacing: 1,
    }}>{ini}</div>
  )
}

export default function IndividualPanel({ PL, labels, allJornadas }) {
  const [selectedId, setSelectedId] = useState(PL[0]?.id || '')
  const player = PL.find(p => p.id === selectedId) || PL[0]

  if (!player) return (
    <div className="panel">
      <div className="empty"><div className="big">👤</div><p>No hay jugadores disponibles</p></div>
    </div>
  )

  const ROLE_DISPLAY_ORDER = [
    'Portero','Stopper Izquierdo','Libero','Stopper Derecho',
    'Lateral que Interioriza','Pivote','Interior Defensivo','Interior Ofensivo',
    'Extremo - Lateral que Interioriza','Extremo','Interior Defensivo - Ofensivo','Delantero',
  ]
  const roleGroups = {}
  ROLE_DISPLAY_ORDER.forEach(r => { roleGroups[r] = [] })
  PL.forEach(p => {
    const role = p.pos || 'Sin posición'
    if (!roleGroups[role]) roleGroups[role] = []
    roleGroups[role].push(p)
  })

  const colorMap = { r: RED, g: GOLD, w: WHT }

  // Filter chart data to selected labels
  const filteredStats = player.stats.map(st => {
    const filteredData = labels.map(lbl => {
      const idx = (allJornadas || []).indexOf(lbl)
      return idx >= 0 ? (st.chartData[idx] ?? 0) : 0
    })
    return { ...st, filteredData }
  })

  return (
    <div className="panel">
      {/* Grouped player selector */}
      <div style={{ marginBottom: 24 }}>
        <div className="csel">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ minWidth: 280 }}>
            {Object.entries(roleGroups).map(([role, players]) =>
              players.length > 0 ? (
                <optgroup key={role} label={role}>
                  {players.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ) : null
            )}
          </select>
        </div>
      </div>

      {/* Player header */}
      <div className="plhdr" style={{ marginBottom: 24 }}>
        <PlayerAvatar name={player.name} ini={player.ini} size={72} />
        <div>
          <div className="plname">{player.name}</div>
          <div className="plpos">{player.pos}</div>
          <div className="plmeta">
            <span>⏱ <strong>{player.mins}'</strong></span>
            <span><strong>{player.pct}%</strong> del partido</span>
            <span style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: 1 }}>
              ★ Última jornada: {player.lastJ}
            </span>
          </div>
        </div>
      </div>

      {/* Main content: table left + charts right */}
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── TABLA última jornada ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '12px 16px',
            background: 'var(--s2)',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 800, fontSize: 13, letterSpacing: 2,
              textTransform: 'uppercase', color: 'var(--gray3)',
            }}>
              Estadísticas — {player.lastJ}
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '7px 14px', textAlign: 'left', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Estadística</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Total</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Log.</th>
                <th style={{ padding: '7px 10px', textAlign: 'center', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>%</th>
              </tr>
            </thead>
            <tbody>
              {filteredStats.map((st, idx) => (
                <tr key={idx} style={{
                  borderBottom: '1px solid var(--border)',
                  background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                }}>
                  <td style={{ padding: '7px 14px', fontSize: 12, color: 'var(--gray3)' }}>{st.lbl}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--white)' }}>
                    {fmt(st.total)}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--gray3)' }}>
                    {st.logrado !== null ? fmt(st.logrado) : '—'}
                  </td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: pctColor(st.pct) }}>
                    {st.pct !== null ? fmtPct(st.pct) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── GRÁFICAS acumulativas ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {filteredStats.map((st, idx) => (
            <div key={idx} className="scc">
              <div className="sctitle">{st.lbl}</div>
              <div className="scsub">
                Jornadas seleccionadas · Último: <strong style={{ color: 'var(--white)' }}>
                  {st.filteredData[st.filteredData.length - 1] ?? '—'}
                </strong>
              </div>
              <StatBarChart
                labels={labels}
                data={st.filteredData}
                color={colorMap[st.c] || RED}
                height={130}
              />
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
