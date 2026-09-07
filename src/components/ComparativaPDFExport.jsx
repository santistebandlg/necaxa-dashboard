import React, { useState } from 'react'
import { loadImage, captureChart, roundRect, W, H, DW, DH } from './PDFExport'
import { getPlayerPhoto } from '../utils/playerPhotos'

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function drawHalfCover(ctx, player, rangeLabel, x0, halfW) {
  const cx = x0 + 220, cy = DH / 2, r = 130

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
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  const tx = x0 + 420
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#666'
  ctx.font = `600 22px "Barlow", sans-serif`
  ctx.fillText('NECAXA — COMPARATIVA', tx, cy - 110)

  ctx.fillStyle = '#f5f5f5'
  ctx.font = `900 64px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(player.name.toUpperCase(), tx, cy - 30, halfW - 460)

  ctx.fillStyle = '#c81a1a'
  ctx.font = `700 32px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText((player.pos || '').toUpperCase(), tx, cy + 18)

  ctx.fillStyle = '#999'
  ctx.font = `500 22px "Barlow", sans-serif`
  ctx.fillText(rangeLabel, tx, cy + 68, halfW - 460)
  ctx.fillText(`${player.mins}' jugados · ${player.pct}% del partido`, tx, cy + 100, halfW - 460)
}

async function drawComparativaCover(ctx, sideA, sideB) {
  const halfW = DW / 2
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, DH - 6, DW, 6)

  await drawHalfCover(ctx, sideA.player, sideA.rangeLabel, 0, halfW)
  await drawHalfCover(ctx, sideB.player, sideB.rangeLabel, halfW, halfW)

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(halfW, 60)
  ctx.lineTo(halfW, DH - 60)
  ctx.stroke()

  ctx.fillStyle = '#444'
  ctx.font = `900 22px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#1c1c1c'
  ctx.beginPath()
  ctx.arc(halfW, DH / 2, 26, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#888'
  ctx.fillText('VS', halfW, DH / 2)
}

async function drawHalfStatsGrid(ctx, player, chartIds, x0, halfW, areaY, areaH) {
  const PAD = 24, CELL_GAP = 14, CARD_PAD = 8

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f0f0f0'
  ctx.font = `900 32px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(player.name.toUpperCase(), x0 + PAD, areaY - 14)
  ctx.fillStyle = '#888'
  ctx.font = `600 16px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText((player.pos || '').toUpperCase(), x0 + halfW - PAD, areaY - 16)
  ctx.textAlign = 'left'

  const gridY = areaY + 10
  const gridH = areaH - 10
  const cols = 2, rows = 2
  const areaW = halfW - PAD * 2
  const cellW = (areaW - CELL_GAP * (cols - 1)) / cols
  const cellH = (gridH - CELL_GAP * (rows - 1)) / rows

  const images = await Promise.all(chartIds.map(id => id ? captureChart(id) : Promise.resolve(null)))
  const loadedImgs = await Promise.all(images.map(src => src ? loadImage(src).catch(() => null) : Promise.resolve(null)))

  loadedImgs.forEach((img, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = x0 + PAD + col * (cellW + CELL_GAP)
    const y = gridY + row * (cellH + CELL_GAP)

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
      ctx.font = '500 18px Barlow, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Sin datos', x + cellW / 2, y + cellH / 2)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
    }
  })
}

async function drawHalfTable(ctx, player, tableId, x0, halfW, areaY, areaH) {
  const PAD = 24
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#f0f0f0'
  ctx.font = `900 32px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(player.name.toUpperCase(), x0 + PAD, areaY - 14)

  const areaW = halfW - PAD * 2
  const gridY = areaY + 10
  const gridH = areaH - 10

  const src = await captureChart(tableId)
  const img = src ? await loadImage(src).catch(() => null) : null
  if (img) {
    const scale = Math.min(areaW / img.naturalWidth, gridH / img.naturalHeight)
    const dw = img.naturalWidth * scale
    const dh = img.naturalHeight * scale
    const dx = x0 + PAD + (areaW - dw) / 2
    const dy = gridY
    ctx.fillStyle = '#1c1c1c'
    roundRect(ctx, dx - 6, dy - 6, dw + 12, dh + 12, 6)
    ctx.fill()
    ctx.drawImage(img, dx, dy, dw, dh)
  } else {
    ctx.fillStyle = '#444'
    ctx.font = '500 18px Barlow, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Sin datos de tabla', x0 + halfW / 2, gridY + gridH / 2)
    ctx.textAlign = 'left'
  }
}

