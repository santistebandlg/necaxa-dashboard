import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement,
  BarController, LineController,
  Tooltip, Legend, Filler,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, BarController, LineController, Tooltip, Legend, Filler)

export const RED  = '#c81a1a'
export const GOLD = '#e8b832'
export const WHT  = 'rgba(210,210,210,.85)'
export const GRN  = '#3fb950'
export const GRID = { color: 'rgba(255,255,255,0.04)' }

ChartJS.defaults.color = '#666'
ChartJS.defaults.font.family = 'Barlow, sans-serif'
ChartJS.defaults.font.size = 11

// ─────────────────────────────────────────────────────────
// SINGLE unified datalabels plugin
//
// Dataset flags:
//   _barLabels  → draw value inside bar (as-is)
//   _isPosBar   → draw value + % inside bar (posesion chart)
//   _lineLabels → draw value + % above line point
//   _isPosLine  → draw value (no %) above line point (posesion chart)
// ─────────────────────────────────────────────────────────
export const DatalabelsPlugin = {
  id: 'necaxa-datalabels',

  // Draw bar labels after all datasets — runs once at the end
  afterDraw(chart) {
    const ctx = chart.ctx
    const isHorizontal = chart.options.indexAxis === 'y'

    chart.data.datasets.forEach((ds, di) => {
      if (!ds._barLabels && !ds._isPosBar) return
      const meta = chart.getDatasetMeta(di)
      if (meta.hidden) return

      meta.data.forEach((el, i) => {
        const val = ds.data[i]
        if (val === null || val === undefined || val === 0) return

        const bg = typeof ds.backgroundColor === 'string' ? ds.backgroundColor : ''
        const textColor = (bg === WHT || bg === GOLD || bg.startsWith('rgba(210')) ? '#111' : '#fff'
        const display = ds._isPosBar ? parseFloat(val).toFixed(1) + '%' : val
        const fontSize = ds._statChart ? 13 : 10

        if (isHorizontal) {
          // Horizontal bar: label inside bar, aligned to right edge
          const base = (el.base !== undefined) ? el.base : chart.scales.x.getPixelForValue(0)
          const barW = el.x - base
          if (barW < 20) return

          ctx.save()
          ctx.font = `bold ${fontSize}px Barlow, sans-serif`
          ctx.textAlign = 'right'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = textColor
          ctx.fillText(display, el.x - 6, el.y)
          ctx.restore()
        } else {
          // Vertical bar: label inside bar, vertically centered
          const base = (el.base !== undefined) ? el.base : chart.scales.y.getPixelForValue(0)
          const barH = base - el.y
          if (barH < 14) return

          ctx.save()
          ctx.font = `bold ${fontSize}px Barlow, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = textColor
          ctx.fillText(display, el.x, el.y + barH / 2)
          ctx.restore()
        }
      })
    })
  },

  // Draw line labels after EACH dataset is drawn — captures correct x/y per point
  afterDatasetDraw(chart, args) {
    const ds = chart.data.datasets[args.index]
    if (!ds._lineLabels && !ds._isPosLine && !ds._intLine) return

    const meta = chart.getDatasetMeta(args.index)
    if (meta.hidden) return

    const ctx = chart.ctx

    meta.data.forEach((el, i) => {
      const val = ds.data[i]
      if (val === null || val === undefined) return

      let display
      if (ds._isPosLine) {
        display = parseFloat(val).toFixed(2).replace(/\.?0+$/, '')
      } else if (ds._intLine) {
        display = String(Math.round(val))
      } else {
        display = parseFloat(val).toFixed(1) + '%'
      }

      ctx.save()
      ctx.font = 'bold 10px Barlow, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.shadowColor = 'rgba(0,0,0,0.9)'
      ctx.shadowBlur = 4
      ctx.fillStyle = ds.borderColor || GOLD
      ctx.fillText(display, el.x, el.y - 5)
      ctx.restore()
    })
  },
}

ChartJS.register(DatalabelsPlugin)

// ─────────────────────────────────────────────────────────
// Shared options & dataset builders
// ─────────────────────────────────────────────────────────
export const baseOptions = (y2 = false, maxY) => ({
  responsive: true,
  maintainAspectRatio: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: GRID },
    y: { grid: GRID, ...(maxY ? { max: maxY } : {}) },
    ...(y2 ? {
      y2: {
        position: 'right',
        grid: { display: false },
        ticks: { callback: v => v + '%' },
        min: 0, max: 100,
      }
    } : {}),
  },
})

export function barLineDatasets(labels, d) {
  return {
    labels,
    datasets: [
      { type: 'bar',  data: d.r, backgroundColor: RED, yAxisID: 'y', borderRadius: 2, _barLabels: true, order: 2 },
      { type: 'bar',  data: d.w, backgroundColor: WHT, yAxisID: 'y', borderRadius: 2, _barLabels: true, order: 2 },
      { type: 'line', data: d.e, borderColor: GOLD, backgroundColor: 'transparent', yAxisID: 'y2',
        tension: .4, pointRadius: 4, pointBackgroundColor: GOLD, borderWidth: 2.5, _lineLabels: true, order: 1 },
    ],
  }
}

export function stackedDatasets(labels, d) {
  return {
    labels,
    datasets: [
      { type: 'bar',  data: d.baja,  backgroundColor: RED,  yAxisID: 'y', borderRadius: 2, _barLabels: true, order: 2 },
      { type: 'bar',  data: d.media, backgroundColor: WHT,  yAxisID: 'y', borderRadius: 2, _barLabels: true, order: 2 },
      { type: 'bar',  data: d.alta,  backgroundColor: GOLD, yAxisID: 'y', borderRadius: 2, _barLabels: true, order: 2 },
      { type: 'line', data: d.total, borderColor: GRN, backgroundColor: 'transparent',
        tension: .4, pointRadius: 4, pointBackgroundColor: GRN, borderWidth: 2.5, yAxisID: 'y',
        _intLine: true, order: 1 },
    ],
  }
}
