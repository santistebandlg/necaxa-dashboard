import React, { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import { SectionHeader, Card } from './UI'
import { RED, GOLD, WHT, GRN, GRID } from '../utils/chartUtils'
import PitchMap from './PitchMap'

function getLastStat(player, ...labels) {
  for (const lbl of labels) {
    const s = player.stats?.find(x => x.lbl === lbl)
    if (s) return s.chartData?.[s.chartData.length - 1] ?? 0
  }
  return 0
}

const EXCLUDED_PLAYERS = ['desconocido', 'fj', 'f', 'fl', '']

function filterEvents(events, labels, activeTorneos) {
  if (!events || !labels || labels.length === 0) return []
  return events.filter(e => {
    if (!labels.includes(e.jornada)) return false
    if (activeTorneos && activeTorneos.length > 0) {
      if (!activeTorneos.includes(e.torneo)) return false
    }
    // Exclude unknown/incomplete player names
    const name = (e.jugador || '').trim().toLowerCase()
    if (EXCLUDED_PLAYERS.includes(name)) return false
    return true
  })
}

function buildStackedFromEvents(events, labels, groupField) {
  const groups = [...new Set(events.map(e => e[groupField]).filter(Boolean))].sort()
  const byJornada = {}
  labels.forEach(j => { byJornada[j] = {} })
  events.forEach(e => {
    if (!labels.includes(e.jornada)) return
    const g = e[groupField] || 'Sin dato'
    if (!byJornada[e.jornada]) byJornada[e.jornada] = {}
    byJornada[e.jornada][g] = (byJornada[e.jornada][g] || 0) + 1
  })
  return { groups, byJornada }
}

const STACK_COLORS = [RED, WHT, GOLD, GRN, '#a78bfa', '#38bdf8', '#fb923c', '#f472b6']

function AccionChart({ events, labels, height = 200 }) {
  const { groups, byJornada } = useMemo(
    () => buildStackedFromEvents(events, labels, 'accion'),
    [events, labels]
  )
  const datasets = groups.map((g, i) => ({
    type: 'bar', label: g,
    data: labels.map(j => byJornada[j]?.[g] || 0),
    backgroundColor: STACK_COLORS[i % STACK_COLORS.length],
    borderRadius: 2, _barLabels: true, order: 2, stack: 'a',
  }))
  return (
    <Bar
      height={height}
      data={{ labels, datasets }}
      options={{
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: true, labels: { color: '#777', font: { size: 10 }, boxWidth: 12, padding: 8 } } },
        scales: { x: { grid: GRID, stacked: true }, y: { grid: GRID, stacked: true, beginAtZero: true } },
      }}
    />
  )
}

