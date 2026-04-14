import React, { useState, useMemo } from 'react'
import { Bar, Scatter } from 'react-chartjs-2'
import { RED, GOLD, WHT, GRID } from '../utils/chartUtils'

const NECAXA = 'Necaxa'
const EXCLUDE_COLS = ['jugador','equipo','posicion','jornada','temporada','liga']

function useMetrics(rows) {
  return useMemo(() => {
    if (!rows?.length) return []
    const first = rows[0]
    return Object.keys(first).filter(k => !EXCLUDE_COLS.includes(k) && typeof first[k] === 'number')
  }, [rows])
}

function aggregateByPlayer(rows, labels, activeTorneos, metricKey) {
  const byPlayer = {}
  rows.forEach(r => {
    if (labels?.length && !labels.includes(r.jornada)) return
    if (activeTorneos?.length && !activeTorneos.includes(r.temporada)) return
    const key = r.jugador + '|' + r.equipo
    if (!byPlayer[key]) byPlayer[key] = {
      jugador: r.jugador, equipo: r.equipo, posicion: r.posicion,
      edad: r['Edad'], minutos: r['Minutos jugados'] || r['Minutos'],
      sum: 0, count: 0
    }
    byPlayer[key].sum += (r[metricKey] || 0)
    byPlayer[key].count++
    // Keep max minutos and latest edad
    if (r['Minutos jugados']) byPlayer[key].minutos = (byPlayer[key].minutos || 0) + r['Minutos jugados']
    if (r['Edad']) byPlayer[key].edad = r['Edad']
  })
  return Object.values(byPlayer).map(p => ({ ...p, value: p.sum }))
}

