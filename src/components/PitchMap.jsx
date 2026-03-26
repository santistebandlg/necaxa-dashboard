import React, { useMemo, useState } from 'react'

// ─── Coordinate system from Google Sheet ───────────────────────
// Field bounds:  x: 17–517,  y: 16–693
// Origin is bottom-left, y increases upward
// We render top-to-bottom so we flip y: screenY = (693 - y) / (693 - 16)

const SX = { min: 17,  max: 517 }
const SY = { min: 16,  max: 693 }
const RX = SX.max - SX.min  // 500
const RY = SY.max - SY.min  // 677

// Convert sheet coords → SVG viewBox (0–500 wide, 0–677 tall)
function toSvg(x, y) {
  return {
    sx: x - SX.min,
    sy: RY - (y - SY.min),   // flip y
  }
}

// ─── Pitch drawing constants (in SVG space) ───────────────────
const W = 500   // viewBox width
const H = 677   // viewBox height

// All measurements converted via toSvg()
// Outer boundary: (17,693)→(517,16)
const PITCH = { x: 0, y: 0, w: W, h: H }

// Penalty areas (big box)
// Top: x 119–414, y 588–693  →  svgY: 0 to 105
const BOX_TOP    = { x: 102, y: 0,   w: 295, h: 105 }
// Bottom: x 119–414, y 16–121  →  svgY: 572 to 677
const BOX_BOT    = { x: 102, y: 572, w: 295, h: 105 }

// Goal areas (small box)
// Top: x 200–333, y 659–693  →  svgY: 0 to 34
const SBOX_TOP   = { x: 183, y: 0,   w: 133, h: 34 }
// Bottom: x 200–333, y 16–50 (mirrored) → svgY: 643 to 677
const SBOX_BOT   = { x: 183, y: 643, w: 133, h: 34 }

// Goals: x 242–293
const GOAL_X     = 225
const GOAL_W     = 51

// Centre circle: centre (267,354) → (250, 339), radius 66
const CC         = { cx: 250, cy: 339, r: 66 }

// Halfway line y=354 → svgY = 677 - (354-16) = 339
const MID_Y      = 339

const PITCH_COLOR   = '#1a2a1a'
const LINE_COLOR    = 'rgba(255,255,255,0.55)'
const LINE_W        = 1.5