function ZoneTable({ events, labels, zoneField = 'cuartoCanpo' }) {
  const filtered = filterEvents(events, labels)
  const total = filtered.length
  const byPlayer = {}
  filtered.forEach(e => {
    const name = e.jugador || 'Desconocido'
    const zona = e[zoneField] || 'Sin zona'
    if (!byPlayer[name]) byPlayer[name] = { total: 0, zonas: {} }
    byPlayer[name].total++
    byPlayer[name].zonas[zona] = (byPlayer[name].zonas[zona] || 0) + 1
  })
  const allZones = [...new Set(filtered.map(e => e[zoneField]).filter(Boolean))].sort()
  const rows = Object.entries(byPlayer)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
    .map((row, i) => ({ ...row, rank: i + 1, pct: total > 0 ? ((row.total / total) * 100).toFixed(1) : '0.0' }))

  if (rows.length === 0) return (
    <div style={{ color: 'var(--gray)', fontSize: 12, padding: '16px 0' }}>Sin datos para las jornadas seleccionadas</div>
  )

  const thStyle = { padding: '7px 10px', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const tdStyle = { padding: '6px 10px', fontSize: 12, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'center', width: 36 }}>#</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
            <th style={{ ...thStyle }}>Total</th>
            <th style={{ ...thStyle, color: GOLD }}>Influencia</th>
            {allZones.map(z => <th key={z} style={{ ...thStyle, color: 'var(--gray3)', fontSize: 9 }}>{z}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              <td style={{ ...tdStyle, color: row.rank <= 3 ? GOLD : 'var(--gray3)', fontWeight: 700 }}>{row.rank}</td>
              <td style={{ ...tdStyle, textAlign: 'left', color: 'var(--white)', fontWeight: 600 }}>{row.name}</td>
              <td style={{ ...tdStyle, color: 'var(--white)', fontWeight: 700 }}>{row.total}</td>
              <td style={{ ...tdStyle, color: GOLD, fontWeight: 700 }}>{row.pct}%</td>
              {allZones.map(z => <td key={z} style={{ ...tdStyle, color: 'var(--gray3)' }}>{row.zonas[z] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '1px solid var(--border)' }}>
            <td colSpan={2} style={{ ...tdStyle, textAlign: 'left', color: 'var(--gray)', fontSize: 11 }}>Total equipo</td>
            <td style={{ ...tdStyle, color: 'var(--white)', fontWeight: 700 }}>{total}</td>
            <td style={{ ...tdStyle, color: GOLD, fontWeight: 700 }}>100%</td>
            {allZones.map(z => <td key={z} style={{ ...tdStyle, color: 'var(--gray3)' }}>{filtered.filter(e => e[zoneField] === z).length}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function HorizontalPlayerChart({ events, labels, color = RED, zoneField = 'cuartoCanpo', showAccionFilter = false, showFaseFilter = false, showResultadoFilter = false }) {
  const [activeZone, setActiveZone] = React.useState('Todas')
  const [activeAccion, setActiveAccion] = React.useState('Todas')
  const [activeFase, setActiveFase] = React.useState('Todas')
  const [activeResultado, setActiveResultado] = React.useState('Todas')

  const zones = useMemo(() => ['Todas', ...([...new Set(events.map(e => e[zoneField]).filter(Boolean))].sort())], [events, zoneField])
  const acciones = useMemo(() => ['Todas', ...([...new Set(events.map(e => e.accion).filter(Boolean))].sort())], [events])
  const fases = useMemo(() => ['Todas', ...([...new Set(events.map(e => e.fase).filter(Boolean))].sort())], [events])
  const resultados = useMemo(() => ['Todas', ...([...new Set(events.map(e => e.resultado).filter(Boolean))].sort())], [events])

  const filtered = useMemo(() => {
    const byLabel = filterEvents(events, labels)
    return byLabel.filter(e => {
      if (activeZone !== 'Todas' && e[zoneField] !== activeZone) return false
      if (activeAccion !== 'Todas' && e.accion !== activeAccion) return false
      if (activeFase !== 'Todas' && e.fase !== activeFase) return false
      if (activeResultado !== 'Todas' && e.resultado !== activeResultado) return false
      return true
    })
  }, [events, labels, activeZone, activeAccion, activeFase, activeResultado, zoneField])

  const counts = useMemo(() => {
    const c = {}
    filtered.forEach(e => { const n = e.jugador || 'Desconocido'; c[n] = (c[n] || 0) + 1 })
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const chartLabels = counts.map(([name]) => name)
  const chartData   = counts.map(([, v]) => v)
  const barHeight   = Math.max(280, chartLabels.length * 30)

  const chipStyle = (active) => ({
    padding: '3px 10px', borderRadius: 3, border: 'none',
    fontSize: 11, cursor: 'pointer', letterSpacing: 0.5,
    fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600,
    background: active ? 'var(--red)' : 'var(--s2)',
    color: active ? '#fff' : 'var(--gray3)',
  })

  const FilterRow = ({ label, options, active, onChange }) => (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginRight: 4, minWidth: 40 }}>{label}:</span>
      {options.map(o => <button key={o} onClick={() => onChange(o)} style={chipStyle(active === o)}>{o}</button>)}
    </div>
  )

  return (
    <div>
      <FilterRow label="Zona"     options={zones}     active={activeZone}      onChange={setActiveZone} />
      {showAccionFilter    && <FilterRow label="Tipo"      options={acciones}   active={activeAccion}    onChange={setActiveAccion} />}
      {showFaseFilter      && <FilterRow label="Fase"      options={fases}      active={activeFase}      onChange={setActiveFase} />}
      {showResultadoFilter && <FilterRow label="Resultado" options={resultados} active={activeResultado} onChange={setActiveResultado} />}

      {chartLabels.length === 0
        ? <div style={{ color: 'var(--gray)', fontSize: 12, padding: '16px 0' }}>Sin datos</div>
        : <div style={{ height: barHeight }}>
            <Bar
              data={{
                labels: chartLabels,
                datasets: [{ data: chartData, backgroundColor: color, borderRadius: 3, _barLabels: true }],
              }}
              options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: GRID, beginAtZero: true },
                  y: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } },
                },
              }}
            />
          </div>
      }
    </div>
  )
}