// ── Simple dropdown filter ────────────────────────────────────
function FilterDropdown({ label, options, value, onChange, color = 'var(--red)' }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef()
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--s2)', border: `1px solid ${open ? color : 'var(--border)'}`,
        borderRadius: 3, padding: '7px 12px', cursor: 'pointer',
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
        fontSize: 13, letterSpacing: 1, color: 'var(--white)',
        minWidth: 160, justifyContent: 'space-between', transition: 'border-color .15s',
      }}>
        <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>{label}:</span>
        <span>{value}</span>
        <span style={{ color: 'var(--gray)', fontSize: 11, marginLeft: 4 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
          background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)', overflow: 'hidden', maxHeight: 280, overflowY: 'auto', minWidth: 180,
        }}>
          {options.map(opt => (
            <div key={opt} onClick={() => { onChange(opt); setOpen(false) }} style={{
              padding: '9px 14px', cursor: 'pointer', fontSize: 12,
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: value === opt ? 700 : 400,
              color: value === opt ? '#fff' : 'var(--gray3)',
              background: value === opt ? 'rgba(200,26,26,.15)' : 'none',
              borderBottom: '1px solid var(--border)',
            }}
              onMouseEnter={e => e.currentTarget.style.background = value === opt ? 'rgba(200,26,26,.2)' : 'var(--s2)'}
              onMouseLeave={e => e.currentTarget.style.background = value === opt ? 'rgba(200,26,26,.15)' : 'none'}
            >{opt}</div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Multi-select for highlighting players ─────────────────────
function PlayerMultiSelect({ allPlayers, selected, onChange }) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const ref = React.useRef()
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = allPlayers.filter(p => p.toLowerCase().includes(search.toLowerCase()))
  const toggle = (p) => onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  const label = selected.length === 0 ? 'Ninguno' : selected.length === 1 ? selected[0] : `${selected.length} jugadores`

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--s2)', border: `1px solid ${open ? GOLD : 'var(--border)'}`,
        borderRadius: 3, padding: '7px 12px', cursor: 'pointer',
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700,
        fontSize: 13, letterSpacing: 1, color: 'var(--white)',
        minWidth: 200, justifyContent: 'space-between', transition: 'border-color .15s',
      }}>
        <span style={{ fontSize: 10, color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>Destacar:</span>
        <span>{label}</span>
        <span style={{ color: 'var(--gray)', fontSize: 11, marginLeft: 4 }}>{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300,
          background: '#1a1a1a', border: '1px solid var(--border)', borderRadius: 4,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)', overflow: 'hidden', width: 260,
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar jugador..."
              style={{
                width: '100%', boxSizing: 'border-box', background: '#111',
                border: '1px solid var(--border)', borderRadius: 3, padding: '5px 8px',
                color: 'var(--white)', fontSize: 12, fontFamily: "'Barlow', sans-serif",
              }}
            />
          </div>
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => onChange([])} style={{
              width: '100%', background: 'none', border: 'none', color: 'var(--gray3)',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 11,
              letterSpacing: 1, padding: '7px 14px', cursor: 'pointer', textTransform: 'uppercase', textAlign: 'left',
            }}>Limpiar selección</button>
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {filtered.map(p => {
              const isSel = selected.includes(p)
              return (
                <div key={p} onClick={() => toggle(p)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: 'pointer',
                  background: isSel ? 'rgba(232,184,50,.1)' : 'none', borderBottom: '1px solid var(--border)',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = isSel ? 'rgba(232,184,50,.18)' : 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.background = isSel ? 'rgba(232,184,50,.1)' : 'none'}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 2, flexShrink: 0,
                    border: `2px solid ${isSel ? GOLD : 'var(--gray2)'}`,
                    background: isSel ? GOLD : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isSel && <span style={{ color: '#111', fontSize: 9, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: isSel ? 700 : 400, fontSize: 12, color: isSel ? GOLD : 'var(--gray3)' }}>{p}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ranking bar chart ─────────────────────────────────────────
function PlayerRankingChart({ rows, labels, activeTorneos, highlightPlayers, posFilter, edadFilter, minsFilter }) {
  const metrics = useMetrics(rows)
  const [metric, setMetric] = useState(metrics[0] || '')
  const [topN, setTopN]     = useState(20)

  React.useEffect(() => { if (metrics.length && !metrics.includes(metric)) setMetric(metrics[0]) }, [metrics])

  const aggregated = useMemo(() => {
    const data = aggregateByPlayer(rows, labels, activeTorneos, metric)
    return data
      .filter(p => posFilter === 'Todas' || p.posicion === posFilter)
      .filter(p => {
        if (edadFilter === 'Todas') return true
        const [min, max] = edadFilter.split('-').map(Number)
        return p.edad >= min && p.edad <= (max || 99)
      })
      .filter(p => {
        if (minsFilter === 'Todos') return true
        const [min] = minsFilter.split('+').map(Number)
        return (p.minutos || 0) >= min
      })
      .sort((a, b) => b.value - a.value)
  }, [rows, labels, activeTorneos, metric, posFilter, edadFilter, minsFilter])

  const displayed = aggregated.slice(0, topN)
  const necaxaPlayers = aggregated.filter(p => p.equipo === NECAXA).slice(0, 6)

  const getColor = (p) => {
    if (p.equipo === NECAXA) return RED
    if (highlightPlayers.includes(p.jugador)) return GOLD
    return 'rgba(255,255,255,0.1)'
  }

  if (!metrics.length) return <div style={{ color: 'var(--gray)', fontSize: 12, padding: 24 }}>Sin datos</div>

  const barH = Math.max(400, displayed.length * 26)

  const btnStyle = (active) => ({
    padding: '3px 12px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 0.5,
    background: active ? 'var(--red)' : 'var(--s2)', color: active ? '#fff' : 'var(--gray3)',
  })

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 20, marginBottom: 24 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 16 }}>Ranking Jugadores Liga MX</div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {/* Top N */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[10, 20, 50, 100].map(n => (
            <button key={n} onClick={() => setTopN(n)} style={btnStyle(topN === n)}>Top {n}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        {/* Metric */}
        <select value={metric} onChange={e => setMetric(e.target.value)} style={{
          background: '#111', border: '1px solid var(--border)', borderRadius: 4,
          color: 'var(--white)', padding: '5px 10px', fontSize: 12,
          fontFamily: "'Barlow', sans-serif", cursor: 'pointer', maxWidth: 300,
        }}>
          {metrics.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Necaxa badges */}
      {necaxaPlayers.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {necaxaPlayers.map(p => {
            const rank = aggregated.findIndex(x => x.jugador === p.jugador && x.equipo === p.equipo) + 1
            return (
              <div key={p.jugador} style={{
                background: '#1a1a1a', border: `1px solid ${RED}`, borderRadius: 6,
                padding: '8px 14px', display: 'flex', gap: 10, alignItems: 'center',
              }}>
                <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1 }}>#{rank}</span>
                <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: RED }}>{p.jugador}</span>
                <span style={{ fontSize: 12, color: 'var(--white)', fontWeight: 700 }}>{p.value.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ height: barH }}>
        <Bar
          data={{
            labels: displayed.map(p => `${p.jugador} (${p.equipo})`),
            datasets: [{
              data: displayed.map(p => +p.value.toFixed(2)),
              backgroundColor: displayed.map(p => getColor(p)),
              borderRadius: 3, _barLabels: true,
            }],
          }}
          options={{
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: GRID, beginAtZero: true },
              y: { grid: { display: false }, ticks: {
                color: (ctx) => {
                  const p = displayed[ctx.index]
                  if (!p) return '#666'
                  if (p.equipo === NECAXA) return '#fff'
                  if (highlightPlayers.includes(p.jugador)) return GOLD
                  return '#555'
                },
                font: { size: 10 },
              }},
            },
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray3)' }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: RED, display: 'inline-block' }} />Jugadores Necaxa
        </span>
        {highlightPlayers.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray3)' }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: GOLD, display: 'inline-block' }} />Destacados
          </span>
        )}
      </div>
    </div>
  )
}

// ── Scatter chart ─────────────────────────────────────────────
function PlayerScatterChart({ rows, labels, activeTorneos, highlightPlayers, posFilter, edadFilter, minsFilter }) {
  const metrics  = useMetrics(rows)
  const [metricX, setMetricX] = useState(metrics[0] || '')
  const [metricY, setMetricY] = useState(metrics[1] || '')

  React.useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(metricX)) setMetricX(metrics[0])
    if (metrics.length > 1 && !metrics.includes(metricY)) setMetricY(metrics[1])
  }, [metrics])

  const points = useMemo(() => {
    const byPlayer = {}
    rows.forEach(r => {
      if (labels?.length && !labels.includes(r.jornada)) return
      if (activeTorneos?.length && !activeTorneos.includes(r.temporada)) return
      const key = r.jugador + '|' + r.equipo
      if (!byPlayer[key]) byPlayer[key] = {
        jugador: r.jugador, equipo: r.equipo, posicion: r.posicion,
        edad: r['Edad'], minutos: 0, sumX: 0, sumY: 0,
      }
      byPlayer[key].sumX += (r[metricX] || 0)
      byPlayer[key].sumY += (r[metricY] || 0)
      if (r['Minutos jugados']) byPlayer[key].minutos += r['Minutos jugados']
      if (r['Edad']) byPlayer[key].edad = r['Edad']
    })
    return Object.values(byPlayer)
      .filter(p => posFilter === 'Todas' || p.posicion === posFilter)
      .filter(p => {
        if (edadFilter === 'Todas') return true
        const [min, max] = edadFilter.split('-').map(Number)
        return p.edad >= min && p.edad <= (max || 99)
      })
      .filter(p => {
        if (minsFilter === 'Todos') return true
        const [min] = minsFilter.split('+').map(Number)
        return (p.minutos || 0) >= min
      })
      .map(p => ({ jugador: p.jugador, equipo: p.equipo, x: p.sumX, y: p.sumY }))
  }, [rows, labels, activeTorneos, metricX, metricY, posFilter, edadFilter, minsFilter])

  const pointsRef = React.useRef(points)
  React.useEffect(() => { pointsRef.current = points }, [points])

  const getPointColor = (p) => {
    if (p.equipo === NECAXA) return RED
    if (highlightPlayers.includes(p.jugador)) return GOLD
    return 'rgba(255,255,255,0.2)'
  }

  const scatterData = useMemo(() => ({
    datasets: [{
      data: points.map(p => ({ x: p.x, y: p.y })),
      pointBackgroundColor: points.map(p => getPointColor(p)),
      pointBorderColor:     points.map(p => getPointColor(p)),
      pointRadius:          points.map(p => p.equipo === NECAXA ? 9 : highlightPlayers.includes(p.jugador) ? 8 : 4),
      pointHoverRadius: 10,
    }],
  }), [points, highlightPlayers])

  const labelsPlugin = React.useMemo(() => ({
    id: 'scatter-player-labels',
    afterRender(chart) {
      const ctx = chart.ctx
      const xScale = chart.scales.x
      const yScale = chart.scales.y
      if (!xScale || !yScale) return
      const pts = pointsRef.current
      const ax = pts.reduce((s, p) => s + p.x, 0) / (pts.length || 1)
      const ay = pts.reduce((s, p) => s + p.y, 0) / (pts.length || 1)

      const xPx = xScale.getPixelForValue(ax)
      ctx.save()
      ctx.setLineDash([6, 4]); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.moveTo(xPx, yScale.top); ctx.lineTo(xPx, yScale.bottom); ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1
      ctx.font = 'bold 10px Barlow, sans-serif'; ctx.fillStyle = GOLD
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'
      ctx.fillText(`x̄ ${ax.toFixed(1)}`, xPx, yScale.top + 4)
      ctx.restore()

      const yPx = yScale.getPixelForValue(ay)
      ctx.save()
      ctx.setLineDash([6, 4]); ctx.strokeStyle = GOLD; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.7
      ctx.beginPath(); ctx.moveTo(xScale.left, yPx); ctx.lineTo(xScale.right, yPx); ctx.stroke()
      ctx.setLineDash([]); ctx.globalAlpha = 1
      ctx.font = 'bold 10px Barlow, sans-serif'; ctx.fillStyle = GOLD
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'
      ctx.fillText(`ȳ ${ay.toFixed(1)}`, xScale.left + 4, yPx - 4)
      ctx.restore()

      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((el, i) => {
        const pt = pts[i]
        if (!pt) return
        const isNecaxa = pt.equipo === NECAXA
        const isHighlight = highlightPlayers.includes(pt.jugador)
        if (!isNecaxa && !isHighlight) return
        ctx.save()
        ctx.font = 'bold 10px Barlow, sans-serif'
        ctx.fillStyle = isNecaxa ? RED : GOLD
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 3
        ctx.fillText(pt.jugador, el.x, el.y - 7)
        ctx.restore()
      })
    }
  }), [highlightPlayers])

  if (!metrics.length) return null

  const selStyle = {
    background: '#111', border: '1px solid var(--border)', borderRadius: 4,
    color: 'var(--white)', padding: '5px 10px', fontSize: 12,
    fontFamily: "'Barlow', sans-serif", cursor: 'pointer', maxWidth: 260,
  }

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 20, marginTop: 16 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 16 }}>Jugadores Liga MX — Dispersión</div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase' }}>Eje X:</span>
          <select value={metricX} onChange={e => setMetricX(e.target.value)} style={selStyle}>
            {metrics.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase' }}>Eje Y:</span>
          <select value={metricY} onChange={e => setMetricY(e.target.value)} style={selStyle}>
            {metrics.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div style={{ height: 480 }}>
        <Scatter
          data={scatterData}
          options={{
            responsive: true, maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const pt = points[ctx.dataIndex]
                    return `${pt?.jugador} (${pt?.equipo}): (${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`
                  }
                }
              }
            },
            scales: {
              x: { grid: GRID, title: { display: true, text: metricX, color: '#fff', font: { size: 11 } } },
              y: { grid: GRID, title: { display: true, text: metricY, color: '#fff', font: { size: 11 } } },
            },
          }}
          plugins={[labelsPlugin]}
        />
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray3)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: RED, display: 'inline-block' }} />Necaxa
        </span>
        {highlightPlayers.length > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray3)' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: GOLD, display: 'inline-block' }} />Destacados
          </span>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function RankingJugadoresPanel({ raw, labels, activeTorneos }) {
  const rows = raw?.jugadoresliga || []
  const [highlightPlayers, setHighlightPlayers] = useState([])
  const [posFilter,  setPosFilter]  = useState('Todas')
  const [edadFilter, setEdadFilter] = useState('Todas')
  const [minsFilter, setMinsFilter] = useState('Todos')

  const allPlayers = useMemo(() => (
    [...new Set(rows.map(r => r.jugador).filter(Boolean))].sort()
  ), [rows])

  const allPositions = useMemo(() => (
    ['Todas', ...[...new Set(rows.map(r => r.posicion).filter(Boolean))].sort()]
  ), [rows])

  const edadOptions  = ['Todas', '16-20', '21-23', '24-26', '27-29', '30-32', '33+']
  const minsOptions  = ['Todos', '90+', '180+', '360+', '540+', '900+', '1350+']

  return (
    <div className="panel">
      {/* Global filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <FilterDropdown label="Posición" options={allPositions} value={posFilter}  onChange={setPosFilter} />
        <FilterDropdown label="Edad"     options={edadOptions}  value={edadFilter} onChange={setEdadFilter} color={GOLD} />
        <FilterDropdown label="Minutos"  options={minsOptions}  value={minsFilter} onChange={setMinsFilter} color={GOLD} />
        <PlayerMultiSelect allPlayers={allPlayers} selected={highlightPlayers} onChange={setHighlightPlayers} />
      </div>

      <PlayerRankingChart
        rows={rows} labels={labels} activeTorneos={activeTorneos}
        highlightPlayers={highlightPlayers}
        posFilter={posFilter} edadFilter={edadFilter} minsFilter={minsFilter}
      />
      <PlayerScatterChart
        rows={rows} labels={labels} activeTorneos={activeTorneos}
        highlightPlayers={highlightPlayers}
        posFilter={posFilter} edadFilter={edadFilter} minsFilter={minsFilter}
      />
    </div>
  )
}
