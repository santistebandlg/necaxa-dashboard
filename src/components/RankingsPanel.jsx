import React, { useState, useMemo } from 'react'
import { Bar, Scatter } from 'react-chartjs-2'
import { RED, GOLD, WHT, GRID } from '../utils/chartUtils'
import { jKey, formatJornadaLabels, sortJornadaKeysByDate } from '../hooks/useSheetData'
import RankingsPDFBuilder from './RankingsPDFExport'

const NECAXA = 'Necaxa'

// Metrics to exclude from selector (non-numeric or identifier columns)
const EXCLUDE_COLS = ['torneo','jornada','fecha','partido','equipo','Torneo','Jornada','Fecha','Partido','Equipo','Competición','Duración','Seleccionar esquema']

function useMetrics(rows) {
  return useMemo(() => {
    if (!rows?.length) return []
    const first = rows[0]
    return Object.keys(first).filter(k => !EXCLUDE_COLS.includes(k) && typeof first[k] === 'number')
  }, [rows])
}

// Aggregate rows per team for selected jornadas/torneos
function aggregateByTeam(rows, labels, activeTorneos, metricKey) {
  const byTeam = {}
  rows.forEach(r => {
    if (labels?.length && !labels.includes(jKey(r.torneo, r.jornada))) return
    if (activeTorneos?.length && !activeTorneos.includes(r.torneo)) return
    const eq = r.equipo || r.Equipo || ''
    if (!eq) return
    if (!byTeam[eq]) byTeam[eq] = { equipo: eq, sum: 0, count: 0 }
    byTeam[eq].sum += (r[metricKey] || 0)
    byTeam[eq].count++
  })
  return Object.values(byTeam)
}

function Switch({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      {label && <span style={{ fontSize: 11, color: 'var(--gray3)', letterSpacing: 0.5 }}>{label}</span>}
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 38, height: 22, borderRadius: 11, position: 'relative',
          background: checked ? RED : '#3a3a3a', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        }} />
      </span>
    </label>
  )
}

