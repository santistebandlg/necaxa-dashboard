import React, { useState, useMemo } from 'react'
import { StatBarChart, StatComboChart } from './Charts'
import { RED, GOLD, WHT } from '../utils/chartUtils'
import { getPlayerPhoto } from '../utils/playerPhotos'
import { ROLE_LABELS, getStatsByRole, formatJornadaLabels, jLabel, jParts } from '../hooks/useSheetData'
import { TorneoFilter, JornadaFilter } from './UI'

const ROLE_DISPLAY_ORDER = [
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

function PlayerAvatar({ name, ini, size = 60 }) {
  const photo = getPlayerPhoto(name)
  const [imgError, setImgError] = useState(false)
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

// ── Una mitad de la comparativa: jugador + posición + torneo + jornadas propios ──
function ComparativaSide({ side, PL, jornadas, torneos, roleGroups, defaultId }) {
  const [selectedId, setSelectedId] = useState(defaultId)
  const [roleOverride, setRoleOverride] = useState(null)
  const [activeTorneos, setActiveTorneos] = useState([]) // [] = todos
  const [activeJIdx, setActiveJIdx] = useState([])       // [] = todas dentro del torneo elegido

  const basePlayer = PL.find(p => p.id === selectedId) || PL[0]
  const colorMap = { r: RED, g: GOLD, w: WHT }

  if (!basePlayer) return (
    <div className="empty"><div className="big">👤</div><p>No hay jugadores disponibles</p></div>
  )

  const overrideRole = roleOverride
  const hasOverride = !!overrideRole && overrideRole !== basePlayer.defaultRole
  const player = hasOverride
    ? {
        ...basePlayer,
        pos: ROLE_LABELS[overrideRole] || basePlayer.pos,
        stats: getStatsByRole(basePlayer.name, jornadas, basePlayer.rawByJ, overrideRole),
      }
    : basePlayer

  // Jornadas disponibles para esta mitad, según su propio torneo elegido
  const sideJornadas = useMemo(() => {
    if (!activeTorneos.length || activeTorneos.length === torneos.length) return jornadas
    return jornadas.filter(k => activeTorneos.includes(jParts(k).torneo))
  }, [jornadas, activeTorneos, torneos])

  const effectiveJIdx = activeJIdx.length ? activeJIdx : sideJornadas.map((_, i) => i)
  const selectedKeys = effectiveJIdx.map(i => sideJornadas[i]).filter(Boolean)

  const handleTorneoChange = (t) => {
    setActiveTorneos(t.length === torneos.length ? [] : t)
    setActiveJIdx([])
  }

  const filteredStats = player.stats.map(st => {
    const pick = (arr, fallback) => selectedKeys.map(lbl => {
      const idx = jornadas.indexOf(lbl)
      if (idx < 0 || !arr) return fallback
      const v = arr[idx]
      return v === undefined ? fallback : v
    })
    const filteredData = pick(st.chartData, 0)
    const filteredData2 = st.chartData2 ? pick(st.chartData2, 0) : null
    const filteredPct = st.pctChartData ? pick(st.pctChartData, null) : null
    return { ...st, filteredData, filteredData2, filteredPct }
  })

  return (
    <div>
      {/* Selectores propios de esta mitad */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="csel">
          <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setRoleOverride(null) }} style={{ minWidth: 200 }}>
            {Object.entries(roleGroups).map(([role, players]) =>
              players.length > 0 ? (
                <optgroup key={role} label={role}>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ) : null
            )}
          </select>
        </div>
        <div className="csel">
          <select
            value={overrideRole || basePlayer.defaultRole || ''}
            onChange={e => setRoleOverride(e.target.value)}
            style={{ minWidth: 170 }}
            title="Ver métricas de este jugador como si jugara en otra posición"
          >
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {hasOverride && (
          <button
            onClick={() => setRoleOverride(null)}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              padding: '5px 10px', color: 'var(--gray3)', fontSize: 11, cursor: 'pointer',
            }}
          >↺ Original</button>
        )}
      </div>
      <div style={{ marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {torneos.length > 0 && (
          <TorneoFilter
            torneos={torneos}
            active={activeTorneos.length ? activeTorneos : torneos}
            onChange={handleTorneoChange}
          />
        )}
        <JornadaFilter
          jornadas={formatJornadaLabels(sideJornadas)}
          active={effectiveJIdx}
          onChange={setActiveJIdx}
        />
      </div>

      {/* Encabezado del jugador */}
      <div className="plhdr" style={{ marginBottom: 20 }}>
        <PlayerAvatar name={player.name} ini={player.ini} size={60} />
        <div>
          <div className="plname" style={{ fontSize: 22 }}>{player.name}</div>
          <div className="plpos">{player.pos}</div>
          <div className="plmeta">
            <span>⏱ <strong>{player.mins}'</strong></span>
            <span><strong>{player.pct}%</strong> del partido</span>
            <span style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: 1 }}>
              ★ Última: {jLabel(player.lastJ, true)}
            </span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '10px 14px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 12,
            letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gray3)',
          }}>Estadísticas — {jLabel(player.lastJ, true)}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Estadística</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Total</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Log.</th>
              <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>%</th>
            </tr>
          </thead>
          <tbody>
            {filteredStats.map((st, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '6px 12px', fontSize: 11, color: 'var(--gray3)' }}>{st.lbl}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{fmt(st.total)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--gray3)' }}>{st.logrado !== null ? fmt(st.logrado) : '—'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: pctColor(st.pct) }}>{st.pct !== null ? fmtPct(st.pct) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráficas */}
      <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {filteredStats.map((st, idx) => (
            <div key={idx} className="scc">
              <div className="sctitle" style={{ fontSize: 12 }}>{st.lbl}</div>
              <div className="scsub" style={{ fontSize: 10 }}>
                Último: <strong style={{ color: 'var(--white)' }}>{st.filteredData[st.filteredData.length - 1] ?? '—'}</strong>
              </div>
              {st.filteredData2 ? (
                <StatComboChart
                  labels={formatJornadaLabels(selectedKeys)}
                  total={st.filteredData}
                  logrado={st.filteredData2}
                  pct={st.filteredPct}
                  height={140}
                />
              ) : (
                <StatBarChart
                  labels={formatJornadaLabels(selectedKeys)}
                  data={st.filteredData}
                  color={colorMap[st.c] || RED}
                  height={140}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ComparativaPanel({ PL, jornadas, torneos }) {
  if (!PL || PL.length === 0) return (
    <div className="panel">
      <div className="empty"><div className="big">⚖️</div><p>No hay jugadores disponibles</p></div>
    </div>
  )

  const roleGroups = {}
  ROLE_DISPLAY_ORDER.forEach(r => { roleGroups[r] = [] })
  PL.forEach(p => {
    const role = p.pos || 'Sin posición'
    if (!roleGroups[role]) roleGroups[role] = []
    roleGroups[role].push(p)
  })

  return (
    <div className="panel">
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28,
        alignItems: 'start',
      }}>
        <div style={{ borderRight: '1px solid var(--border)', paddingRight: 28 }}>
          <ComparativaSide side="A" PL={PL} jornadas={jornadas} torneos={torneos} roleGroups={roleGroups} defaultId={PL[0]?.id} />
        </div>
        <div>
          <ComparativaSide side="B" PL={PL} jornadas={jornadas} torneos={torneos} roleGroups={roleGroups} defaultId={PL[1]?.id || PL[0]?.id} />
        </div>
      </div>
    </div>
  )
}