export default function PitchMap({ events = [], colorFn, tooltipFn, title, filters }) {
  const [tooltip, setTooltip] = useState(null)
  const [activeFilters, setActiveFilters] = useState({})

  // Apply active filters
  const filtered = useMemo(() => {
    if (!filters || Object.keys(activeFilters).length === 0) return events
    return events.filter(e => {
      for (const [key, val] of Object.entries(activeFilters)) {
        if (val && e[key] !== val) return false
      }
      return true
    })
  }, [events, activeFilters, filters])

  const dots = useMemo(() =>
    filtered.map((e, i) => {
      const { sx, sy } = toSvg(e.x, e.y)
      return { ...e, sx, sy, i }
    }).filter(d => d.sx >= 0 && d.sx <= W && d.sy >= 0 && d.sy <= H)
  , [filtered])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Filter controls */}
      {filters && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          {Object.entries(filters).map(([key, values]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {key === 'jugador' ? 'Jugador' : key === 'resultado' ? 'Resultado' : key}:
              </span>
              {key === 'jugador' ? (
                // Dropdown for players
                <div className="csel">
                  <select
                    value={activeFilters[key] || ''}
                    onChange={e => setActiveFilters(prev => ({
                      ...prev,
                      [key]: e.target.value || undefined,
                    }))}
                    style={{ minWidth: 160, fontSize: 12 }}
                  >
                    <option value="">Todos</option>
                    {values.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              ) : (
                // Chips for small value sets (resultado, etc.)
                ['Todos', ...values].map(v => (
                  <button
                    key={v}
                    onClick={() => setActiveFilters(prev => ({
                      ...prev,
                      [key]: v === 'Todos' ? undefined : v,
                    }))}
                    style={{
                      padding: '3px 10px', borderRadius: 3, border: 'none',
                      fontSize: 11, cursor: 'pointer', letterSpacing: 0.5,
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
                      background: (activeFilters[key] === v || (v === 'Todos' && !activeFilters[key]))
                        ? 'var(--red)' : 'var(--s2)',
                      color: (activeFilters[key] === v || (v === 'Todos' && !activeFilters[key]))
                        ? '#fff' : 'var(--gray3)',
                    }}
                  >
                    {v}
                  </button>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1 }}>
        {dots.length} evento{dots.length !== 1 ? 's' : ''} mapeado{dots.length !== 1 ? 's' : ''}
      </div>

      {/* Pitch SVG */}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 6 }}
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Pitch background */}
          <rect x={0} y={0} width={W} height={H} fill={PITCH_COLOR} rx={4} />

          {/* Grass stripes */}
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i}
              x={0} y={i * (H / 10)} width={W} height={H / 10 / 2}
              fill="rgba(255,255,255,0.02)"
            />
          ))}

          {/* Outer boundary */}
          <rect x={0} y={0} width={W} height={H}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />

          {/* Halfway line */}
          <line x1={0} y1={MID_Y} x2={W} y2={MID_Y}
            stroke={LINE_COLOR} strokeWidth={LINE_W} />

          {/* Centre circle */}
          <circle cx={CC.cx} cy={CC.cy} r={CC.r}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
          <circle cx={CC.cx} cy={CC.cy} r={3}
            fill={LINE_COLOR} />

          {/* Penalty boxes */}
          <rect x={BOX_TOP.x} y={BOX_TOP.y} width={BOX_TOP.w} height={BOX_TOP.h}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
          <rect x={BOX_BOT.x} y={BOX_BOT.y} width={BOX_BOT.w} height={BOX_BOT.h}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />

          {/* Goal boxes */}
          <rect x={SBOX_TOP.x} y={SBOX_TOP.y} width={SBOX_TOP.w} height={SBOX_TOP.h}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
          <rect x={SBOX_BOT.x} y={SBOX_BOT.y} width={SBOX_BOT.w} height={SBOX_BOT.h}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />

          {/* Goals */}
          <rect x={GOAL_X} y={-12} width={GOAL_W} height={12}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />
          <rect x={GOAL_X} y={H} width={GOAL_W} height={12}
            fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W} />

          {/* Penalty spots */}
          <circle cx={CC.cx} cy={58}  r={3} fill={LINE_COLOR} />
          <circle cx={CC.cx} cy={619} r={3} fill={LINE_COLOR} />

          {/* Penalty arcs — centered on penalty spot, only outside the box */}
          {/* Top arc: spot at (250, 58), radius 66, show only below y=105 (BOX_TOP bottom edge) */}
          {(() => {
            const cx = CC.cx, cy = 58, r = 66
            const boxEdge = BOX_TOP.h  // 105
            // Intersection of circle with y=boxEdge: x = cx ± sqrt(r²-(boxEdge-cy)²)
            const dy = boxEdge - cy
            const dx = Math.sqrt(Math.max(0, r * r - dy * dy))
            const x1 = cx - dx, x2 = cx + dx
            return (
              <path
                d={`M ${x1} ${boxEdge} A ${r} ${r} 0 0 0 ${x2} ${boxEdge}`}
                fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W}
                clipPath="url(#clipArcTop)"
              />
            )
          })()}
          {/* Bottom arc: spot at (250, 619), radius 66, show only above y=572 (BOX_BOT top edge) */}
          {(() => {
            const cx = CC.cx, cy = 619, r = 66
            const boxEdge = BOX_BOT.y  // 572
            const dy = cy - boxEdge
            const dx = Math.sqrt(Math.max(0, r * r - dy * dy))
            const x1 = cx - dx, x2 = cx + dx
            return (
              <path
                d={`M ${x1} ${boxEdge} A ${r} ${r} 0 0 1 ${x2} ${boxEdge}`}
                fill="none" stroke={LINE_COLOR} strokeWidth={LINE_W}
                clipPath="url(#clipArcBot)"
              />
            )
          })()}

          {/* Clip paths */}
          <defs>
            <clipPath id="clipArcTop">
              <rect x={0} y={BOX_TOP.h} width={W} height={H} />
            </clipPath>
            <clipPath id="clipArcBot">
              <rect x={0} y={0} width={W} height={BOX_BOT.y} />
            </clipPath>
          </defs>

          {/* Event dots */}
          {dots.map((d) => {
            const color = colorFn ? colorFn(d) : '#c81a1a'
            return (
              <circle
                key={d.i}
                cx={d.sx} cy={d.sy} r={6}
                fill={color}
                fillOpacity={0.85}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.closest('svg').getBoundingClientRect()
                  setTooltip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    content: tooltipFn ? tooltipFn(d) : `${d.jugador || ''} — ${d.accion || ''}`
                  })
                }}
              />
            )
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x + 10, top: tooltip.y - 10,
            background: '#111', border: '1px solid var(--border)',
            borderRadius: 4, padding: '6px 10px',
            fontSize: 12, color: 'var(--white)',
            pointerEvents: 'none', zIndex: 10,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
          }}>
            {tooltip.content}
          </div>
        )}
      </div>
    </div>
  )
}
