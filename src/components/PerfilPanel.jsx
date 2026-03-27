import React, { useState, useMemo, useRef } from 'react'
import { Bar } from 'react-chartjs-2'
import { StatBarChart } from './Charts'
import { RED, GOLD, WHT, GRN, GRID } from '../utils/chartUtils'
import PitchMap from './PitchMap'

// ── Helpers ──────────────────────────────────────────────────
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
const EXCLUDED = ['desconocido', 'fj', 'f', 'fl', '']
function filterRaw(events, labels, jugador, activeTorneos) {
  if (!events) return []
  return events.filter(e => {
    if (labels?.length && !labels.includes(e.jornada)) return false
    if (activeTorneos?.length && !activeTorneos.includes(e.torneo)) return false
    const n = (e.jugador || '').trim().toLowerCase()
    if (EXCLUDED.includes(n)) return false
    if (jugador && e.jugador !== jugador) return false
    return true
  })
}

// ── Sección header ────────────────────────────────────────────
function SecTitle({ children }) {
  return (
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
      fontSize: 13, letterSpacing: 3, textTransform: 'uppercase',
      color: 'var(--gray3)', borderBottom: '1px solid var(--border)',
      paddingBottom: 8, marginBottom: 16, marginTop: 32,
    }}>{children}</div>
  )
}

// ── Stat card pequeña ─────────────────────────────────────────
function StatCard({ label, value, sub, color = 'var(--white)' }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border)',
      borderRadius: 6, padding: '14px 16px', minWidth: 120,
    }}>
      <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color, letterSpacing: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--gray)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ── Gráfica horizontal de conteo por acción ───────────────────
function AccionBar({ events, color = RED }) {
  const counts = useMemo(() => {
    const c = {}
    events.forEach(e => { c[e.accion] = (c[e.accion] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [events])
  if (!counts.length) return <div style={{ color: 'var(--gray)', fontSize: 12 }}>Sin datos</div>
  const h = Math.max(120, counts.length * 28)
  return (
    <div style={{ height: h }}>
      <Bar
        data={{
          labels: counts.map(([k]) => k),
          datasets: [{ data: counts.map(([, v]) => v), backgroundColor: color, borderRadius: 3, _barLabels: true }],
        }}
        options={{
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: GRID, beginAtZero: true },
            y: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 10 } } },
          },
        }}
      />
    </div>
  )
}

// ── Métricas físicas del jugador ──────────────────────────────
const FISICO_METRICS = [
  { key: 'distancia', label: 'Distancia', unit: 'm' },
  { key: 'hsrAbs', label: 'HSR', unit: 'm' },
  { key: 'sprintsCount', label: 'Sprints', unit: '' },
  { key: 'velocidadMax', label: 'Vel. Máx.', unit: 'km/h' },
  { key: 'playerLoad', label: 'Player Load', unit: 'a.u.' },
  { key: 'hmld', label: 'HMLD', unit: 'm' },
  { key: 'explosiveDist', label: 'Explosive Dist.', unit: 'm' },
]
const MAX_METRICS_F = ['velocidadMax', 'distanciaMin', 'hsrAbsMin']

