import React, { useState } from 'react'
import { Chart as ChartJS } from 'chart.js'
import { RED, GOLD, GRID } from '../utils/chartUtils' // side-effect: registra Chart.js y el plugin de datalabels
import { jKey, jParts, formatJornadaLabels, sortJornadaKeysByDate } from '../hooks/useSheetData'
import { loadImage, roundRect, getTheme, W, H, DW, DH } from './PDFExport'

// ── Datos (mismas funciones puras que RankingsPanel, sin depender de React) ──
function teamValueForPeriod(rows, jornadaKeys, torneoList, metric, team) {
  let sum = 0
  rows.forEach(r => {
    if (jornadaKeys?.length && !jornadaKeys.includes(jKey(r.torneo, r.jornada))) return
    if (torneoList?.length && !torneoList.includes(r.torneo)) return
    if ((r.equipo || r.Equipo) !== team) return
    sum += (r[metric] || 0)
  })
  return sum
}
function teamValueByJornada(rows, jornadaKeys, torneoList, metric, team) {
  return (jornadaKeys || []).map(j => {
    const row = rows.find(r => jKey(r.torneo, r.jornada) === j && (r.equipo || r.Equipo) === team)
    return row ? (row[metric] || 0) : 0
  })
}
function sideSelection(allJornadas, torneos, sideTorneos, sideJIdx) {
  const sideJornadas = (!sideTorneos.length || sideTorneos.length === torneos.length)
    ? allJornadas
    : allJornadas.filter(k => sideTorneos.includes(jParts(k).torneo))
  const effectiveJIdx = sideJIdx.length ? sideJIdx : sideJornadas.map((_, i) => i)
  return effectiveJIdx.map(i => sideJornadas[i]).filter(Boolean)
}
function rangeLabel(selectedKeys) {
  const labels = formatJornadaLabels(selectedKeys)
  if (!labels.length) return 'Sin jornadas'
  if (labels.length === 1) return labels[0]
  return `${labels[0]} – ${labels[labels.length - 1]} (${labels.length})`
}

// ── Gráfica Chart.js en canvas desmontado ──────────────────────────────
function chartToImage(config, width, height) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.style.position = 'fixed'
    canvas.style.left = '-99999px'
    document.body.appendChild(canvas)
    const chart = new ChartJS(canvas, { ...config, options: { ...config.options, responsive: false, animation: false, devicePixelRatio: 1 } })
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const url = canvas.toDataURL('image/png')
      chart.destroy()
      document.body.removeChild(canvas)
      resolve(url)
    }))
  })
}

async function barImage(labels, values, color, width, height, theme) {
  return chartToImage({
    type: 'bar',
    data: { labels, datasets: [{ data: values.map(v => +v.toFixed(2)), backgroundColor: color, borderRadius: 3, _barLabels: true }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: theme.gridColor }, ticks: { color: theme.tickColor, font: { size: 18 } } },
        y: { grid: { color: theme.gridColor }, beginAtZero: true, ticks: { color: theme.tickColor, font: { size: 18 } } },
      },
    },
  }, width, height)
}