async function drawComparativaTableSlide(ctx, sideA, sideB, tableIdA, tableIdB) {
  const HEADER_H = 90
  ctx.fillStyle = '#131313'
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, HEADER_H)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, HEADER_H - 3, DW, 3)

  ctx.fillStyle = '#444'
  ctx.font = `500 18px "Barlow", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('COMPARATIVA', 30, HEADER_H * 0.32)
  ctx.fillStyle = '#888'
  ctx.font = `700 18px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText('Tabla de estadísticas', 30, HEADER_H * 0.72)

  const halfW = DW / 2
  const areaY = HEADER_H + 70
  const areaH = DH - areaY - 30

  await drawHalfTable(ctx, sideA.player, tableIdA, 0, halfW, areaY, areaH)
  await drawHalfTable(ctx, sideB.player, tableIdB, halfW, halfW, areaY, areaH)

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(halfW, HEADER_H + 20)
  ctx.lineTo(halfW, DH - 20)
  ctx.stroke()
}

async function drawComparativaStatsSlide(ctx, sideA, sideB, pageLabel, chartIdsA, chartIdsB) {
  const HEADER_H = 90
  ctx.fillStyle = '#131313'
  ctx.fillRect(0, 0, DW, DH)
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, DW, HEADER_H)
  ctx.fillStyle = '#c81a1a'
  ctx.fillRect(0, HEADER_H - 3, DW, 3)

  ctx.fillStyle = '#444'
  ctx.font = `500 18px "Barlow", sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('COMPARATIVA', 30, HEADER_H * 0.32)
  ctx.fillStyle = '#888'
  ctx.font = `700 18px "Barlow Condensed", "Arial Narrow", sans-serif`
  ctx.fillText(pageLabel, 30, HEADER_H * 0.72)

  const halfW = DW / 2
  const areaY = HEADER_H + 70
  const areaH = DH - areaY - 30

  await drawHalfStatsGrid(ctx, sideA.player, chartIdsA, 0, halfW, areaY, areaH)
  await drawHalfStatsGrid(ctx, sideB.player, chartIdsB, halfW, halfW, areaY, areaH)

  ctx.strokeStyle = '#2a2a2a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(halfW, HEADER_H + 20)
  ctx.lineTo(halfW, DH - 20)
  ctx.stroke()
}

export async function generateComparativaPDF(sideA, sideB, onProgress) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [W, H], compress: true })

  const chartIdsA = Array.from({ length: sideA.statCount }, (_, i) => `pdf-cmp-A-chart-${i}`)
  const chartIdsB = Array.from({ length: sideB.statCount }, (_, i) => `pdf-cmp-B-chart-${i}`)
  const pagesA = chunk(chartIdsA, 4) // 2x2 por mitad
  const pagesB = chunk(chartIdsB, 4)
  const totalContentPages = Math.max(pagesA.length, pagesB.length, 1)
  const totalSlides = 2 + totalContentPages // portada + tabla + páginas de gráficas

  for (let si = 0; si < totalSlides; si++) {
    onProgress?.(Math.round((si / totalSlides) * 100), `Diapositiva ${si + 1} de ${totalSlides}...`)

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.scale(W / DW, H / DH)

    if (si === 0) {
      await drawComparativaCover(ctx, sideA, sideB)
    } else if (si === 1) {
      await drawComparativaTableSlide(ctx, sideA, sideB, 'pdf-cmp-A-table', 'pdf-cmp-B-table')
    } else {
      const pageIdx = si - 2
      const pageLabel = totalContentPages > 1 ? `Estadísticas ${pageIdx + 1}/${totalContentPages}` : 'Estadísticas'
      await drawComparativaStatsSlide(
        ctx, sideA, sideB, pageLabel,
        pagesA[pageIdx] || [],
        pagesB[pageIdx] || []
      )
    }

    const imgData = canvas.toDataURL('image/png')
    if (si > 0) doc.addPage([W, H], 'landscape')
    doc.addImage(imgData, 'PNG', 0, 0, W, H)
  }

  onProgress?.(100, 'Guardando...')
  const safeA = sideA.player.name.replace(/[^\p{L}\p{N}]+/gu, '_')
  const safeB = sideB.player.name.replace(/[^\p{L}\p{N}]+/gu, '_')
  doc.save(`Necaxa_Comparativa_${safeA}_vs_${safeB}.pdf`)
}

export default function ComparativaPDFExportButton({ sideA, sideB }) {
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')

  const handleExport = async () => {
    setLoading(true)
    setProgress(0)
    setMsg('Iniciando...')
    try {
      await generateComparativaPDF(sideA, sideB, (pct, message) => {
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
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--red)', borderRadius: 2, transition: 'width .3s' }} />
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
        {loading ? '⏳ Generando...' : '📄 Descargar PDF (ambos lados)'}
      </button>
    </div>
  )
}