export function RecuperacionesPanel({ D, labels, PL, raw, activeTorneos }) {
  const events = filterEvents(raw?.recuperaciones, labels, activeTorneos)

  return (
    <div className="panel">
      <SectionHeader title="Recuperaciones del Equipo" right="Jornadas seleccionadas" />

      <div className="g2">
        <Card title="Recuperaciones Totales por Acción">
          <AccionChart events={events} labels={labels} height={200} />
        </Card>
        <Card title="Recuperaciones por Jugador">
          <HorizontalPlayerChart events={events} labels={labels} color={RED} zoneField="cuartoCanpo" />
        </Card>
      </div>

      <div className="g1">
        <Card title="Recuperaciones Campo Rival por Jugador">
          <HorizontalPlayerChart
            events={events.filter(e => e.campoProRiv === 'Campo rival')}
            labels={labels} color={GOLD} zoneField="cuartoCanpo"
          />
        </Card>
      </div>

      <SectionHeader title="Recuperaciones por Zona" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ranking de Jugadores por Zona (1/4 de campo)">
          <ZoneTable events={events} labels={labels} zoneField="cuartoCanpo" />
        </Card>
      </div>

      <SectionHeader title="Mapa de Recuperaciones" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ubicación de Recuperaciones">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <PitchMap
                events={events}
                colorFn={e => e.campoProRiv === 'Campo rival' ? '#e8b832' : '#c81a1a'}
                tooltipFn={e => `${e.jugador} — ${e.accion} (J${e.jornada})`}
                filters={{ jugador: [...new Set(events.map(e => e.jugador).filter(Boolean))].sort() }}
              />
            </div>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Leyenda</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#c81a1a', flexShrink: 0, display: 'inline-block' }} />Campo propio
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e8b832', flexShrink: 0, display: 'inline-block' }} />Campo rival
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function BalonesPanel({ D, labels, PL, raw, activeTorneos }) {
  const events = filterEvents(raw?.balones, labels, activeTorneos)

  return (
    <div className="panel">
      <SectionHeader title="Balones Perdidos" right="Jornadas seleccionadas" />

      <div className="g2">
        <Card title="Balones Perdidos por Acción">
          <AccionChart events={events} labels={labels} height={220} />
        </Card>
        <Card title="Balones Perdidos por Jugador">
          <HorizontalPlayerChart events={events} labels={labels} color={RED} zoneField="cuartoCampo" />
        </Card>
      </div>

      <SectionHeader title="Balones Perdidos por Zona" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ranking de Jugadores por Zona (1/4 de campo)">
          <ZoneTable events={events} labels={labels} zoneField="cuartoCampo" />
        </Card>
      </div>

      <SectionHeader title="Mapa de Pérdidas" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ubicación de Balones Perdidos">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <PitchMap
                events={events}
                colorFn={e => e.campoProRiv === 'Campo rival' ? '#e8b832' : '#c81a1a'}
                tooltipFn={e => `${e.jugador} — ${e.accion} (J${e.jornada})`}
                filters={{ jugador: [...new Set(events.map(e => e.jugador).filter(Boolean))].sort() }}
              />
            </div>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Leyenda</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#c81a1a', flexShrink: 0, display: 'inline-block' }} />Campo propio
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#e8b832', flexShrink: 0, display: 'inline-block' }} />Campo rival
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function DuelosPanel({ D, labels, PL, raw, activeTorneos }) {
  const events = filterEvents(raw?.duelos, labels, activeTorneos)

  return (
    <div className="panel">
      <SectionHeader title="Duelos" right="Jornadas seleccionadas" />

      <div className="g1">
        <Card title="Duelos por Jugador">
          <HorizontalPlayerChart events={events} labels={labels} color={RED} zoneField="cuartoCampo" showAccionFilter={true} showFaseFilter={true} showResultadoFilter={true} />
        </Card>
      </div>

      <SectionHeader title="Duelos por Zona" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ranking de Jugadores por Zona (1/4 de campo)">
          <ZoneTable events={events} labels={labels} zoneField="cuartoCampo" />
        </Card>
      </div>

      <SectionHeader title="Mapa de Duelos" right="Jornadas seleccionadas" />
      <div className="g1">
        <Card title="Ubicación de Duelos">
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
            <div style={{ width: 280, flexShrink: 0 }}>
              <PitchMap
                events={events}
                colorFn={e => e.resultado === 'Ganado' ? '#3fb950' : '#c81a1a'}
                tooltipFn={e => `${e.jugador} — ${e.resultado} — ${e.accion} (J${e.jornada})`}
                filters={{
                  resultado: [...new Set(events.map(e => e.resultado).filter(Boolean))],
                  jugador:   [...new Set(events.map(e => e.jugador).filter(Boolean))].sort(),
                }}
              />
            </div>
            <div style={{ paddingTop: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 }}>Leyenda</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#3fb950', flexShrink: 0, display: 'inline-block' }} />Ganado
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--gray3)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#c81a1a', flexShrink: 0, display: 'inline-block' }} />Perdido
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function FisicoPanel({ raw, labels, activeTorneos }) {
  const [selectedMetric, setSelectedMetric] = React.useState('distancia')
  const [sortBy, setSortBy] = React.useState('distancia')
  const [mode, setMode] = React.useState('total') // 'total' | 'promedio'

  const METRICS = [
    { key: 'distancia',     label: 'Distancia',          unit: 'm',       short: 'Dist.' },
    { key: 'distanciaMin',  label: 'Dist./min',           unit: 'm/min',   short: 'D/min' },
    { key: 'hsrAbs',        label: 'HSR',                 unit: 'm',       short: 'HSR' },
    { key: 'hsrAbsMin',     label: 'HSR/min',             unit: 'm/min',   short: 'HSR/min' },
    { key: 'accAlta',       label: 'Acc. Alta Int.',      unit: 'm',       short: 'Acc' },
    { key: 'decAlta',       label: 'Dec. Alta Int.',      unit: 'm',       short: 'Dec' },
    { key: 'sprintsCount',  label: 'Sprints',             unit: '',        short: 'Sprints' },
    { key: 'sprintMaxDist', label: 'Sprint Dist. Máx.',   unit: 'm',       short: 'SpDist' },
    { key: 'velocidadMax',  label: 'Velocidad Máx.',      unit: 'km/h',    short: 'V.Máx' },
    { key: 'sprintMaxCount',label: 'Sprint Máx.',         unit: '',        short: 'SpMax' },
    { key: 'playerLoad',    label: 'Player Load',         unit: 'a.u.',    short: 'Load' },
    { key: 'hmld',          label: 'HMLD',                unit: 'm',       short: 'HMLD' },
    { key: 'explosiveDist', label: 'Explosive Distance',  unit: 'm',       short: 'ExpDist' },
  ]

  const events = useMemo(() => {
    if (!raw?.fisico) return []
    const fisicoJornadas = [...new Set(raw.fisico.map(e => e.jornada).filter(Boolean))]
    const activeLabels = labels && labels.length
      ? labels.filter(l => fisicoJornadas.includes(l))
      : fisicoJornadas

    // First try with torneo filter
    let filtered = raw.fisico.filter(e => {
      if (activeLabels.length && !activeLabels.includes(e.jornada)) return false
      if (activeTorneos && activeTorneos.length) {
        if (!activeTorneos.includes(e.torneo)) return false
      }
      const name = (e.jugador || '').trim().toLowerCase()
      if (EXCLUDED_PLAYERS.includes(name)) return false
      return true
    })

    // If torneo filter yields nothing, ignore it (torneo field may be inconsistent)
    if (filtered.length === 0) {
      filtered = raw.fisico.filter(e => {
        if (activeLabels.length && !activeLabels.includes(e.jornada)) return false
        const name = (e.jugador || '').trim().toLowerCase()
        if (EXCLUDED_PLAYERS.includes(name)) return false
        return true
      })
    }

    return filtered
  }, [raw, labels, activeTorneos])

  // Aggregate per player (sum for counts/distances, max for speeds)
  const MAX_METRICS = ['velocidadMax', 'distanciaMin', 'hsrAbsMin']
  const playerData = useMemo(() => {
    const byPlayer = {}
    events.forEach(e => {
      const name = e.jugador
      if (!name) return
      if (!byPlayer[name]) {
        byPlayer[name] = { jugador: name, count: 0 }
        METRICS.forEach(m => { byPlayer[name][m.key] = 0 })
      }
      byPlayer[name].count++
      METRICS.forEach(m => {
        const val = e[m.key] || 0
        if (MAX_METRICS.includes(m.key)) {
          byPlayer[name][m.key] = Math.max(byPlayer[name][m.key], val)
        } else {
          byPlayer[name][m.key] += val
        }
      })
    })
    return Object.values(byPlayer).map(p => {
      const avg = { ...p }
      METRICS.forEach(m => {
        if (!MAX_METRICS.includes(m.key) && p.count > 0) {
          avg[m.key + '_avg'] = p[m.key] / p.count
        } else {
          avg[m.key + '_avg'] = p[m.key]
        }
      })
      return avg
    })
  }, [events])

  // Get display value based on mode
  const val = (p, key) => mode === 'promedio'
    ? (p[key + '_avg'] ?? p[key])
    : p[key]

  const sortedData = useMemo(() => {
    return [...playerData].sort((a, b) => val(b, sortBy) - val(a, sortBy))
  }, [playerData, sortBy, mode])

  // Chart data for selected metric
  const chartData = useMemo(() => {
    return [...playerData]
      .sort((a, b) => val(b, selectedMetric) - val(a, selectedMetric))
      .slice(0, 20)
  }, [playerData, selectedMetric, mode])

  const metric = METRICS.find(m => m.key === selectedMetric)
  const barHeight = Math.max(280, chartData.length * 30)

  if (!events.length) return (
    <div className="panel">
      <div className="empty">
        <div className="big">🏃</div>
        <p style={{ fontSize: 20, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 2, color: 'var(--gray3)', marginBottom: 8, textTransform: 'uppercase' }}>Sin datos físicos</p>
        <p style={{ fontSize: 13 }}>Selecciona jornadas con datos GPS disponibles.</p>
      </div>
    </div>
  )

  const thS = { padding: '7px 10px', fontSize: 10, color: 'var(--gray2)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer' }
  const tdS = { padding: '6px 8px', fontSize: 11, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap' }

  return (
    <div className="panel">
      <SectionHeader title="Físico — Datos GPS" right="Jornadas seleccionadas" />

      {/* Mode + Metric selector */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['total', 'promedio'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '4px 14px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
              background: mode === m ? 'var(--gold)' : 'var(--s2)',
              color: mode === m ? '#111' : 'var(--gray3)',
            }}>{m === 'total' ? 'Total' : 'Promedio/partido'}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <span style={{ fontSize: 10, color: 'var(--gray)', letterSpacing: 1, textTransform: 'uppercase' }}>Métrica:</span>
        {METRICS.map(m => (
          <button key={m.key} onClick={() => { setSelectedMetric(m.key); setSortBy(m.key) }} style={{
            padding: '3px 10px', borderRadius: 3, border: 'none', fontSize: 11, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600, letterSpacing: 0.5,
            background: selectedMetric === m.key ? 'var(--red)' : 'var(--s2)',
            color: selectedMetric === m.key ? '#fff' : 'var(--gray3)',
          }}>{m.short}</button>
        ))}
      </div>

      {/* Horizontal bar chart */}
      <div className="g1">
        <Card title={`${metric?.label} por Jugador${metric?.unit ? ` (${metric.unit})` : ''} — ${mode === 'promedio' ? 'Promedio/partido' : 'Total'}`}>
          <div style={{ height: barHeight }}>
            <Bar
              data={{
                labels: chartData.map(p => p.jugador),
                datasets: [{ data: chartData.map(p => +val(p, selectedMetric).toFixed(1)), backgroundColor: RED, borderRadius: 3, _barLabels: true }],
              }}
              options={{
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: GRID, beginAtZero: true },
                  y: { grid: { display: false }, ticks: { color: '#aaa', font: { size: 11 } } },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Full data table */}
      <SectionHeader title="Tabla Completa" right={`${sortedData.length} jugadores · ${mode === 'promedio' ? 'Promedio/partido' : 'Total acumulado'}`} />
      <div className="g1">
        <Card title="Datos por Jugador (click en columna para ordenar)">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left', width: 36 }}>#</th>
                  <th style={{ ...thS, textAlign: 'left' }}>Jugador</th>
                  <th style={{ ...thS }}>Part.</th>
                  {METRICS.map(m => (
                    <th key={m.key} onClick={() => setSortBy(m.key)} style={{
                      ...thS,
                      color: sortBy === m.key ? 'var(--gold)' : 'var(--gray2)',
                    }}>
                      {m.short} {sortBy === m.key ? '▾' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((p, idx) => (
                  <tr key={p.jugador} style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ ...tdS, color: idx < 3 ? GOLD : 'var(--gray3)', fontWeight: 700 }}>{idx + 1}</td>
                    <td style={{ ...tdS, textAlign: 'left', color: 'var(--white)', fontWeight: 600 }}>{p.jugador}</td>
                    <td style={{ ...tdS, color: 'var(--gray3)' }}>{p.count}</td>
                    {METRICS.map(m => {
                      const v = val(p, m.key)
                      return (
                        <td key={m.key} style={{
                          ...tdS,
                          color: sortBy === m.key ? 'var(--white)' : 'var(--gray3)',
                          fontWeight: sortBy === m.key ? 700 : 400,
                        }}>
                          {v > 0 ? (+v.toFixed(1)) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
