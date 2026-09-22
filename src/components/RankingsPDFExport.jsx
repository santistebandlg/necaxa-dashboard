import React, { useState } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { RED, GOLD, WHT, GRID } from '../utils/chartUtils' // side-effect: registra los componentes y el plugin de datalabels
import { jKey, formatJornadaLabels, sortJornadaKeysByDate } from '../hooks/useSheetData'
import { loadImage, roundRect } from './PDFExport'

const NECAXA = 'Necaxa'
const CREST_URL = 'https://upload.wikimedia.org/wikipedia/commons/b/b5/Club_Necaxa_Logo.svg'
const W = 2560, H = 1440 // resolución de salida
const DW = 1920, DH = 1080 // sistema de coordenadas de diseño

// ── Funciones puras de datos (misma lógica que RankingChart, sin React) ──
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

function computeAggregated(rows, labels, activeTorneos, metric, mode) {
  const teams = aggregateByTeam(rows, labels, activeTorneos, metric)
  return teams.map(t => ({
    ...t,
    value: mode === 'promedio' && t.count > 0 ? t.sum / t.count : t.sum,
  })).sort((a, b) => b.value - a.value)
}

function computeEvoData(rows, labels, activeTorneos, metric, evoTeam) {
  const filteredRows = rows.filter(r => (!activeTorneos?.length || activeTorneos.includes(r.torneo)))
  const jornadas = sortJornadaKeysByDate(
    [...new Set(filteredRows.map(r => jKey(r.torneo, r.jornada)).filter(Boolean))],
    filteredRows
  )
  const filtered = labels?.length ? jornadas.filter(j => labels.includes(j)) : jornadas
  const allTeams = [...new Set(rows.map(r => r.equipo || r.Equipo).filter(Boolean))]
  const missing = []
  const teamVals = filtered.map(j => {
    const row = rows.find(r => jKey(r.torneo, r.jornada) === j && (r.equipo === evoTeam || r.Equipo === evoTeam))
    if (!row) missing.push(j)
    return row ? (row[metric] || 0) : 0
  })
  const rankPerJ = filtered.map((j, ji) => {
    const allVals = allTeams.map(eq => {
      const row = rows.find(r => jKey(r.torneo, r.jornada) === j && (r.equipo === eq || r.Equipo === eq))
      return row ? (row[metric] || 0) : 0
    }).sort((a, b) => b - a)
    return allVals.indexOf(teamVals[ji]) + 1
  })
  return {
    jornadas: filtered,
    jornadasDisplay: formatJornadaLabels(filtered),
    teamVals, rankPerJ,
    missingDisplay: formatJornadaLabels(missing),
  }
}

// ── Renderiza un Chart.js a imagen, sin montarlo en el DOM visible ──
function chartToImage(config, width, height) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.position = 'fixed'
    canvas.style.left = '-99999px'
    canvas.style.top = '0'
    document.body.appendChild(canvas)
    const chart = new ChartJS(canvas, {
      ...config,
      options: { ...config.options, responsive: false, animation: false, devicePixelRatio: 1 },
    })
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const url = canvas.toDataURL('image/png')
        chart.destroy()
        document.body.removeChild(canvas)
        resolve(url)
      })
    })
  })
}

async function rankingBarImage(aggregated, compareTeam, width, height) {
  const colors = aggregated.map(t =>
    t.equipo === NECAXA ? RED : (compareTeam && t.equipo === compareTeam ? GOLD : 'rgba(255,255,255,0.18)')
  )
  const url = await chartToImage({
    type: 'bar',
    data: {
      labels: aggregated.map(t => t.equipo),
      datasets: [{ data: aggregated.map(t => +t.value.toFixed(2)), backgroundColor: colors, borderRadius: 3, _barLabels: true }],
    },
    options: {
      indexAxis: 'y', maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: GRID, beginAtZero: true, ticks: { color: '#888', font: { size: 20 } } },
        y: { grid: { display: false }, ticks: {
          color: (ctx) => aggregated[ctx.index]?.equipo === NECAXA ? '#fff' : (compareTeam && aggregated[ctx.index]?.equipo === compareTeam ? GOLD : '#888'),
          font: { size: 20 },
        } },
      },
    },
  }, width, height)
  return url
}

