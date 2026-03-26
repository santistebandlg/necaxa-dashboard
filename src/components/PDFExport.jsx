import React, { useState } from 'react'
import { COVER_IMAGES } from './coverImages'

const W = 1920
const H = 1080

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
}

async function captureChart(id) {
  const el = document.getElementById(id)
  if (!el) return null
  try {
    const html2canvas = (await import('html2canvas')).default
    const c = await html2canvas(el, {
      backgroundColor: '#1c1c1c',
      scale: 3,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 0,
    })
    return c.toDataURL('image/png', 1.0)
  } catch (e) {
    console.warn('Capture failed for', id, e)
    return null
  }
}

function roundRect(ctx, x, y, w, h, r = 6) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// Build jornada range text (numbers only, no "JORNADA" prefix)
function buildJornadaRange(jornadaLabel) {
  const nums = jornadaLabel.match(/\d+/g)
  if (!nums || nums.length === 0) return ''
  if (nums.length === 1) return nums[0]
  const first = parseInt(nums[0])
  const last  = parseInt(nums[nums.length - 1])
  const isRange = last - first === nums.length - 1
  return isRange ? `${first}-${last}` : nums.join(', ')
}

// ── Draw cover slide with real image + jornada overlay
async function drawCover(ctx, coverKey, jornadaRange) {
  // Draw base image
  const src = COVER_IMAGES[coverKey]
  if (src) {
    try {
      const img = await loadImage(src)
      const scaleX = W / img.naturalWidth
      const scaleY = H / img.naturalHeight
      const scale  = Math.max(scaleX, scaleY)
      const dw = img.naturalWidth  * scale
      const dh = img.naturalHeight * scale
      const dx = (W - dw) / 2
      const dy = (H - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)
    } catch (e) {
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, 0, W, H)
    }
  } else {
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, W, H)
  }

  // Only rendimiento gets the jornada range text
  // "JORNADA" text in original 1200x675 image is at approx x=645, y=492
  // Scaled to 1920x1080 (factor 1.6): x=1008, y=787
  // We place the range numbers immediately to the right of "JORNADA"
  if (coverKey === 'rendimiento' && jornadaRange) {
    ctx.font = `700 84px "DIN Alternate", "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    // Measure "JORNADA " width to place numbers right after it
    // "JORNADA" ends at approx x=1200 in 1920px scale — place numbers from there
    ctx.fillText(jornadaRange, 1420, 645)
  }
  // ofensiva and defensiva: no text overlay
}

// ── Draw content slide
async function drawContentSlide(ctx, title, jornadaText, chartIds, layout) {
  const PAD      = 36
  const HEADER_H = 100
  const CELL_GAP = 16
  const CARD_PAD = 10

  ctx.fillStyle = '#131313'
  ctx.fillRect(0, 0, W, H)

  // Header bar
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, W, HEADER_H)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, HEADER_H - 3, W, 3)

  ctx.textBaseline = 'middle'

  // Left: section type
  ctx.fillStyle = '#444'
  ctx.font = `500 20px "Barlow", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('RENDIMIENTO', PAD, HEADER_H * 0.32)

  // Left: title
  ctx.fillStyle = '#f0f0f0'
  ctx.font = `900 50px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(title.toUpperCase(), PAD, HEADER_H * 0.72)

  // Right: últimos partidos
  ctx.fillStyle = '#444'
  ctx.font = `500 18px "Barlow", sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('ÚLTIMOS 5 PARTIDOS', W - PAD, HEADER_H * 0.32)

  // Right: jornada label
  ctx.fillStyle = '#888'
  ctx.font = `700 22px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(jornadaText, W - PAD, HEADER_H * 0.72)

  // ── Capture charts
  const images = await Promise.all(chartIds.map(id => captureChart(id)))

  // Parse layout
  const count = chartIds.length
  let cols = 2, rows = 1
  if (layout === '1x1') { cols = 1; rows = 1 }
  else if (layout === '2x1') { cols = 2; rows = 1 }
  else if (layout === '3x1') { cols = 3; rows = 1 }
  else if (layout === '2x2') { cols = 2; rows = 2 }
  else if (layout === '3x2') { cols = 3; rows = 2 }
  else {
    if (count === 1) { cols = 1; rows = 1 }
    else if (count === 2) { cols = 2; rows = 1 }
    else if (count === 3) { cols = 3; rows = 1 }
    else if (count === 4) { cols = 2; rows = 2 }
    else { cols = 3; rows = 2 }
  }

  const areaY = HEADER_H + PAD
  const areaH = H - HEADER_H - PAD * 2
  const areaW = W - PAD * 2
  const cellW = (areaW - CELL_GAP * (cols - 1)) / cols
  const cellH = (areaH - CELL_GAP * (rows - 1)) / rows

  // Load all captured chart images
  const loadedImgs = await Promise.all(
    images.map(src => src ? loadImage(src).catch(() => null) : Promise.resolve(null))
  )

  loadedImgs.forEach((img, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = PAD + col * (cellW + CELL_GAP)
    const y = areaY + row * (cellH + CELL_GAP)

    // Card bg
    ctx.fillStyle = '#1c1c1c'
    roundRect(ctx, x, y, cellW, cellH, 6)
    ctx.fill()
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.stroke()

    if (img) {
      ctx.save()
      roundRect(ctx, x + CARD_PAD, y + CARD_PAD, cellW - CARD_PAD * 2, cellH - CARD_PAD * 2, 4)
      ctx.clip()
      ctx.drawImage(img, x + CARD_PAD, y + CARD_PAD, cellW - CARD_PAD * 2, cellH - CARD_PAD * 2)
      ctx.restore()
    } else {
      ctx.fillStyle = '#252525'
      roundRect(ctx, x + CARD_PAD, y + CARD_PAD, cellW - CARD_PAD * 2, cellH - CARD_PAD * 2, 4)
      ctx.fill()
      ctx.fillStyle = '#444'
      ctx.font = '500 22px Barlow, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Sin datos', x + cellW / 2, y + cellH / 2)
    }
  })
}

// ── Main PDF generation
export async function generatePDF(jornadaLabel, onProgress) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H] })

  const jornadaRange = buildJornadaRange(jornadaLabel)
  const jornadaText  = jornadaRange  // for content slides header

  const SLIDES = [
    { type: 'cover',   coverKey: 'rendimiento' },
    { type: 'cover',   coverKey: 'ofensiva' },
    { type: 'content', title: 'Finalización',
      charts: ['pdf-chart-golesxg', 'pdf-chart-tiros', 'pdf-chart-centros'], layout: '3x1' },
    { type: 'content', title: 'Posesión',
      charts: ['pdf-chart-atpos', 'pdf-chart-posesion'], layout: '2x1' },
    { type: 'content', title: 'Pases',
      charts: ['pdf-chart-pases-tot','pdf-chart-pases-larg','pdf-chart-pases-ut',
               'pdf-chart-pases-prog','pdf-chart-pases-cruz','pdf-chart-pases-prof'], layout: '3x2' },
    { type: 'content', title: 'Pérdidas & Duelos Ofensivos',
      charts: ['pdf-chart-perdidas', 'pdf-chart-duelos-ofe'], layout: '2x1' },
    { type: 'content', title: 'ABPs a Favor',
      charts: ['pdf-chart-cfav', 'pdf-chart-afav'], layout: '2x1' },
    { type: 'cover',   coverKey: 'defensiva' },
    { type: 'content', title: 'Finalización en Contra',
      charts: ['pdf-chart-golesrec', 'pdf-chart-tirosc', 'pdf-chart-centrosc'], layout: '3x1' },
    { type: 'content', title: 'PPDA & Recuperación & Intensidad',
      charts: ['pdf-chart-intensidad', 'pdf-chart-ppda', 'pdf-chart-recup'], layout: '3x1' },
    { type: 'content', title: 'Duelos Aéreos & Defensivos',
      charts: ['pdf-chart-ddef', 'pdf-chart-daer'], layout: '2x1' },
    { type: 'content', title: 'ABPs en Contra',
      charts: ['pdf-chart-ccon', 'pdf-chart-acon'], layout: '2x1' },
  ]

  for (let si = 0; si < SLIDES.length; si++) {
    const slide = SLIDES[si]
    onProgress?.(Math.round((si / SLIDES.length) * 100), `Diapositiva ${si + 1} de ${SLIDES.length}...`)

    const canvas = document.createElement('canvas')
    canvas.width  = W
    canvas.height = H
    const ctx = canvas.getContext('2d')

    if (slide.type === 'cover') {
      await drawCover(ctx, slide.coverKey, jornadaRange)
    } else {
      await drawContentSlide(ctx, slide.title, jornadaText, slide.charts, slide.layout)
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    if (si > 0) doc.addPage([W, H], 'landscape')
    doc.addImage(imgData, 'JPEG', 0, 0, W, H)
  }

  onProgress?.(100, 'Guardando...')
  doc.save(`Necaxa_Rendimiento_${jornadaText.replace(/[\s,]/g, '_')}.pdf`)
}

// ── Export button
export default function PDFExportButton({ jornadaLabel }) {
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg,      setMsg]      = useState('')

  const handleExport = async () => {
    setLoading(true)
    setProgress(0)
    setMsg('Iniciando...')
    try {
      await generatePDF(jornadaLabel, (pct, message) => {
        setProgress(pct)
        setMsg(message)
      })
    } catch (e) {
      console.error('PDF error:', e)
      setMsg('Error — revisa la consola')
    } finally {
      setTimeout(() => { setLoading(false); setProgress(0); setMsg('') }, 1500)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 140, height: 4, background: '#2f2f2f', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'var(--red)', borderRadius: 2, transition: 'width .3s',
            }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, whiteSpace: 'nowrap' }}>{msg}</span>
        </div>
      )}
      <button
        onClick={handleExport}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: loading ? 'var(--s2)' : 'var(--red)',
          border: 'none', borderRadius: 3,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 700, fontSize: 13, letterSpacing: 1,
          color: '#fff', padding: '8px 18px',
          transition: 'background .2s',
          opacity: loading ? .6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {loading ? '⏳ Generando...' : '📄 Descargar PDF'}
      </button>
    </div>
  )
}
