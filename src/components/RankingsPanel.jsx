import React, { useState, useMemo } from 'react'
import { Bar, Scatter } from 'react-chartjs-2'
import { RED, GOLD, WHT, GRID } from '../utils/chartUtils'

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
    if (labels?.length && !labels.includes(r.jornada)) return
    if (activeTorneos?.length && !activeTorneos.includes(r.torneo)) return
    const eq = r.equipo || r.Equipo || ''
    if (!eq) return
    if (!byTeam[eq]) byTeam[eq] = { equipo: eq, sum: 0, count: 0 }
    byTeam[eq].sum += (r[metricKey] || 0)
    byTeam[eq].count++
  })
  return Object.values(byTeam)
}

// ── Ranking chart ─────────────────────────────────────────────
function RankingChart({ rows, labels, activeTorneos, title, sourceKey }) {
  const metrics    = useMetrics(rows)
  const [metric, setMetric]   = useState(metrics[0] || '')
  const [mode, setMode]       = useState('total') // total | promedio
  const [showJornada, setShowJornada] = useState(false) // false=agregado, true=por jornada

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

  // ── Vista por jornada ──────────────────────────────────────
  const jornadaData = useMemo(() => {
    if (!showJornada) return null
    const jornadas = [...new Set(
      rows.filter(r => (!activeTorneos?.length || activeTorneos.includes(r.torneo))).map(r => r.jornada).filter(Boolean)
    )].sort((a, b) => parseInt(a.replace(/\D/g,'')) - parseInt(b.replace(/\D/g,'')))
    const filtered = labels?.length ? jornadas.filter(j => labels.includes(j)) : jornadas
    const allTeams = [...new Set(rows.map(r => r.equipo || r.Equipo).filter(Boolean))]
    const necaxaVals = filtered.map(j => {
      const row = rows.find(r => r.jornada === j && (r.equipo === NECAXA || r.Equipo === NECAXA) && (!activeTorneos?.length || activeTorneos.includes(r.torneo)))
      return row ? (row[metric] || 0) : 0
    })
    const rankPerJ = filtered.map((j, ji) => {
      const allVals = allTeams.map(eq => {
        const row = rows.find(r => r.jornada === j && (r.equipo === eq || r.Equipo === eq) && (!activeTorneos?.length || activeTorneos.includes(r.torneo)))
        return row ? (row[metric] || 0) : 0
      }).sort((a, b) => b - a)
      const necVal = necaxaVals[ji]
      return allVals.indexOf(necVal) + 1
    })
    return { jornadas: filtered, necaxaVals, rankPerJ }
  }, [showJornada, rows, labels, activeTorneos, metric])

  if (!metrics.length) return <div style={{ color: 'var(--gray)', fontSize: 12, padding: 24 }}>Sin datos disponibles</div>

  const barColors = aggregated.map(t => t.equipo === NECAXA ? RED : 'rgba(255,255,255,0.12)')
  const barH = Math.max(320, aggregated.length * 28)

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
          <button onClick={() => setShowJornada(true)}  style={btnStyle(showJornada)}>Evolución Necaxa</button>
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
      </div>

      {/* Necaxa badge */}
      {!showJornada && necaxaData && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
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
        </div>
      )}

      {/* Chart */}
      {!showJornada ? (
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
      ) : jornadaData && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Valor por jornada */}
            <div>
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Valor Necaxa por jornada</div>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: jornadaData.jornadas,
                    datasets: [{ data: jornadaData.necaxaVals, backgroundColor: RED, borderRadius: 3, _barLabels: true }],
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
              <div style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Posición en el ranking por jornada</div>
              <div style={{ height: 220 }}>
                <Bar
                  data={{
                    labels: jornadaData.jornadas,
                    datasets: [{
                      type: 'line',
                      data: jornadaData.rankPerJ,
                      borderColor: GOLD,
                      backgroundColor: 'transparent',
                      pointBackgroundColor: jornadaData.rankPerJ.map(r => r <= 3 ? GOLD : r <= 9 ? WHT : RED),
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
      if (labels?.length && !labels.includes(r.jornada)) return
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

  const { scatterData, labelsPlugin } = useMemo(() => {
    const scatterData = {
      datasets: [{
        data: points.map(p => ({ x: p.x, y: p.y })),
        pointBackgroundColor: points.map(p => p.equipo === NECAXA ? RED : 'rgba(255,255,255,0.3)'),
        pointBorderColor:     points.map(p => p.equipo === NECAXA ? RED : 'rgba(255,255,255,0.5)'),
        pointRadius:          points.map(p => p.equipo === NECAXA ? 9 : 6),
        pointHoverRadius:     10,
      }],
    }

    const currentPoints = points

    const labelsPlugin = {
      id: 'scatter-labels-' + sourceKey,
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx
        const xScale = chart.scales.x
        const yScale = chart.scales.y

        const avgX = currentPoints.reduce((s, p) => s + p.x, 0) / (currentPoints.length || 1)
        const avgY = currentPoints.reduce((s, p) => s + p.y, 0) / (currentPoints.length || 1)

        const xPx = xScale.getPixelForValue(avgX)
        ctx.save()
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.7
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
        ctx.fillText(`x̄ ${avgX.toFixed(1)}`, xPx, yScale.top + 4)
        ctx.restore()

        const yPx = yScale.getPixelForValue(avgY)
        ctx.save()
        ctx.setLineDash([5, 5])
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 1.5
        ctx.globalAlpha = 0.7
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
        ctx.fillText(`ȳ ${avgY.toFixed(1)}`, xScale.left + 4, yPx - 4)
        ctx.restore()

        const meta = chart.getDatasetMeta(0)
        meta.data.forEach((el, i) => {
          const pt = currentPoints[i]
          if (!pt) return
          const isNecaxa = pt.equipo === NECAXA
          ctx.save()
          ctx.font = `${isNecaxa ? 'bold' : 'normal'} 10px Barlow, sans-serif`
          ctx.fillStyle = isNecaxa ? RED : 'rgba(255,255,255,0.55)'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'bottom'
          ctx.shadowColor = 'rgba(0,0,0,0.8)'
          ctx.shadowBlur = 4
          ctx.fillText(pt.equipo, el.x, el.y - 7)
          ctx.restore()
        })
      }
    }

    return { scatterData, labelsPlugin }
  }, [points])

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