async function evoImages(evo, evoColor, width, height) {
  const valUrl = await chartToImage({
    type: 'bar',
    data: { labels: evo.jornadasDisplay, datasets: [{ data: evo.teamVals, backgroundColor: evoColor, borderRadius: 3, _barLabels: true }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: GRID, ticks: { color: '#888', font: { size: 18 } } },
        y: { grid: GRID, beginAtZero: true, ticks: { color: '#888', font: { size: 18 } } },
      },
    },
  }, width, height)
  const rankUrl = await chartToImage({
    type: 'line',
    data: {
      labels: evo.jornadasDisplay,
      datasets: [{
        data: evo.rankPerJ, borderColor: evoColor, backgroundColor: 'transparent',
        pointBackgroundColor: evoColor, pointRadius: 7, pointHoverRadius: 9, borderWidth: 3, tension: 0.3, _intLine: true,
      }],
    },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: GRID, ticks: { color: '#888', font: { size: 18 } } },
        y: { grid: GRID, reverse: true, min: 1, ticks: { stepSize: 1, color: '#888', font: { size: 18 } } },
      },
    },
  }, width, height)
  return { valUrl, rankUrl }
}

// ── Dibuja una página completa por métrica ──────────────────────────────
async function drawMetricPage(ctx, crestImg, params) {
  const {
    metric, jornadaLabel, aggregated, necaxaData, necaxaRank, compareTeam, compareData, compareRank,
    includeTable, includeChart, includeEvo, evo, evoTeam, evoColor,
  } = params
  const PAD = 40

  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, DH)

  // Header
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#888'
  ctx.font = `700 20px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('PRE PARTIDO', PAD, 40)
  ctx.textAlign = 'right'
  ctx.fillText('RANKINGS', DW - PAD, 40)
  if (evo?.missingDisplay?.length) {
    ctx.font = `italic 600 18px "Barlow", sans-serif`
    ctx.fillStyle = '#ccc'
    ctx.fillText(`*No se cuenta con datos de la ${evo.missingDisplay.join(', ')}*`, DW - PAD, 76)
  }
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, 56)
  ctx.lineTo(DW - PAD, 56)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#f0f0f0'
  ctx.font = `900 52px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(metric.toUpperCase(), PAD, 130)
  ctx.fillStyle = '#888'
  ctx.font = `600 22px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(jornadaLabel, PAD, 162)

  // Escudo arriba a la derecha, debajo de "RANKINGS"
  if (crestImg) {
    const cw = 70, ch = 70 * (crestImg.naturalHeight / crestImg.naturalWidth)
    ctx.drawImage(crestImg, DW - PAD - cw, DH - PAD - ch, cw, ch)
  }

  // Badges
  const badgeY = 195, badgeH = 70
  const drawBadge = (x, rank, teamLabel, value, color) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    roundRect(ctx, x, badgeY, 330, badgeH, 4)
    ctx.stroke()
    ctx.textAlign = 'left'
    ctx.fillStyle = '#999'
    ctx.font = `600 13px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.fillText(`RANKING ${teamLabel.toUpperCase()}`, x + 16, badgeY + 22)
    ctx.fillStyle = '#fff'
    ctx.font = `900 30px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.fillText(`#${rank}`, x + 16, badgeY + 54)
    ctx.font = `500 14px "Barlow", sans-serif`
    ctx.fillStyle = '#999'
    ctx.fillText(`de ${aggregated.length}`, x + 16 + ctx.measureText(`#${rank}`).width + 8, badgeY + 54)
    ctx.strokeStyle = '#333'
    ctx.beginPath()
    ctx.moveTo(x + 170, badgeY + 12)
    ctx.lineTo(x + 170, badgeY + 58)
    ctx.stroke()
    ctx.fillStyle = '#999'
    ctx.font = `600 13px "Barlow Condensed", "Arial Narrow", sans-serif`
    const metricShort = metric.length > 22 ? metric.slice(0, 20) + '…' : metric
    ctx.fillText(metricShort.toUpperCase(), x + 186, badgeY + 22)
    ctx.fillStyle = color
    ctx.font = `900 24px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.fillText(value.toFixed(2), x + 186, badgeY + 54)
  }
  if (necaxaData) drawBadge(PAD, necaxaRank, 'Necaxa', necaxaData.value, RED)
  if (compareData) drawBadge(PAD + 350, compareRank, compareTeam, compareData.value, GOLD)

  const contentY = badgeY + badgeH + 30
  const leftW = includeTable ? 760 : 0
  const rightX = PAD + leftW + (includeTable ? 30 : 0)
  const rightW = DW - PAD - rightX

  // Tabla
  if (includeTable) {
    const rowH = 27
    const headerH = 32
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.strokeRect(PAD, contentY, leftW, headerH + aggregated.length * rowH)
    ctx.fillStyle = '#161616'
    ctx.fillRect(PAD, contentY, leftW, headerH)
    ctx.fillStyle = '#888'
    ctx.font = `600 11px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.textAlign = 'left'
    ctx.fillText('#', PAD + 14, contentY + 20)
    ctx.fillText('EQUIPO', PAD + 50, contentY + 20)
    ctx.textAlign = 'right'
    ctx.fillText(metric.toUpperCase(), PAD + leftW - 14, contentY + 20)
    aggregated.forEach((t, idx) => {
      const y = contentY + headerH + idx * rowH
      const isN = t.equipo === NECAXA
      const isC = compareTeam && t.equipo === compareTeam
      if (isN) { ctx.fillStyle = 'rgba(200,26,26,0.16)'; ctx.fillRect(PAD, y, leftW, rowH) }
      else if (isC) { ctx.fillStyle = 'rgba(232,184,50,0.14)'; ctx.fillRect(PAD, y, leftW, rowH) }
      else if (idx % 2 === 1) { ctx.fillStyle = 'rgba(255,255,255,0.02)'; ctx.fillRect(PAD, y, leftW, rowH) }
      ctx.textAlign = 'left'
      ctx.fillStyle = '#777'
      ctx.font = `500 13px "Barlow", sans-serif`
      ctx.fillText(String(idx + 1), PAD + 14, y + 19)
      ctx.fillStyle = isN ? '#fff' : isC ? GOLD : '#ccc'
      ctx.font = `${isN || isC ? '700' : '400'} 13px "Barlow", sans-serif`
      ctx.fillText(t.equipo, PAD + 50, y + 19)
      ctx.textAlign = 'right'
      ctx.fillStyle = isN ? RED : isC ? GOLD : '#eee'
      ctx.font = `700 14px "Barlow", sans-serif`
      ctx.fillText(t.value.toFixed(2), PAD + leftW - 14, y + 19)
    })
  }

  // Gráfica de ranking + evolución (columna derecha)
  if (includeChart || includeEvo) {
    let cy = contentY
    if (includeChart) {
      const chartH = includeEvo ? 560 : (headerHeightFor(aggregated.length))
      const img = await loadImage(await rankingBarImage(aggregated, compareTeam, rightW * (W / DW), chartH * (W / DW))).catch(() => null)
      if (img) {
        ctx.fillStyle = '#131313'
        roundRect(ctx, rightX, cy, rightW, chartH, 4)
        ctx.fill()
        ctx.drawImage(img, rightX, cy, rightW, chartH)
      }
      cy += chartH + 20
    }
    if (includeEvo && evo) {
      const evoH = DH - PAD - cy
      const halfW = (rightW - 16) / 2
      const { valUrl, rankUrl } = await evoImages(evo, evoColor, halfW * (W / DW), evoH * (W / DW))
      const titles = [`VALOR ${evoTeam.toUpperCase()} POR JORNADA`, `POSICIÓN DE ${evoTeam.toUpperCase()} POR JORNADA`]
      for (const [i, src] of [valUrl, rankUrl].entries()) {
        const x = rightX + i * (halfW + 16)
        ctx.fillStyle = '#131313'
        roundRect(ctx, x, cy, halfW, evoH, 4)
        ctx.fill()
        ctx.fillStyle = '#888'
        ctx.font = `600 12px "Barlow Condensed", "Arial Narrow", sans-serif`
        ctx.textAlign = 'left'
        ctx.fillText(titles[i], x + 10, cy + 18)
        const img = await loadImage(src).catch(() => null)
        if (img) ctx.drawImage(img, x + 4, cy + 26, halfW - 8, evoH - 32)
      }
    }
  }
}

