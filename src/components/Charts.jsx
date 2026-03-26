import React from 'react'
import { Bar } from 'react-chartjs-2'
import {
  RED, GOLD, WHT, GRN, GRID,
  barLineDatasets, stackedDatasets, baseOptions,
} from '../utils/chartUtils'

// ── Generic bar+line (red bars, white bars, gold line)
export function BarLineChart({ labels, d, height = 150, maxY }) {
  return (
    <div style={{ position: 'relative' }}>
      <Bar
        height={height}
        data={barLineDatasets(labels, d)}
        options={baseOptions(true, maxY)}
      />
    </div>
  )
}

// ── Stacked-style (perdidas / recuperaciones)
export function StackedChart({ labels, d, height = 150 }) {
  return (
    <div style={{ position: 'relative' }}>
      <Bar
        height={height}
        data={stackedDatasets(labels, d)}
        options={{
          responsive: true,
          maintainAspectRatio: true,
          plugins: { legend: { display: false } },
          scales: { x: { grid: GRID }, y: { grid: GRID } },
        }}
      />
    </div>
  )
}

// ── Goles & xG per jornada
export function GolesXgChart({ labels, golesJ, xgJ, height = 150 }) {
  return (
    <Bar
      height={height}
      data={{
        labels,
        datasets: [
          { type: 'bar', data: golesJ, backgroundColor: RED,  borderRadius: 2, _barLabels: true, order: 2, label: 'Goles' },
          { type: 'bar', data: xgJ,   backgroundColor: WHT,  borderRadius: 2, _barLabels: true, order: 2, label: 'xG' },
        ],
      }}
      options={{
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } },
      }}
    />
  )
}

// ── Posesión + pases combinados
export function PosesionChart({ labels, posesion, pasesPos, height = 110 }) {
  return (
    <Bar
      height={height}
      data={{
        labels,
        datasets: [
          {
            type: 'bar', data: posesion, backgroundColor: RED + 'bb',
            yAxisID: 'y', borderRadius: 2, _isPosBar: true, order: 2, label: 'Posesión %',
          },
          {
            type: 'line', data: pasesPos, borderColor: GOLD,
            backgroundColor: 'transparent', yAxisID: 'y2',
            tension: .4, pointRadius: 4, pointBackgroundColor: GOLD,
            borderWidth: 2.5, _isPosLine: true, order: 1, label: 'Pases/pos',
          },
        ],
      }}
      options={{
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: GRID },
          y: {
            grid: GRID,
            ticks: { callback: v => v + '%' },
            max: 75,
            title: { display: true, text: 'Posesión %', color: '#555', font: { size: 10 } },
          },
          y2: {
            position: 'right', grid: { display: false },
            title: { display: true, text: 'Pases/pos', color: '#555', font: { size: 10 } },
            min: 0, max: 6,
          },
        },
      }}
    />
  )
}

// ── Pases por tipo
export function PasesChart({ labels, tot, log, eff, height = 150 }) {
  return (
    <Bar
      height={height}
      data={{
        labels,
        datasets: [
          { type: 'bar',  data: tot, backgroundColor: RED,  yAxisID: 'y',  borderRadius: 2, _barLabels: true,  order: 2 },
          { type: 'bar',  data: log, backgroundColor: WHT,  yAxisID: 'y',  borderRadius: 2, _barLabels: true,  order: 2 },
          { type: 'line', data: eff, borderColor: GOLD, backgroundColor: 'transparent', yAxisID: 'y2',
            tension: .4, pointRadius: 4, pointBackgroundColor: GOLD, borderWidth: 2.5, _lineLabels: true, order: 1 },
        ],
      }}
      options={baseOptions(true)}
    />
  )
}

// ── Simple bar chart (for per-player comparisons or single-metric per jornada)
export function PlayerBarChart({ labels, data, color = RED, height = 180 }) {
  return (
    <Bar
      height={height}
      data={{ labels, datasets: [{ data, backgroundColor: color, borderRadius: 3, _barLabels: true }] }}
      options={{
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { x: { grid: GRID }, y: { grid: GRID, beginAtZero: true } },
      }}
    />
  )
}

// ── Single stat bar chart for individual player
export function StatBarChart({ labels, data, color = RED, height = 140 }) {
  const bgs = data.map((_, i) => {
    const isLast = i === data.length - 1
    const base = color === WHT ? 'rgba(210,210,210,' : color === GOLD ? '#e8b83' : RED
    if (color === RED)  return isLast ? RED  : RED  + '88'
    if (color === GOLD) return isLast ? GOLD : GOLD + '88'
    return isLast ? 'rgba(210,210,210,.85)' : 'rgba(210,210,210,.4)'
  })
  return (
    <Bar
      height={height}
      data={{ labels, datasets: [{ data, backgroundColor: bgs, borderRadius: 4, borderSkipped: false, _barLabels: true, _statChart: true }] }}
      options={{
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#222', borderColor: '#333', borderWidth: 1 } },
        scales: {
          x: { grid: GRID, ticks: { color: '#666' } },
          y: { grid: GRID, beginAtZero: true, ticks: { color: '#666' } },
        },
      }}
    />
  )
}
