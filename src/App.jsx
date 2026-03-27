import React, { useState, useMemo } from 'react'
import useSheetData from './hooks/useSheetData'
import { Header, Sidebar, JornadaFilter, TorneoFilter, Loading, ErrorState } from './components/UI'
import ColectivoPanel from './components/ColectivoPanel'
import IndividualPanel from './components/IndividualPanel'
import { RecuperacionesPanel, BalonesPanel, DuelosPanel, FisicoPanel } from './components/AnalysisPanels'
import PerfilPanel from './components/PerfilPanel'
import RankingsPanel from './components/RankingsPanel'
import Login from './components/Login'

function Dashboard() {
  const { status, jornadas, D, PL, raw, error, reload } = useSheetData()
  const [sbOpen,    setSbOpen]    = useState(true)
  const [current,   setCurrent]   = useState('colectivo')
  const [activeTorneos, setActiveTorneos] = useState([])
  const [activeJ,   setActiveJ]   = useState([]) // shared across all panels

  // Extract unique torneos from ALL data sources
  const torneos = useMemo(() => {
    if (!raw) return []
    const all = [
      ...(raw.colectivo      || []),
      ...(raw.recuperaciones || []),
      ...(raw.balones        || []),
      ...(raw.duelos         || []),
    ]
    return [...new Set(all.map(r => r.torneo).filter(Boolean))].sort()
  }, [raw])

  const effectiveTorneos = activeTorneos.length ? activeTorneos : torneos

  // Jornadas filtered by torneo (for non-fisico panels)
  const jornadasFiltered = useMemo(() => {
    if (!effectiveTorneos.length || !raw?.colectivo) return jornadas
    if (effectiveTorneos.length === torneos.length) return jornadas
    const jornadasDelTorneo = new Set(
      raw.colectivo
        .filter(r => effectiveTorneos.includes(r.torneo) &&
          (r.equipo === 'Necaxa' || r['Equipo'] === 'Necaxa'))
        .map(r => r.jornada)
    )
    return jornadas.filter(j => jornadasDelTorneo.has(j))
  }, [effectiveTorneos, jornadas, raw, torneos])

  // Jornadas del físico (independientes de colectivo)
  const jornadasFisico = useMemo(() => {
    if (!raw?.fisico) return []
    const filtered = activeTorneos.length
      ? raw.fisico.filter(r => activeTorneos.includes(r.torneo))
      : raw.fisico
    const set = [...new Set(filtered.map(r => r.jornada).filter(Boolean))]
    return set.sort((a, b) => parseInt(String(a).replace(/\D/g,'')) - parseInt(String(b).replace(/\D/g,'')))
  }, [raw, activeTorneos])

  // Active jornadas — shared, mapped against current panel's jornada list
  const currentJornadas = current === 'fisico' ? jornadasFisico : jornadasFiltered
  const allIdx          = useMemo(() => currentJornadas.map((_, i) => i), [currentJornadas])
  const effectiveJ      = activeJ.length ? activeJ : allIdx

  const handleTorneoChange = (t) => {
    setActiveTorneos(t.length === torneos.length ? [] : t)
    setActiveJ([]) // reset to all on torneo change
  }

  // Map selected indices to label strings for current panel
  const activeLabels = effectiveJ.map(i => currentJornadas[i]).filter(Boolean)

  // For colectivo D filtering we still need index-based approach against full jornadas
  const filteredD = (d) => {
    if (!d || !Object.keys(d).length) return d
    const filterArr = arr => {
      if (!Array.isArray(arr)) return arr
      return activeLabels.map(lbl => {
        const fi = jornadas.indexOf(lbl)
        return fi >= 0 ? (arr[fi] ?? 0) : 0
      })
    }
    const result = {}
    for (const key of Object.keys(d)) {
      const val = d[key]
      if (Array.isArray(val)) result[key] = filterArr(val)
      else if (val && typeof val === 'object') {
        result[key] = {}
        for (const k2 of Object.keys(val)) result[key][k2] = filterArr(val[k2])
      } else result[key] = val
    }
    return result
  }

  const badge = useMemo(() => {
    const torneoLabel = effectiveTorneos.length === torneos.length || !torneos.length
      ? '' : effectiveTorneos.length === 1 ? `${effectiveTorneos[0]} · ` : `${effectiveTorneos.length} torneos · `
    const labels = activeJ.length ? activeJ.map(i => jornadasFiltered[i]).filter(Boolean) : jornadasFiltered
    if (!labels.length) return 'Sin datos'
    if (labels.length === 1) return `${torneoLabel}${labels[0]}`
    return `${torneoLabel}${labels[0]}–${labels[labels.length - 1]}`
  }, [activeJ, jornadasFiltered, effectiveTorneos, torneos])

  if (status === 'loading') return (
    <div className="app">
      <Header sidebarOpen={sbOpen} onToggle={() => setSbOpen(o => !o)} badge="Cargando..." />
      <div className="body-wrap"><div className="main-area"><Loading /></div></div>
    </div>
  )

  if (status === 'error') return (
    <div className="app">
      <Header sidebarOpen={sbOpen} onToggle={() => setSbOpen(o => !o)} badge="Error" />
      <div className="body-wrap"><div className="main-area"><ErrorState message={error} onRetry={reload} /></div></div>
    </div>
  )

  const panels = {
    colectivo:      <ColectivoPanel D={filteredD(D)} labels={activeLabels} PL={PL} jornadaLabel={badge} />,
    individual:     <IndividualPanel PL={PL} labels={activeLabels} allJornadas={jornadasFiltered} />,
    perfil:         <PerfilPanel PL={PL} raw={raw} labels={activeLabels} activeTorneos={effectiveTorneos} allJornadas={jornadasFiltered} />,
    recuperaciones: <RecuperacionesPanel labels={activeLabels} PL={PL} raw={raw} activeTorneos={effectiveTorneos} />,
    balones:        <BalonesPanel labels={activeLabels} PL={PL} raw={raw} activeTorneos={effectiveTorneos} />,
    duelos:         <DuelosPanel labels={activeLabels} PL={PL} raw={raw} activeTorneos={effectiveTorneos} />,
    fisico:         <FisicoPanel raw={raw} labels={activeLabels} activeTorneos={effectiveTorneos} />,
    rankings:       <RankingsPanel raw={raw} labels={activeLabels} activeTorneos={effectiveTorneos} />,
  }

  return (
    <div className="app">
      <Header sidebarOpen={sbOpen} onToggle={() => setSbOpen(o => !o)} badge={badge} />
      <div className="body-wrap">
        <Sidebar open={sbOpen} current={current} onNav={setCurrent} />
        <div className="main-area">
          <div style={{ padding: '16px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div className="ptitle">{{
                colectivo: 'Informe Colectivo', individual: 'Informe Individual',
                perfil: 'Perfil del Jugador',
                recuperaciones: 'Recuperaciones', balones: 'Balones Perdidos',
                duelos: 'Duelos', fisico: 'Físico', rankings: 'Rankings Liga MX'
              }[current]}</div>
              <div className="psub">Rendimiento · Google Sheets en vivo</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {torneos.length > 0 && (
                <TorneoFilter
                  torneos={torneos}
                  active={activeTorneos.length ? activeTorneos : torneos}
                  onChange={handleTorneoChange}
                />
              )}
              <JornadaFilter
                jornadas={currentJornadas}
                active={effectiveJ}
                onChange={setActiveJ}
              />
            </div>
          </div>
          {panels[current]}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [role, setRole] = React.useState(() => sessionStorage.getItem("necaxa_role") || null)
  if (!role) return <Login onLogin={r => setRole(r)} />
  return <Dashboard />
}