// ─────────────────────────────────────────────────────────────
export default function PerfilPanel({ PL, raw, labels, activeTorneos, allJornadas }) {
  const [selectedId, setSelectedId] = useState(PL[0]?.id || '')
  const printRef = useRef()

  const player = PL.find(p => p.id === selectedId) || PL[0]
  if (!player) return (
    <div className="panel"><div className="empty"><div className="big">👤</div><p>No hay jugadores disponibles</p></div></div>
  )

  // Role groups for selector
  const ROLE_ORDER = [
    'Portero','Stopper Izquierdo Ofensivo','Libero Ofensivo','Stopper Derecho Ofensivo',
    'Lateral que Interioriza','Pivote','Interior Defensivo','Interior Ofensivo',
    'Extremo - Lateral que Interioriza','Extremo','Interior Defensivo - Ofensivo','Delantero',
  ]
  const roleGroups = {}
  ROLE_ORDER.forEach(r => { roleGroups[r] = [] })
  PL.forEach(p => { const r = p.pos || 'Sin posición'; if (!roleGroups[r]) roleGroups[r] = []; roleGroups[r].push(p) })

  // Stats individuales filtradas
  const colorMap = { r: RED, g: GOLD, w: WHT }
  const filteredStats = player.stats.map(st => {
    const filteredData = labels.map(lbl => {
      const idx = (allJornadas || []).indexOf(lbl)
      return idx >= 0 ? (st.chartData[idx] ?? 0) : 0
    })
    return { ...st, filteredData }
  })

  // Raw events por módulo
  const recEvents = filterRaw(raw?.recuperaciones, labels, player.name, activeTorneos)
  const balEvents = filterRaw(raw?.balones,        labels, player.name, activeTorneos)
  const dueEvents = filterRaw(raw?.duelos,         labels, player.name, activeTorneos)

  // Físico del jugador
  const fisicoEvents = useMemo(() => {
    if (!raw?.fisico) return []
    return raw.fisico.filter(e => {
      if (activeTorneos?.length && !activeTorneos.includes(e.torneo)) return false
      // Match by name (fisico may have slightly different casing)
      return e.jugador?.toLowerCase().trim() === player.name.toLowerCase().trim()
    })
  }, [raw, player, activeTorneos])

  const fisicoAgg = useMemo(() => {
    const agg = { count: 0 }
    FISICO_METRICS.forEach(m => { agg[m.key] = 0 })
    fisicoEvents.forEach(e => {
      agg.count++
      FISICO_METRICS.forEach(m => {
        if (MAX_METRICS_F.includes(m.key)) agg[m.key] = Math.max(agg[m.key], e[m.key] || 0)
        else agg[m.key] += (e[m.key] || 0)
      })
    })
    return agg
  }, [fisicoEvents])

  // PDF export
  const handlePDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')
    const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#131313', useCORS: true })
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const w = pdf.internal.pageSize.getWidth()
    const h = (canvas.height * w) / canvas.width
    let y = 0
    const pageH = pdf.internal.pageSize.getHeight()
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    while (y < h) {
      if (y > 0) pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, -y, w, h)
      y += pageH
    }
    pdf.save(`Perfil_${player.name.replace(/ /g, '_')}.pdf`)
  }

  const [fisicoMode, setFisicoMode] = useState('total')
  const [mapaModulo, setMapaModulo] = useState('recuperaciones')

  const fisicoVal = (key) => {
    if (!fisicoAgg.count) return 0
    if (fisicoMode === 'promedio' && !MAX_METRICS_F.includes(key)) return fisicoAgg[key] / fisicoAgg.count
    return fisicoAgg[key]
  }

  const labelRange = labels.length ? `${labels[0]} – ${labels[labels.length - 1]}` : 'Todas'

  return (
    <div className="panel">
      {/* Selector + botón PDF */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div className="csel">
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={{ minWidth: 260 }}>
            {Object.entries(roleGroups).map(([role, players]) =>
              players.length > 0 ? (
                <optgroup key={role} label={role}>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              ) : null
            )}
          </select>
        </div>
        <button onClick={handlePDF} style={{
          background: RED, color: '#fff', border: 'none', borderRadius: 4,
          padding: '8px 20px', fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer',
        }}>⬇ Descargar PDF</button>
      </div>

      {/* ══ CONTENIDO IMPRIMIBLE ══ */}
      <div ref={printRef} style={{ background: '#131313', padding: 24 }}>

        {/* Header jugador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, borderBottom: '2px solid var(--red)', paddingBottom: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: RED,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900,
            fontSize: 24, color: '#fff', flexShrink: 0, letterSpacing: 1,
          }}>{player.ini}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, color: '#efefef', letterSpacing: 2, textTransform: 'uppercase' }}>{player.name}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>{player.pos}</div>
            <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 4, letterSpacing: 1 }}>Periodo: {labelRange}</div>
          </div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/Club_Necaxa_Logo.svg" alt="Necaxa" style={{ width: 56, height: 56, opacity: 0.8 }} />
        </div>

        {/* ── SECCIÓN 1: Stats individuales (tabla + gráficas) ── */}
        <SecTitle>Estadísticas Individuales</SecTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24, alignItems: 'start' }}>
          {/* Tabla */}
          <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#222', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: 2, color: 'var(--gray3)', textTransform: 'uppercase' }}>
                Estadísticas — {player.lastJ}
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', fontSize: 9, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>Métrica</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>Log.</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map((st, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '6px 12px', fontSize: 11, color: 'var(--gray3)' }}>{st.lbl}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--white)' }}>{fmt(st.total)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 12, color: 'var(--gray3)' }}>{st.logrado !== null ? fmt(st.logrado) : '—'}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: pctColor(st.pct) }}>{st.pct !== null ? fmtPct(st.pct) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Gráficas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {filteredStats.map((st, idx) => (
              <div key={idx} className="scc">
                <div className="sctitle">{st.lbl}</div>
                <StatBarChart labels={labels} data={st.filteredData} color={colorMap[st.c] || RED} height={110} />
              </div>
            ))}
          </div>
        </div>

        {/* ── SECCIÓN 2: Recuperaciones ── */}
        {recEvents.length > 0 && <>
          <SecTitle>Recuperaciones — {recEvents.length} total</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            <StatCard label="Total" value={recEvents.length} />
            <StatCard label="Campo rival" value={recEvents.filter(e => e.campoProRiv === 'Campo rival').length} color={GOLD} />
            <StatCard label="Campo propio" value={recEvents.filter(e => e.campoProRiv !== 'Campo rival').length} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por tipo de acción</div>
              <AccionBar events={recEvents} color={RED} />
            </div>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por zona (1/4 de campo)</div>
              <AccionBar events={recEvents.map(e => ({ ...e, accion: e.cuartoCanpo || 'Sin zona' }))} color={GOLD} />
            </div>
          </div>
        </>}

        {/* ── SECCIÓN 3: Balones perdidos ── */}
        {balEvents.length > 0 && <>
          <SecTitle>Balones Perdidos — {balEvents.length} total</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            <StatCard label="Total" value={balEvents.length} color={RED} />
            <StatCard label="Campo propio" value={balEvents.filter(e => e.campoProRiv !== 'Campo rival').length} />
            <StatCard label="Campo rival" value={balEvents.filter(e => e.campoProRiv === 'Campo rival').length} color={GOLD} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por tipo de acción</div>
              <AccionBar events={balEvents} color={RED} />
            </div>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por zona (1/4 de campo)</div>
              <AccionBar events={balEvents.map(e => ({ ...e, accion: e.cuartoCampo || 'Sin zona' }))} color={WHT} />
            </div>
          </div>
        </>}

        {/* ── SECCIÓN 4: Duelos ── */}
        {dueEvents.length > 0 && <>
          <SecTitle>Duelos — {dueEvents.length} total</SecTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
            <StatCard label="Total" value={dueEvents.length} />
            <StatCard label="Ganados" value={dueEvents.filter(e => e.resultado === 'Ganado').length} color={GRN} />
            <StatCard label="Perdidos" value={dueEvents.filter(e => e.resultado === 'Perdido').length} color={RED} />
            <StatCard
              label="Efectividad"
              value={dueEvents.length ? Math.round(dueEvents.filter(e => e.resultado === 'Ganado').length / dueEvents.length * 100) + '%' : '—'}
              color={GOLD}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por tipo de duelo</div>
              <AccionBar events={dueEvents} color={RED} />
            </div>
            <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>Por zona (1/4 de campo)</div>
              <AccionBar events={dueEvents.map(e => ({ ...e, accion: e.cuartoCampo || 'Sin zona' }))} color={WHT} />
            </div>
          </div>
        </>}

        {/* ── SECCIÓN 5: Mapa de eventos ── */}
        {(recEvents.length > 0 || balEvents.length > 0 || dueEvents.length > 0) && <>
          <SecTitle>Mapa de Eventos</SecTitle>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Módulo:</span>
            {[
              { key: 'recuperaciones', label: 'Recuperaciones', show: recEvents.length > 0 },
              { key: 'balones',        label: 'Balones Perdidos', show: balEvents.length > 0 },
              { key: 'duelos',         label: 'Duelos', show: dueEvents.length > 0 },
            ].filter(m => m.show).map(m => (
              <button key={m.key} onClick={() => setMapaModulo(m.key)} style={{
                padding: '4px 12px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 0.5,
                background: mapaModulo === m.key ? 'var(--red)' : 'var(--s2)',
                color: mapaModulo === m.key ? '#fff' : 'var(--gray3)',
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              {mapaModulo === 'recuperaciones' && (
                <PitchMap
                  events={recEvents}
                  colorFn={e => e.campoProRiv === 'Campo rival' ? GOLD : RED}
                  tooltipFn={e => `${e.accion} — ${e.jornada}`}
                  filters={{}}
                />
              )}
              {mapaModulo === 'balones' && (
                <PitchMap
                  events={balEvents}
                  colorFn={e => e.campoProRiv === 'Campo rival' ? GOLD : RED}
                  tooltipFn={e => `${e.accion} — ${e.jornada}`}
                  filters={{}}
                />
              )}
              {mapaModulo === 'duelos' && (
                <PitchMap
                  events={dueEvents}
                  colorFn={e => e.resultado === 'Ganado' ? GRN : RED}
                  tooltipFn={e => `${e.accion} — ${e.resultado} — ${e.jornada}`}
                  filters={{}}
                />
              )}
            </div>
            <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Leyenda</div>
              {mapaModulo === 'recuperaciones' && <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />Campo propio
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD, flexShrink: 0, display: 'inline-block' }} />Campo rival
                </span>
              </>}
              {mapaModulo === 'balones' && <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />Campo propio
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD, flexShrink: 0, display: 'inline-block' }} />Campo rival
                </span>
              </>}
              {mapaModulo === 'duelos' && <>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: GRN, flexShrink: 0, display: 'inline-block' }} />Ganado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: RED, flexShrink: 0, display: 'inline-block' }} />Perdido
                </span>
              </>}
            </div>
          </div>
        </>}

        {/* ── SECCIÓN 6: Físico ── */}
        {fisicoAgg.count > 0 && <>
          <SecTitle>Datos Físicos — {fisicoAgg.count} partido{fisicoAgg.count !== 1 ? 's' : ''}</SecTitle>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {['total', 'promedio'].map(m => (
              <button key={m} onClick={() => setFisicoMode(m)} style={{
                padding: '4px 14px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
                fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
                background: fisicoMode === m ? GOLD : 'var(--s2)',
                color: fisicoMode === m ? '#111' : 'var(--gray3)',
              }}>{m === 'total' ? 'Total' : 'Promedio/partido'}</button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {FISICO_METRICS.map(m => {
              const v = fisicoVal(m.key)
              return (
                <StatCard
                  key={m.key}
                  label={m.label}
                  value={v > 0 ? (+v.toFixed(1)).toLocaleString() : '—'}
                  sub={m.unit || undefined}
                  color={m.key === 'velocidadMax' ? GOLD : 'var(--white)'}
                />
              )
            })}
          </div>
        </>}

      </div>{/* end printRef */}
    </div>
  )
}