// ── Ranking chart ─────────────────────────────────────────────
function RankingChart({ rows, labels, activeTorneos, title, sourceKey }) {
  const metrics    = useMetrics(rows)
  const [metric, setMetric]   = useState(metrics[0] || '')
  const [mode, setMode]       = useState('total') // total | promedio
  const [showJornada, setShowJornada] = useState(false) // false=agregado, true=por jornada
  const [compareTeam, setCompareTeam] = useState('') // '' = ninguno
  const [viewMode, setViewMode]       = useState('chart') // chart | table
  const [sortDir, setSortDir]         = useState('desc')

  // Update default metric when metrics load
  React.useEffect(() => { if (metrics.length && !metrics.includes(metric)) setMetric(metrics[0]) }, [metrics])

  // ── Vista agregada por equipo ──────────────────────────────
  const aggregated = useMemo(() => {
    const teams = aggregateByTeam(rows, labels, activeTorneos, metric)
    return teams.map(t => ({
      ...t,
      value: mode === 'promedio' && t.count > 0 ? t.sum / t.count : t.sum
    })).sort((a, b) => b.value - a.value)
  }, [rows, labels, activeTorneos, metric, mode])

  const necaxaRank  = aggregated.findIndex(t => t.equipo === NECAXA) + 1
  const necaxaData  = aggregated.find(t => t.equipo === NECAXA)
  const compareRank = compareTeam ? aggregated.findIndex(t => t.equipo === compareTeam) + 1 : 0
  const compareData = compareTeam ? aggregated.find(t => t.equipo === compareTeam) : null

  const tableRows = useMemo(() => {
    const arr = [...aggregated]
    arr.sort((a, b) => sortDir === 'desc' ? b.value - a.value : a.value - b.value)
    return arr
  }, [aggregated, sortDir])

  // ── Vista por jornada ──────────────────────────────────────
  const evoTeam  = compareTeam || NECAXA
  const evoColor = compareTeam ? GOLD : RED

  const jornadaData = useMemo(() => {
    if (!showJornada) return null
    const filteredRows = rows.filter(r => (!activeTorneos?.length || activeTorneos.includes(r.torneo)))
    const jornadas = sortJornadaKeysByDate(
      [...new Set(filteredRows.map(r => jKey(r.torneo, r.jornada)).filter(Boolean))],
      filteredRows
    )
    const filtered = labels?.length ? jornadas.filter(j => labels.includes(j)) : jornadas
    const allTeams = [...new Set(rows.map(r => r.equipo || r.Equipo).filter(Boolean))]
    const teamVals = filtered.map(j => {
      const row = rows.find(r => jKey(r.torneo, r.jornada) === j && (r.equipo === evoTeam || r.Equipo === evoTeam))
      return row ? (row[metric] || 0) : 0
    })
    const rankPerJ = filtered.map((j, ji) => {
      const allVals = allTeams.map(eq => {
        const row = rows.find(r => jKey(r.torneo, r.jornada) === j && (r.equipo === eq || r.Equipo === eq))
        return row ? (row[metric] || 0) : 0
      }).sort((a, b) => b - a)
      return allVals.indexOf(teamVals[ji]) + 1
    })
    return { jornadas: filtered, jornadasDisplay: formatJornadaLabels(filtered), teamVals, rankPerJ }
  }, [showJornada, rows, labels, activeTorneos, metric, evoTeam])

  if (!metrics.length) return <div style={{ color: 'var(--gray)', fontSize: 12, padding: 24 }}>Sin datos disponibles</div>

  const barColors = aggregated.map(t =>
    t.equipo === NECAXA ? RED : (compareTeam && t.equipo === compareTeam ? GOLD : 'rgba(255,255,255,0.12)')
  )
  const barH = Math.max(320, aggregated.length * 28)

  const evoLabels = formatJornadaLabels(labels?.length ? labels : [])
  const jornadaLabel = evoLabels.length === 0 ? 'LMX'
    : evoLabels.length === 1 ? `LMX ${evoLabels[0]}`
    : `LMX ${evoLabels[0]} – ${evoLabels[evoLabels.length - 1]}`

  const btnStyle = (active) => ({
    padding: '3px 12px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 0.5,
    background: active ? 'var(--red)' : 'var(--s2)',
    color: active ? '#fff' : 'var(--gray3)',
  })

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 20, marginBottom: 24 }}>
      {/* Title */}
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 16 }}>{title}</div>

      <RankingsPDFBuilder
        rows={rows} labels={labels} activeTorneos={activeTorneos}
        metrics={metrics} mode={mode} compareTeam={compareTeam} jornadaLabel={jornadaLabel}
      />

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        {/* Mode total/promedio */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['total','promedio'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={btnStyle(mode === m)}>
              {m === 'total' ? 'Total' : 'Promedio/partido'}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        {/* Vista agregada / por jornada */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowJornada(false)} style={btnStyle(!showJornada)}>Ranking general</button>
          <button onClick={() => setShowJornada(true)}  style={btnStyle(showJornada)}>Evolución</button>
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        {/* Metric selector */}
        <select
          value={metric}
          onChange={e => setMetric(e.target.value)}
          style={{
            background: '#111', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--white)', padding: '5px 10px', fontSize: 12,
            fontFamily: "'Barlow', sans-serif", cursor: 'pointer', maxWidth: 280,
          }}
        >
          {metrics.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        {/* Comparar con otro equipo */}
        <select
          value={compareTeam}
          onChange={e => setCompareTeam(e.target.value)}
          style={{
            background: '#111', border: `1px solid ${compareTeam ? GOLD : 'var(--border)'}`, borderRadius: 4,
            color: compareTeam ? GOLD : 'var(--white)', padding: '5px 10px', fontSize: 12,
            fontFamily: "'Barlow', sans-serif", cursor: 'pointer', maxWidth: 200,
          }}
        >
          <option value="">Comparar con...</option>
          {aggregated.filter(t => t.equipo !== NECAXA).map(t => (
            <option key={t.equipo} value={t.equipo}>{t.equipo}</option>
          ))}
        </select>

        {!showJornada && <>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <Switch checked={viewMode === 'table'} onChange={v => setViewMode(v ? 'table' : 'chart')} label="Ver tabla" />
        </>}
      </div>

      {/* Necaxa badge + equipo comparado */}
      {!showJornada && (necaxaData || compareData) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {necaxaData && (
            <div style={{ background: '#1a1a1a', border: `1px solid ${RED}`, borderRadius: 6, padding: '10px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase' }}>Ranking Necaxa</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: necaxaRank <= 3 ? GOLD : 'var(--white)', letterSpacing: 1 }}>
                  #{necaxaRank} <span style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 400 }}>de {aggregated.length}</span>
                </div>
              </div>
              <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase' }}>{metric}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color: RED }}>
                  {necaxaData.value.toFixed(2)}
                </div>
              </div>
            </div>
          )}
          {compareData && (
            <div style={{ background: '#1a1a1a', border: `1px solid ${GOLD}`, borderRadius: 6, padding: '10px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase' }}>Ranking {compareData.equipo}</div>
                <div style={{ fontSize: 28, fontWeight: 900, fontFamily: "'Barlow Condensed', sans-serif", color: compareRank <= 3 ? GOLD : 'var(--white)', letterSpacing: 1 }}>
                  #{compareRank} <span style={{ fontSize: 13, color: 'var(--gray)', fontWeight: 400 }}>de {aggregated.length}</span>
                </div>
              </div>
              <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase' }}>{metric}</div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color: GOLD }}>
                  {compareData.value.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart / Tabla */}
      {!showJornada ? (
        viewMode === 'table' ? (
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, maxWidth: 640 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#161616', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600 }}>Equipo</th>
                  <th
                    onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    style={{ padding: '8px 14px', textAlign: 'right', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                    title="Ordenar"
                  >
                    {metric} {sortDir === 'desc' ? '▼' : '▲'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((t, idx) => {
                  const isNecaxa = t.equipo === NECAXA
                  const isCompare = compareTeam && t.equipo === compareTeam
                  return (
                    <tr key={t.equipo} style={{
                      borderBottom: '1px solid var(--border)',
                      background: isNecaxa ? 'rgba(200,26,26,0.12)' : isCompare ? 'rgba(232,184,50,0.10)' : (idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'),
                    }}>
                      <td style={{ padding: '7px 14px', fontSize: 12, color: 'var(--gray)' }}>{idx + 1}</td>
                      <td style={{
                        padding: '7px 14px', fontSize: 12,
                        color: isNecaxa ? '#fff' : isCompare ? GOLD : 'var(--gray3)',
                        fontWeight: isNecaxa || isCompare ? 700 : 400,
                      }}>{t.equipo}</td>
                      <td style={{
                        padding: '7px 14px', textAlign: 'right', fontSize: 13, fontWeight: 700,
                        color: isNecaxa ? RED : isCompare ? GOLD : 'var(--white)',
                      }}>{t.value.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
        <div style={{ height: barH }}>
          <Bar
            data={{
              labels: aggregated.map(t => t.equipo),
              datasets: [{
                data: aggregated.map(t => +t.value.toFixed(2)),
                backgroundColor: barColors,
                borderRadius: 3,
                _barLabels: true,
              }],
            }}
            options={{
              indexAxis: 'y', responsive: true, maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: GRID, beginAtZero: true },
                y: { grid: { display: false }, ticks: { color: (ctx) => aggregated[ctx.index]?.equipo === NECAXA ? '#fff' : '#888', font: { size: 11, weight: (ctx) => aggregated[ctx.index]?.equipo === NECAXA ? 'bold' : 'normal' } } },
              },
            }}
          />
        </div>
        )
      ) : jornadaData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Valor por jornada */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Valor {evoTeam} por jornada</div>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: jornadaData.jornadasDisplay,
                    datasets: [{ label: evoTeam, data: jornadaData.teamVals, backgroundColor: evoColor, borderRadius: 3, _barLabels: true }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } },
                  }}
                />
              </div>
            </div>
            {/* Ranking por jornada */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Posición de {evoTeam} en el ranking por jornada</div>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: jornadaData.jornadasDisplay,
                    datasets: [{
                      type: 'line',
                      label: evoTeam,
                      data: jornadaData.rankPerJ,
                      borderColor: evoColor,
                      backgroundColor: 'transparent',
                      pointBackgroundColor: evoColor,
                      pointRadius: 5,
                      pointHoverRadius: 7,
                      borderWidth: 2,
                      tension: 0.3,
                      _intLine: true,
                    }],
                  }}
                  options={{
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      x: { grid: GRID },
                      y: { grid: GRID, reverse: true, min: 1, ticks: { stepSize: 1 } },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scatter chart ─────────────────────────────────────────────
function ScatterChart({ rows, labels, activeTorneos, title, sourceKey }) {
  const metrics  = useMetrics(rows)
  const [metricX, setMetricX] = useState(metrics[0] || '')
  const [metricY, setMetricY] = useState(metrics[1] || '')
  const [mode, setMode]       = useState('total')

  React.useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(metricX)) setMetricX(metrics[0])
    if (metrics.length > 1 && !metrics.includes(metricY)) setMetricY(metrics[1])
  }, [metrics])

  const points = useMemo(() => {
    const teams = {}
    rows.forEach(r => {
      if (labels?.length && !labels.includes(jKey(r.torneo, r.jornada))) return
      if (activeTorneos?.length && !activeTorneos.includes(r.torneo)) return
      const eq = r.equipo || r.Equipo || ''
      if (!eq) return
      if (!teams[eq]) teams[eq] = { equipo: eq, sumX: 0, sumY: 0, count: 0 }
      teams[eq].sumX += (r[metricX] || 0)
      teams[eq].sumY += (r[metricY] || 0)
      teams[eq].count++
    })
    return Object.values(teams).map(t => ({
      equipo: t.equipo,
      x: mode === 'promedio' && t.count > 0 ? t.sumX / t.count : t.sumX,
      y: mode === 'promedio' && t.count > 0 ? t.sumY / t.count : t.sumY,
    }))
  }, [rows, labels, activeTorneos, metricX, metricY, mode])

  if (!metrics.length) return null

  const btnStyle = (active) => ({
    padding: '3px 12px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 0.5,
    background: active ? 'var(--red)' : 'var(--s2)',
    color: active ? '#fff' : 'var(--gray3)',
  })

  const selStyle = {
    background: '#111', border: '1px solid var(--border)', borderRadius: 4,
    color: 'var(--white)', padding: '5px 10px', fontSize: 12,
    fontFamily: "'Barlow', sans-serif", cursor: 'pointer', maxWidth: 220,
  }

  const pointsRef = React.useRef(points)
  React.useEffect(() => { pointsRef.current = points }, [points])

  const avgX = useMemo(() => points.reduce((s, p) => s + p.x, 0) / (points.length || 1), [points])
  const avgY = useMemo(() => points.reduce((s, p) => s + p.y, 0) / (points.length || 1), [points])

  const scatterData = useMemo(() => ({
    datasets: [{
      data: points.map(p => ({ x: p.x, y: p.y })),
      pointBackgroundColor: points.map(p => p.equipo === NECAXA ? RED : 'rgba(255,255,255,0.3)'),
      pointBorderColor:     points.map(p => p.equipo === NECAXA ? RED : 'rgba(255,255,255,0.5)'),
      pointRadius:          points.map(p => p.equipo === NECAXA ? 9 : 6),
      pointHoverRadius:     10,
    }],
  }), [points])

  // Single stable plugin — reads from ref so always has latest data
  const labelsPlugin = React.useMemo(() => ({
    id: `scatter-labels-${sourceKey}`,
    afterRender(chart) {
      const ctx = chart.ctx
      const xScale = chart.scales.x
      const yScale = chart.scales.y
      if (!xScale || !yScale) return

      const pts = pointsRef.current
      const ax = pts.reduce((s, p) => s + p.x, 0) / (pts.length || 1)
      const ay = pts.reduce((s, p) => s + p.y, 0) / (pts.length || 1)

      // Vertical line (avg X)
      const xPx = xScale.getPixelForValue(ax)
      ctx.save()
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(xPx, yScale.top)
      ctx.lineTo(xPx, yScale.bottom)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.font = 'bold 10px Barlow, sans-serif'
      ctx.fillStyle = GOLD
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`x̄ ${ax.toFixed(1)}`, xPx, yScale.top + 4)
      ctx.restore()

      // Horizontal line (avg Y)
      const yPx = yScale.getPixelForValue(ay)
      ctx.save()
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = GOLD
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.8
      ctx.beginPath()
      ctx.moveTo(xScale.left, yPx)
      ctx.lineTo(xScale.right, yPx)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.globalAlpha = 1
      ctx.font = 'bold 10px Barlow, sans-serif'
      ctx.fillStyle = GOLD
      ctx.textAlign = 'left'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`ȳ ${ay.toFixed(1)}`, xScale.left + 4, yPx - 4)
      ctx.restore()

      // Team name labels
      const meta = chart.getDatasetMeta(0)
      meta.data.forEach((el, i) => {
        const pt = pts[i]
        if (!pt) return
        const isNecaxa = pt.equipo === NECAXA
        ctx.save()
        ctx.font = `${isNecaxa ? 'bold' : 'normal'} 10px Barlow, sans-serif`
        ctx.fillStyle = isNecaxa ? RED : 'rgba(255,255,255,0.6)'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.shadowColor = 'rgba(0,0,0,0.9)'
        ctx.shadowBlur = 3
        ctx.fillText(pt.equipo, el.x, el.y - 7)
        ctx.restore()
      })
    }
  }), [sourceKey])

  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 6, padding: 20, marginTop: 16 }}>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--white)', marginBottom: 16 }}>{title} — Dispersión</div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['total','promedio'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={btnStyle(mode === m)}>
              {m === 'total' ? 'Total' : 'Promedio/partido'}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
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

      {/* Chart */}
      <div style={{ height: 420 }}>
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
                    return `${pt?.equipo}: (${ctx.parsed.x.toFixed(2)}, ${ctx.parsed.y.toFixed(2)})`
                  }
                }
              }
            },
            scales: {
              x: { grid: GRID, title: { display: true, text: metricX, color: 'var(--gray)', font: { size: 11 } } },
              y: { grid: GRID, title: { display: true, text: metricY, color: 'var(--gray)', font: { size: 11 } } },
            },
          }}
          plugins={[labelsPlugin]}
        />
      </div>

      {/* Necaxa highlight */}
      {points.find(p => p.equipo === NECAXA) && (() => {
        const n = points.find(p => p.equipo === NECAXA)
        return (
          <div style={{ display: 'flex', gap: 16, marginTop: 12, alignItems: 'center' }}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: RED, display: 'inline-block' }} />
            <span style={{ fontSize: 12, color: 'var(--gray3)' }}>
              <strong style={{ color: '#fff' }}>Necaxa</strong> — {metricX}: <strong style={{ color: RED }}>{n.x.toFixed(2)}</strong> · {metricY}: <strong style={{ color: RED }}>{n.y.toFixed(2)}</strong>
            </span>
          </div>
        )
      })()}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
export default function RankingsPanel({ raw, labels, activeTorneos }) {
  const ligaRows   = raw?.ligamx      || []
  const fisicoRows = raw?.fisicoliga  || []

  return (
    <div className="panel">
      <RankingChart
        rows={ligaRows}
        labels={labels}
        activeTorneos={activeTorneos}
        title="Ranking Liga MX — Datos de Juego"
        sourceKey="ligamx"
      />
      <ScatterChart
        rows={ligaRows}
        labels={labels}
        activeTorneos={activeTorneos}
        title="Liga MX — Datos de Juego"
        sourceKey="ligamx"
      />
      <div style={{ marginTop: 32 }}>
        <RankingChart
          rows={fisicoRows}
          labels={labels}
          activeTorneos={activeTorneos}
          title="Ranking Liga MX — Datos Físicos"
          sourceKey="fisicoliga"
        />
        <ScatterChart
          rows={fisicoRows}
          labels={labels}
          activeTorneos={activeTorneos}
          title="Liga MX — Datos Físicos"
          sourceKey="fisicoliga"
        />
      </div>
    </div>
  )
}
