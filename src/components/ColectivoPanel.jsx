import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  BarLineChart, StackedChart, GolesXgChart,
  PosesionChart, PasesChart, PlayerBarChart,
} from './Charts'
import { SectionHeader, PhaseDivider, Card, Legend, XGBar } from './UI'
import { RED, GOLD, WHT, GRN, GRID } from '../utils/chartUtils'
import PDFExportButton from './PDFExport'

// Card wrapper that adds a pdf-capture id
function ChartCard({ id, title, children }) {
  return (
    <div id={id}>
      <Card title={title}>{children}</Card>
    </div>
  )
}

export default function ColectivoPanel({ D, labels, jornadaLabel }) {

  return (
    <div className="panel">

      {/* ══════ OFENSIVA ══════ */}
      <PhaseDivider label="⚽ Fase Ofensiva" />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <PDFExportButton jornadaLabel={jornadaLabel} />
      </div>
      <SectionHeader title="Finalización" right="Jornadas seleccionadas" />

      <div className="g2">
        <ChartCard id="pdf-chart-golesxg" title="Goles & xG por Jornada">
          <Legend items={[{ color: RED, label: 'Goles' }, { color: '#ccc', label: 'xG' }]} />
          <GolesXgChart labels={labels} golesJ={D.golesJ} xgJ={D.xgJ} />
        </ChartCard>
        <ChartCard id="pdf-chart-tiros" title="Tiros & Tiros a Portería">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Tiros' }, { color: '#ccc', label: 'A portería' }]} />
          <BarLineChart labels={labels} d={D.tiros} />
        </ChartCard>
      </div>

      <div className="g2">
        <ChartCard id="pdf-chart-centros" title="Centros & Centros Logrados">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Centros' }, { color: '#ccc', label: 'Logrados' }]} />
          <BarLineChart labels={labels} d={D.centros} />
        </ChartCard>
        <ChartCard id="pdf-chart-atpos" title="Ataques Posicionales">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'At. posicionales' }, { color: '#ccc', label: 'Con remate' }]} />
          <BarLineChart labels={labels} d={D.atPos} />
        </ChartCard>
      </div>

      <SectionHeader title="Posesión" right="Jornadas seleccionadas" />
      <div className="g1">
        <ChartCard id="pdf-chart-posesion" title="Posesión % & Promedio Pases por Posesión">
          <Legend items={[{ color: RED, label: 'Posesión %' }, { type: 'line', color: GOLD, label: 'Pases/posesión' }]} />
          <PosesionChart labels={labels} posesion={D.posesion} pasesPos={D.pasesPos} />
        </ChartCard>
      </div>

      <SectionHeader title="Pases" right="Jornadas seleccionadas" />
      <div className="g3">
        <ChartCard id="pdf-chart-pases-tot" title="Pases Totales">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Total' }, { color: '#ccc', label: 'Logrados' }]} />
          <PasesChart labels={labels} tot={D.pasesTot?.r} log={D.pasesTot?.w} eff={D.pasesTot?.e} />
        </ChartCard>
        <ChartCard id="pdf-chart-pases-larg" title="Pases Largos">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Total' }, { color: '#ccc', label: 'Logrados' }]} />
          <PasesChart labels={labels} tot={D.pasesLarg?.r} log={D.pasesLarg?.w} eff={D.pasesLarg?.e} />
        </ChartCard>
        <ChartCard id="pdf-chart-pases-ut" title="Pases Último Tercio">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Total' }, { color: '#ccc', label: 'Logrados' }]} />
          <PasesChart labels={labels} tot={D.pasesUT?.r} log={D.pasesUT?.w} eff={D.pasesUT?.e} />
        </ChartCard>
        <ChartCard id="pdf-chart-pases-prog" title="Pases Progresivos">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Total' }, { color: '#ccc', label: 'Logrados' }]} />
          <PasesChart labels={labels} tot={D.pasesProg?.r} log={D.pasesProg?.w} eff={D.pasesProg?.e} />
        </ChartCard>
        <ChartCard id="pdf-chart-pases-cruz" title="Pases Cruzados Profundidad">
          <Legend items={[{ color: RED, label: 'Completados' }]} />
          <PlayerBarChart labels={labels} data={D.pasesCruz?.r || []} color={RED} height={150} />
        </ChartCard>
        <ChartCard id="pdf-chart-pases-prof" title="Pases a Profundidad">
          <Legend items={[{ color: RED, label: 'Completados' }]} />
          <PlayerBarChart labels={labels} data={D.pasesProf?.r || []} color={RED} height={150} />
        </ChartCard>
      </div>

      <SectionHeader title="Pérdidas & Duelos Ofensivos" right="Jornadas seleccionadas" />
      <div className="g2">
        <ChartCard id="pdf-chart-perdidas" title="Pérdidas por Zona">
          <Legend items={[{ type: 'line', color: GRN, label: 'Total' }, { color: RED, label: 'Bajas' }, { color: '#ccc', label: 'Medias' }, { color: GOLD, label: 'Altas' }]} />
          <StackedChart labels={labels} d={D.perdidas} height={170} />
        </ChartCard>
        <ChartCard id="pdf-chart-duelos-ofe" title="Duelos Ofensivos">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Totales' }, { color: '#ccc', label: 'Ganados' }]} />
          <BarLineChart labels={labels} d={D.duelosOfe} height={170} />
        </ChartCard>
      </div>

      <SectionHeader title="ABPs a Favor" right="Jornadas seleccionadas" />
      <div className="g2">
        <ChartCard id="pdf-chart-cfav" title="Corners">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Corners' }, { color: '#ccc', label: 'Con remate' }]} />
          <BarLineChart labels={labels} d={D.cfav} />
        </ChartCard>
        <ChartCard id="pdf-chart-afav" title="ABPs">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'ABPs' }, { color: '#ccc', label: 'Con remate' }]} />
          <BarLineChart labels={labels} d={D.afav} />
        </ChartCard>
      </div>

      {/* ══════ DEFENSIVA ══════ */}
      <PhaseDivider label="🛡 Fase Defensiva" />

      <SectionHeader title="Finalización en Contra" right="Jornadas seleccionadas" />
      <div className="g3">
        <ChartCard id="pdf-chart-golesrec" title="Goles Recibidos & xGA">
          <Legend items={[{ color: RED, label: 'Goles recibidos' }, { color: '#ccc', label: 'xGA' }]} />
          <GolesXgChart labels={labels} golesJ={D.golesRecibidos || []} xgJ={D.xgaRecibido || []} />
        </ChartCard>
        <ChartCard id="pdf-chart-tirosc" title="Tiros Rivales & A Portería">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Tiros rival' }, { color: '#ccc', label: 'A portería' }]} />
          <BarLineChart labels={labels} d={D.tirosC} />
        </ChartCard>
        <ChartCard id="pdf-chart-centrosc" title="Centros Rivales">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Centros rival' }, { color: '#ccc', label: 'Logrados' }]} />
          <BarLineChart labels={labels} d={D.centrosC} />
        </ChartCard>
      </div>

      <SectionHeader title="PPDA & Recuperación & Intensidad" right="Jornadas seleccionadas" />
      <div className="g3">
        <ChartCard id="pdf-chart-intensidad" title="Intensidad de Recuperación">
          <Legend items={[{ color: RED, label: 'Necaxa' }, { color: '#ccc', label: 'Rival' }]} />
          <Bar
            height={150}
            data={{
              labels,
              datasets: [
                { data: D.intensidad      || [], backgroundColor: RED, borderRadius: 2, _barLabels: true, label: 'Necaxa' },
                { data: D.intensidadRival || [], backgroundColor: WHT, borderRadius: 2, _barLabels: true, label: 'Rival' },
              ],
            }}
            options={{
              responsive: true, maintainAspectRatio: true,
              plugins: { legend: { display: false } },
              scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } },
            }}
          />
        </ChartCard>
        <ChartCard id="pdf-chart-ppda" title="PPDA — Necaxa">
          <PlayerBarChart labels={labels} data={D.ppda || []} color={RED} height={150} />
        </ChartCard>
        <ChartCard id="pdf-chart-recup" title="Recuperaciones">
          <Legend items={[{ type: 'line', color: GRN, label: 'Total' }, { color: RED, label: 'Bajas' }, { color: '#ccc', label: 'Medias' }, { color: GOLD, label: 'Altas' }]} />
          <StackedChart labels={labels} d={D.recup} height={150} />
        </ChartCard>
      </div>

      <SectionHeader title="Duelos Aéreos & Defensivos" right="Jornadas seleccionadas" />
      <div className="g2">
        <ChartCard id="pdf-chart-ddef" title="Duelos Defensivos">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Totales' }, { color: '#ccc', label: 'Ganados' }]} />
          <BarLineChart labels={labels} d={D.duelosDef} />
        </ChartCard>
        <ChartCard id="pdf-chart-daer" title="Duelos Aéreos">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Totales' }, { color: '#ccc', label: 'Ganados' }]} />
          <BarLineChart labels={labels} d={D.duelosAer} />
        </ChartCard>
      </div>

      <SectionHeader title="ABPs en Contra" right="Jornadas seleccionadas" />
      <div className="g2">
        <ChartCard id="pdf-chart-ccon" title="Corners Rivales">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'Corners' }, { color: '#ccc', label: 'Con remate' }]} />
          <BarLineChart labels={labels} d={D.ccon} />
        </ChartCard>
        <ChartCard id="pdf-chart-acon" title="ABPs Rivales">
          <Legend items={[{ type: 'line', color: GOLD, label: 'Efectividad' }, { color: RED, label: 'ABPs rival' }, { color: '#ccc', label: 'Con remate' }]} />
          <BarLineChart labels={labels} d={D.acon} />
        </ChartCard>
      </div>

    </div>
  )
}
