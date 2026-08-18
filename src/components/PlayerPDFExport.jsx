import React, { useState } from 'react'
import { loadImage, captureChart, roundRect, W, H, DW, DH } from './PDFExport'
import { getPlayerPhoto } from '../utils/playerPhotos'

function buildJornadaRange(jornadaLabel) {
  const nums = (jornadaLabel || '').match(/\d+/g)
  if (!nums || nums.length === 0) return jornadaLabel || ''
  if (nums.length === 1) return nums[0]
  const first = parseInt(nums[0])
  const last  = parseInt(nums[nums.length - 1])
  const isRange = last - first === nums.length - 1
  return isRange ? `${first}-${last}` : nums.join(', ')
}

// ── Slide 1: portada del jugador ────────────────────────────────────────
async function drawPlayerCover(ctx, player, jornadaRange) {
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, DH - 6, DW, 6)

  // Avatar
  const cx = 300, cy = DH / 2, r = 160
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()
  const photo = getPlayerPhoto(player.name)
  let drew = false
  if (photo) {
    try {
      const img = await loadImage(photo)
      const scale = Math.max((r * 2) / img.naturalWidth, (r * 2) / img.naturalHeight)
      const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale
      ctx.drawImage(img, cx - dw / 2, cy - dh / 2 - r * 0.15, dw, dh)
      drew = true
    } catch (e) { /* fallback abajo */ }
  }
  if (!drew) {
    ctx.fillStyle = '#c81a1a'
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    ctx.fillStyle = '#fff'
    ctx.font = `900 ${r}px "Barlow Condensed", "Arial Narrow", sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(player.ini || '', cx, cy)
  }
  ctx.restore()
  ctx.strokeStyle = '#c81a1a'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Texto
  const tx = 540
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#666'
  ctx.font = `600 26px "Barlow", sans-serif`
  ctx.fillText('NECAXA — INFORME INDIVIDUAL', tx, cy - 130)

  ctx.fillStyle = '#f5f5f5'
  ctx.font = `900 88px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(player.name.toUpperCase(), tx, cy - 30)

  ctx.fillStyle = '#c81a1a'
  ctx.font = `700 40px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText((player.pos || '').toUpperCase(), tx, cy + 30)

  ctx.fillStyle = '#999'
  ctx.font = `500 26px "Barlow", sans-serif`
  ctx.fillText(`Jornada${jornadaRange.includes(',') || jornadaRange.includes('-') ? 's' : ''} ${jornadaRange}  ·  ${player.mins}' jugados  ·  ${player.pct}% del partido`, tx, cy + 90)
}

// ── Slides de contenido: grid de gráficas capturadas ────────────────────
async function drawPlayerStatsSlide(ctx, player, pageLabel, chartIds) {
  const PAD = 36, HEADER_H = 100, CELL_GAP = 16, CARD_PAD = 10

  ctx.fillStyle = '#131313'
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, HEADER_H)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, HEADER_H - 3, DW, 3)

  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#444'
  ctx.font = `500 20px "Barlow", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('RENDIMIENTO INDIVIDUAL', PAD, HEADER_H * 0.32)

  ctx.fillStyle = '#f0f0f0'
  ctx.font = `900 46px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(player.name.toUpperCase(), PAD, HEADER_H * 0.72)

  ctx.fillStyle = '#444'
  ctx.font = `500 18px "Barlow", sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText((player.pos || '').toUpperCase(), DW - PAD, HEADER_H * 0.32)

  ctx.fillStyle = '#888'
  ctx.font = `700 20px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(pageLabel, DW - PAD, HEADER_H * 0.72)

  const images = await Promise.all(chartIds.map(id => captureChart(id)))

  const count = chartIds.length
  let cols = 3, rows = 2
  if (count <= 2) { cols = count; rows = 1 }
  else if (count === 3) { cols = 3; rows = 1 }
  else if (count === 4) { cols = 2; rows = 2 }

  const areaY = HEADER_H + PAD
  const areaH = DH - HEADER_H - PAD * 2
  const areaW = DW - PAD * 2
  const cellW = (areaW - CELL_GAP * (cols - 1)) / cols
  const cellH = (areaH - CELL_GAP * (rows - 1)) / rows

  const loadedImgs = await Promise.all(
    images.map(src => src ? loadImage(src).catch(() => null) : Promise.resolve(null))
  )

  loadedImgs.forEach((img, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = PAD + col * (cellW + CELL_GAP)
    const y = areaY + row * (cellH + CELL_GAP)

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

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function generatePlayerPDF(player, jornadaLabel, statCount, onProgress) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true })

  const jornadaRange = buildJornadaRange(jornadaLabel)
  const chartIds = Array.from({ length: statCount }, (_, i) => `pdf-player-chart-${i}`)
  const pages = chunk(chartIds, 6) // 3x2 por página

  const totalSlides = 1 + pages.length

  for (let si = 0; si < totalSlides; si++) {
    onProgress?.(Math.round((si / totalSlides) * 100), `Diapositiva ${si + 1} de ${totalSlides}...`)

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.scale(W / DW, H / DH)

    if (si === 0) {
      await drawPlayerCover(ctx, player, jornadaRange)
    } else {
      const pageIdx = si - 1
      const pageLabel = pages.length > 1
        ? `Estadísticas ${pageIdx + 1}/${pages.length}`
        : 'Estadísticas'
      await drawPlayerStatsSlide(ctx, player, pageLabel, pages[pageIdx])
    }

    const imgData = canvas.toDataURL('image/png')
    if (si > 0) doc.addPage([W, H], 'landscape')
    doc.addImage(imgData, 'PNG', 0, 0, W, H)
  }

  onProgress?.(100, 'Guardando...')
  const safeName = player.name.replace(/[^\p{L}\p{N}]+/gu, '_')
  doc.save(`Necaxa_${safeName}_${jornadaRange.replace(/[\s,]/g, '_')}.pdf`)
}

// ── Botón de exportación ────────────────────────────────────────────────
export default function PlayerPDFExportButton({ player, jornadaLabel, statCount }) {
  const [loading,  setLoading]  = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg,      setMsg]      = useState('')

  const handleExport = async () => {
    setLoading(true)
    setProgress(0)
    setMsg('Iniciando...')
    try {
      await generatePlayerPDF(player, jornadaLabel, statCount, (pct, message) => {
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