function headerHeightFor(n) { return Math.min(760, Math.max(400, n * 26)) }

export async function generateRankingsPDF(jobs, onProgress) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true })
  const crestImg = await loadImage(CREST_URL).catch(() => null)

  for (let i = 0; i < jobs.length; i++) {
    onProgress?.(Math.round((i / jobs.length) * 100), `${jobs[i].metric} (${i + 1}/${jobs.length})...`)
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.scale(W / DW, H / DH)
    await drawMetricPage(ctx, crestImg, jobs[i])
    const imgData = canvas.toDataURL('image/png')
    if (i > 0) doc.addPage([W, H], 'landscape')
    doc.addImage(imgData, 'PNG', 0, 0, W, H)
  }
  onProgress?.(100, 'Guardando...')
  doc.save('Necaxa_Rankings_Pre_Partido.pdf')
}

// ── UI: selector de métricas + visualizaciones por métrica ──────────────
export default function RankingsPDFBuilder({ rows, labels, activeTorneos, metrics, mode, compareTeam, jornadaLabel }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState({}) // { [metric]: { table, chart, evo } }
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')

  const toggleMetric = (m) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[m]) delete next[m]
      else next[m] = { table: true, chart: true, evo: true }
      return next
    })
  }
  const toggleVis = (m, key) => {
    setSelected(prev => ({ ...prev, [m]: { ...prev[m], [key]: !prev[m][key] } }))
  }
  const selectAll = () => {
    const next = {}
    metrics.forEach(m => { next[m] = { table: true, chart: true, evo: true } })
    setSelected(next)
  }
  const clearAll = () => setSelected({})

  const selectedMetrics = Object.keys(selected)

  const handleGenerate = async () => {
    if (!selectedMetrics.length) return
    setLoading(true)
    setProgress(0)
    setMsg('Iniciando...')
    try {
      const jobs = selectedMetrics.map(metric => {
        const aggregated = computeAggregated(rows, labels, activeTorneos, metric, mode)
        const necaxaRank  = aggregated.findIndex(t => t.equipo === NECAXA) + 1
        const necaxaData  = aggregated.find(t => t.equipo === NECAXA)
        const compareRank = compareTeam ? aggregated.findIndex(t => t.equipo === compareTeam) + 1 : 0
        const compareData = compareTeam ? aggregated.find(t => t.equipo === compareTeam) : null
        const evoTeam  = compareTeam || NECAXA
        const evoColor = compareTeam ? GOLD : RED
        const vis = selected[metric]
        const evo = vis.evo ? computeEvoData(rows, labels, activeTorneos, metric, evoTeam) : null
        return {
          metric, jornadaLabel, aggregated, necaxaData, necaxaRank, compareTeam, compareData, compareRank,
          includeTable: !!vis.table, includeChart: !!vis.chart, includeEvo: !!vis.evo,
          evo, evoTeam, evoColor,
        }
      })
      await generateRankingsPDF(jobs, (pct, m) => { setProgress(pct); setMsg(m) })
    } catch (e) {
      console.error('PDF error:', e)
      setMsg('Error — revisa la consola')
    } finally {
      setTimeout(() => { setLoading(false); setProgress(0); setMsg('') }, 1500)
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'var(--red)' : 'var(--s3)', border: '1px solid var(--border)', borderRadius: 4,
          color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, cursor: 'pointer',
        }}
      >📄 Generar PDF (Pre Partido)</button>

      {open && (
        <div style={{ marginTop: 12, background: '#131313', border: '1px solid var(--border)', borderRadius: 6, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Elige las métricas y qué incluir de cada una
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--gray3)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Marcar todo</button>
              <button onClick={clearAll} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--gray3)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Limpiar</button>
            </div>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: '#1a1a1a' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase' }}>Métrica</th>
                  <th style={{ padding: '6px 10px', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase' }}>Tabla</th>
                  <th style={{ padding: '6px 10px', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase' }}>Ranking</th>
                  <th style={{ padding: '6px 10px', fontSize: 9, color: 'var(--gray2)', letterSpacing: 1, textTransform: 'uppercase' }}>Evolución</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(m => {
                  const on = !!selected[m]
                  return (
                    <tr key={m} style={{ borderTop: '1px solid var(--border)', background: on ? 'rgba(200,26,26,0.08)' : 'transparent' }}>
                      <td style={{ padding: '6px 10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: on ? '#fff' : 'var(--gray3)' }}>
                          <input type="checkbox" checked={on} onChange={() => toggleMetric(m)} />
                          {m}
                        </label>
                      </td>
                      {['table', 'chart', 'evo'].map(key => (
                        <td key={key} style={{ textAlign: 'center', padding: '6px 10px' }}>
                          <input
                            type="checkbox"
                            disabled={!on}
                            checked={on ? !!selected[m][key] : false}
                            onChange={() => toggleVis(m, key)}
                          />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedMetrics.length}
              style={{
                background: loading || !selectedMetrics.length ? 'var(--s2)' : 'var(--red)', border: 'none', borderRadius: 4,
                color: '#fff', padding: '8px 18px', fontSize: 13, fontWeight: 700,
                fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
                cursor: loading || !selectedMetrics.length ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
              }}
            >
              {loading ? '⏳ Generando...' : `Descargar PDF (${selectedMetrics.length} métrica${selectedMetrics.length !== 1 ? 's' : ''})`}
            </button>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 140, height: 4, background: '#2f2f2f', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: 'var(--red)', borderRadius: 2, transition: 'width .3s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--gray)' }}>{msg}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