// ── Dibujo de una página por métrica ────────────────────────────────────
async function drawH2HMetricPage(ctx, params, theme) {
  const { metric, teamA, rangeA, valueA, seriesA, labelsA, teamB, rangeB, valueB, seriesB, labelsB } = params
  const PAD = 40, HEADER_H = 90

  ctx.fillStyle = theme.pageBg
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = theme.headerBg
  ctx.fillRect(0, 0, DW, HEADER_H)
  if (theme.headerLine !== 'transparent') {
    ctx.strokeStyle = theme.headerLine
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, HEADER_H - 2); ctx.lineTo(DW, HEADER_H - 2); ctx.stroke()
  }
  ctx.fillStyle = theme.accent
  ctx.fillRect(0, HEADER_H - 3, DW, 3)

  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillStyle = theme.textMuted
  ctx.font = `500 18px "Barlow", sans-serif`
  ctx.fillText('FRENTE A FRENTE — EQUIPOS', PAD, HEADER_H * 0.32)
  ctx.fillStyle = theme.textTitle
  ctx.font = `900 40px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(metric.toUpperCase(), PAD, HEADER_H * 0.75)

  const halfW = DW / 2
  const drawHalf = (x0, team, range, value, series, labels, color) => {
    const cardY = HEADER_H + 30
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = color
    ctx.font = `900 34px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.fillText(team.toUpperCase(), x0 + PAD, cardY + 30)
    ctx.fillStyle = theme.textMuted
    ctx.font = `500 16px "Barlow", sans-serif`
    ctx.fillText(range, x0 + PAD, cardY + 56)

    ctx.strokeStyle = color
    ctx.lineWidth = 2
    roundRect(ctx, x0 + PAD, cardY + 74, halfW - PAD * 2, 70, 4)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = color
    ctx.font = `900 40px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.fillText(value.toFixed(2), x0 + halfW / 2, cardY + 122)
  }
  drawHalf(0, teamA, rangeA, valueA, seriesA, labelsA, RED)
  drawHalf(halfW, teamB, rangeB, valueB, seriesB, labelsB, GOLD)

  ctx.strokeStyle = theme.divider
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(halfW, HEADER_H + 20); ctx.lineTo(halfW, DH - 20); ctx.stroke()

  // Gráficas
  const chartY = HEADER_H + 240
  const chartH = DH - chartY - 30
  const chartW = halfW - PAD * 2

  const imgA = await loadImage(await barImage(labelsA, seriesA, RED, chartW * (W / DW), chartH * (W / DW), theme)).catch(() => null)
  const imgB = await loadImage(await barImage(labelsB, seriesB, GOLD, chartW * (W / DW), chartH * (W / DW), theme)).catch(() => null)

  const drawCard = (x0, img) => {
    ctx.fillStyle = theme.cardBg
    roundRect(ctx, x0 + PAD, chartY, chartW, chartH, 4)
    ctx.fill()
    ctx.strokeStyle = theme.cardBorder
    ctx.lineWidth = 1
    ctx.stroke()
    if (img) ctx.drawImage(img, x0 + PAD, chartY, chartW, chartH)
  }
  drawCard(0, imgA)
  drawCard(halfW, imgB)
}

export async function generateTeamH2HPDF(jobs, onProgress, themeMode = 'dark') {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true })
  const theme = getTheme(themeMode)

  for (let i = 0; i < jobs.length; i++) {
    onProgress?.(Math.round((i / jobs.length) * 100), `${jobs[i].metric} (${i + 1}/${jobs.length})...`)
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.scale(W / DW, H / DH)
    await drawH2HMetricPage(ctx, jobs[i], theme)
    const imgData = canvas.toDataURL('image/png')
    if (i > 0) doc.addPage([W, H], 'landscape')
    doc.addImage(imgData, 'PNG', 0, 0, W, H)
  }
  onProgress?.(100, 'Guardando...')
  const safeA = (jobs[0]?.teamA || 'A').replace(/[^\p{L}\p{N}]+/gu, '_')
  const safeB = (jobs[0]?.teamB || 'B').replace(/[^\p{L}\p{N}]+/gu, '_')
  doc.save(`Necaxa_FrenteAFrente_${safeA}_vs_${safeB}.pdf`)
}

// ── UI: selector de métricas + botón ─────────────────────────────────────
export default function TeamH2HPDFBuilder({ rows, metrics, allJornadas, torneos, teamA, torneosA, jIdxA, aggModeA, teamB, torneosB, jIdxB, aggModeB }) {
  const [open, setOpen] = useState(false)
  const [selectedMetrics, setSelectedMetrics] = useState([])
  const [pdfTheme, setPdfTheme] = useState('dark')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')

  const toggleMetric = (m) => setSelectedMetrics(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  const selectAll = () => setSelectedMetrics(metrics)
  const clearAll = () => setSelectedMetrics([])

  const handleGenerate = async () => {
    if (!selectedMetrics.length || !teamA || !teamB) return
    setLoading(true)
    setProgress(0)
    setMsg('Iniciando...')
    try {
      const keysA = sideSelection(allJornadas, torneos, torneosA, jIdxA)
      const keysB = sideSelection(allJornadas, torneos, torneosB, jIdxB)
      const jornadaLabelsA = formatJornadaLabels(keysA)
      const jornadaLabelsB = formatJornadaLabels(keysB)
      const rA = rangeLabel(keysA)
      const rB = rangeLabel(keysB)
      const isPromA = aggModeA === 'promedio'
      const isPromB = aggModeB === 'promedio'
      const jobs = selectedMetrics.map(metric => {
        const totalA = teamValueForPeriod(rows, keysA, torneosA, metric, teamA)
        const totalB = teamValueForPeriod(rows, keysB, torneosB, metric, teamB)
        const rawSeriesA = teamValueByJornada(rows, keysA, torneosA, metric, teamA)
        const rawSeriesB = teamValueByJornada(rows, keysB, torneosB, metric, teamB)
        const avgA = keysA.length ? totalA / keysA.length : 0
        const avgB = keysB.length ? totalB / keysB.length : 0
        return {
          metric, teamA, teamB,
          rangeA: rA + (isPromA ? ' (promedio)' : ''),
          rangeB: rB + (isPromB ? ' (promedio)' : ''),
          valueA: isPromA ? avgA : totalA,
          valueB: isPromB ? avgB : totalB,
          seriesA: isPromA ? [avgA] : rawSeriesA,
          seriesB: isPromB ? [avgB] : rawSeriesB,
          labelsA: isPromA ? [`Promedio (${keysA.length})`] : jornadaLabelsA,
          labelsB: isPromB ? [`Promedio (${keysB.length})`] : jornadaLabelsB,
        }
      })
      await generateTeamH2HPDF(jobs, (pct, m) => { setProgress(pct); setMsg(m) }, pdfTheme)
    } catch (e) {
      console.error('PDF error:', e)
      setMsg('Error — revisa la consola')
    } finally {
      setTimeout(() => { setLoading(false); setProgress(0); setMsg('') }, 1500)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? 'var(--red)' : 'var(--s3)', border: '1px solid var(--border)', borderRadius: 4,
          color: '#fff', padding: '6px 14px', fontSize: 12, fontWeight: 700,
          fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1, cursor: 'pointer',
        }}
      >📄 Generar PDF</button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300, width: 380,
          background: '#131313', border: '1px solid var(--border)', borderRadius: 6, padding: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,.6)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase' }}>Métricas a incluir</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={selectAll} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--gray3)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Todas</button>
              <button onClick={clearAll} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--gray3)', fontSize: 11, padding: '3px 10px', cursor: 'pointer' }}>Limpiar</button>
            </div>
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4, marginBottom: 14 }}>
            {metrics.map(m => {
              const on = selectedMetrics.includes(m)
              return (
                <label key={m} onClick={() => toggleMetric(m)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', cursor: 'pointer',
                  fontSize: 12, color: on ? '#fff' : 'var(--gray3)', background: on ? 'rgba(200,26,26,0.1)' : 'transparent',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <input type="checkbox" checked={on} readOnly />
                  {m}
                </label>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              {[['dark', 'Oscuro'], ['light', 'Claro']].map(([v, label]) => (
                <button key={v} onClick={() => setPdfTheme(v)} style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 0.5,
                  background: pdfTheme === v ? 'var(--red)' : 'var(--s2)', color: pdfTheme === v ? '#fff' : 'var(--gray3)',
                }}>{label}</button>
              ))}
            </div>
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 140, height: 4, background: '#2f2f2f', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--red)', borderRadius: 2, transition: 'width .3s' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--gray)' }}>{msg}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !selectedMetrics.length}
            style={{
              width: '100%', background: loading || !selectedMetrics.length ? 'var(--s2)' : 'var(--red)', border: 'none', borderRadius: 4,
              color: '#fff', padding: '10px 18px', fontSize: 13, fontWeight: 700,
              fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
              cursor: loading || !selectedMetrics.length ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Generando...' : `Descargar (${selectedMetrics.length} métrica${selectedMetrics.length !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}
    </div>
  )
}
