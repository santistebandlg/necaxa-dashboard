import { useState, useEffect } from 'react'
import { API_URL } from '../config'

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : +n.toFixed(2)
}

// ── Identificador único de jornada (torneo + jornada) ──────────────────────
// Antes, las jornadas se identificaban solo por su etiqueta ("J1", "J2"...),
// así que si dos torneos comparten etiqueta, todo lo que agrupaba "por
// jornada" mezclaba o perdía datos de uno de los dos. jKey combina ambos en
// un identificador único; jLabel/formatJornadaLabels lo vuelven a mostrar de
// forma legible (solo "J1" si hay un único torneo en juego, o "Torneo · J1"
// si hay varios mezclados para no confundirlos).
const JKEY_SEP = '\u241F'

export function jKey(torneo, jornada) {
  return `${torneo || ''}${JKEY_SEP}${jornada}`
}

export function jParts(key) {
  const i = String(key).indexOf(JKEY_SEP)
  if (i === -1) return { torneo: '', jornada: key }
  return { torneo: key.slice(0, i), jornada: key.slice(i + 1) }
}

export function jLabel(key, showTorneo) {
  const { torneo, jornada } = jParts(key)
  return showTorneo && torneo ? `${torneo} · ${jornada}` : jornada
}

export function formatJornadaLabels(keys) {
  const torneosSet = new Set((keys || []).map(k => jParts(k).torneo))
  const multi = torneosSet.size > 1
  return (keys || []).map(k => jLabel(k, multi))
}

const ROLE_ORDER = [
  'Portero',
  'Stopper Izquierdo Ofensivo',
  'Libero Ofensivo',
  'Stopper Derecho Ofensivo',
  'Lateral que Interioriza',
  'Pivote',
  'Interior Defensivo',
  'Interior Ofensivo',
  'Extremo - Lateral que Interioriza',
  'Extremo',
  'Interior Defensivo - Ofensivo',
  'Delantero',
]

export function processColectivo(rows, jornadas, rivalRows) {
  const byJ = {}
  jornadas.forEach(j => { byJ[j] = rows.find(r => jKey(r.torneo, r.jornada) === j) || {} })

  const rivalByJ = {}
  jornadas.forEach(j => { rivalByJ[j] = (rivalRows || []).find(r => jKey(r.torneo, r.jornada) === j) || {} })

  const pick = f => jornadas.map(j => num(byJ[j]?.[f]))
  const pickRival = f => jornadas.map(j => num(rivalByJ[j]?.[f]))

  return {
    golesJ:    pick('goles'),
    xgJ:       pick('xG'),
    tiros:     { r: pick('tiros'),            w: pick('tirosPorteria'),        e: pick('tirosPorteriaPct') },
    centros:   { r: pick('centros'),          w: pick('centrosPrecisos'),      e: pick('centrosPct') },
    atPos:     { r: pick('ataquesPos'),       w: pick('ataquesPosRemate'),     e: pick('ataquesPosRemPct') },
    posesion:  pick('posesion').map(v => Math.round(v * 10) / 10),
    pasesPos:  pick('promPasesPosesion').map(v => Math.round(v * 10) / 10),
    pasesTot:  { r: pick('pases'),            w: pick('pasesLogrados'),        e: pick('pasesPct') },
    pasesCruz: { r: pick('pasesCruzadosProf'),w: jornadas.map(() => 0),       e: jornadas.map(() => 0) },
    pasesProf: { r: pick('pasesProf'),        w: jornadas.map(() => 0),       e: jornadas.map(() => 0) },
    pasesLarg: { r: pick('pasesLargos'),      w: pick('pasesLargosLog'),       e: pick('pasesLargosPct') },
    pasesUT:   { r: pick('pasesUltimoTercio'),w: pick('pasesUltimoTercioLog'), e: pick('pasesUltimoTercioPct') },
    pasesProg: { r: pick('pasesProg'),        w: pick('pasesProgLog'),         e: pick('pasesProgPct') },
    perdidas:  {
      total: pick('balonesPerdidos'),
      baja:  pick('balonesPerdidosBajos'),
      media: pick('balonesPerdidosMedios'),
      alta:  pick('balonesPerdidosAltos'),
    },
    duelosOfe: { r: pick('duelosOfe'),        w: pick('duelosOfeGan'),         e: pick('duelosOfeGanPct') },
    cfav:      { r: pick('corners'),          w: pick('cornersRemate'),        e: pick('cornersRemPct') },
    afav:      { r: pick('jugadasBalonParado'),w: pick('jugadasBalonParadoRemate'), e: pick('jugadasBalonParadoRemPct') },
    tirosC:    { r: pickRival('tiros'),   w: pickRival('tirosPorteria'),   e: pickRival('tirosPorteriaPct') },
    centrosC:  { r: pickRival('centros'), w: pickRival('centrosPrecisos'), e: pickRival('centrosPct') },
    recup:     {
      total: pick('balonesRecuperados'),
      baja:  pick('balonesRecuperadosBajos'),
      media: pick('balonesRecuperadosMedios'),
      alta:  pick('balonesRecuperadosAltos'),
    },
    duelosDef: { r: pick('duelosDef'),        w: pick('duelosDefGan'),         e: pick('duelosDefGanPct') },
    duelosAer: { r: pick('duelosAereos'),     w: pick('duelosAereosGan'),      e: pick('duelosAereosGanPct') },
    ccon:      { r: pickRival('corners'),          w: pickRival('cornersRemate'),             e: pickRival('cornersRemPct') },
    acon:      { r: pickRival('jugadasBalonParado'),w: pickRival('jugadasBalonParadoRemate'),  e: pickRival('jugadasBalonParadoRemPct') },
    ppda:               pick('ppda'),
    intensidad:         pick('intensidadRecup'),
    intensidadRival:    pickRival('intensidadRecup'),
    // Rival data for defensive section
    golesRecibidos: pickRival('goles'),
    xgaRecibido:    pickRival('xG'),
  }
}

// Direct player → role mapping (ignores posicion field from Sheet)
const PLAYER_ROLES = {
  'agustín oliveros':       'stopper_izq',
  'agustin oliveros':       'stopper_izq',
  'francisco méndez':       'stopper_izq',
  'francisco mendez':       'stopper_izq',
  'alexis peña':            'libero',
  'alexis pena':            'libero',
  'raúl martínez':          'stopper_der',
  'raul martinez':          'stopper_der',
  'daniel leyva':           'pivote',
  'joshua palacios':        'pivote',
  'rogelio cortéz':         'int_def',
  'rogelio cortez':         'int_def',
  'israel tello':           'int_ofe',
  'ricardo monreal':        'extremo',
  'kevin rosero':           'extremo',
  'javier ruiz':            'extremo',
  'lorenzo faravelli':      'int_def_ofe',
  'julián carranza':        'delantero',
  'julian carranza':        'delantero',
  // -- altas Apertura 26/27 --
  'christopher andrade':    'portero',
  'diego ochoa':            'stopper_der',
  'kaiky naves':            'libero',
  'mauro zaleta':           'lateral',
  'carlos vargas':          'lateral',
  'emilio rodríguez':       'extremo',
  'emilio rodriguez':       'extremo',
  'pedro pedraza':          'pivote',
  'matías espíndola':       'int_ofe',
  'matias espindola':       'int_ofe',
  'juan pablo torres':      'int_ofe',
  'juan torres':            'int_ofe',
  'juan valencia':          'delantero',
  'luis jiménez':           'portero',
  'luis jimenez':           'portero',
  'misael pedroza':         'delantero',
}

export const ROLE_LABELS = {
  portero:      'Portero',
  stopper_izq:  'Stopper Izquierdo',
  libero:       'Libero',
  stopper_der:  'Stopper Derecho',
  lateral:      'Lateral que Interioriza',
  pivote:       'Pivote',
  int_def:      'Interior Defensivo',
  int_ofe:      'Interior Ofensivo',
  ext_lat:      'Extremo - Lateral que Interioriza',
  extremo:      'Extremo',
  int_def_ofe:  'Interior Defensivo - Ofensivo',
  delantero:    'Delantero',
}

function getRole(name) {
  return PLAYER_ROLES[(name || '').toLowerCase().trim()] || 'fallback'
}

export function getStatsByRole(name, jornadas, jornadaData, roleOverride) {
  const role = roleOverride || getRole(name)

  const lastJ = [...jornadas].reverse().find(j => jornadaData[j])
  const lastR = jornadaData[lastJ] || {}

  const row = (lbl, totalF, logradoF, pctF, chartF, c) => {
    const total   = lastR[totalF] != null ? num(lastR[totalF]) : null
    const logrado = logradoF ? (lastR[logradoF] != null ? num(lastR[logradoF]) : null) : null
    let pct = null
    if (pctF) {
      if (logrado != null && total) pct = logrado / total
      else if (lastR[pctF] != null) pct = num(lastR[pctF]) // fallback si no hay total/logrado para calcularlo
    }
    return {
      lbl,
      total,
      logrado,
      pct,
      chartData: jornadas.map(j => num(jornadaData[j]?.[chartF] || 0)),
      c: c || 'r',
    }
  }

  if (role === 'portero') return [
    row('Goles recibidos / xGA',        'golesRecibidos',  'xG',              null,             'golesRecibidos',  'r'),
    row('Salidas',                       'salidas',          null,              null,             'salidas',         'w'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Remates en contra / paradas',   'rematesContra',   'paradas',          null,             'rematesContra',   'r'),
    row('Porterías imbatidas',           'paradasReflejos',  null,              null,             'paradasReflejos', 'g'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Pases largos / precisos',       'pasesLargos',     'pasesLargosLog',  'pasesLargosPct', 'pasesLargos',     'r'),
  ]

  if (role === 'stopper_izq') return [
    row('Recuperaciones',                'recuperaciones',   null,              null,             'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Despejes',                      'despejes',         null,              null,             'despejes',        'g'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases largos / precisos',       'pasesLargos',     'pasesLargosLog',  'pasesLargosPct', 'pasesLargos',     'r'),
    row('Centros / precisos',            'centros',         'centrosPrecisos', 'centrosPct',     'centros',         'r'),
  ]

  if (role === 'libero') return [
    row('Recuperaciones',                'recuperaciones',   null,              null,             'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Despejes',                      'despejes',         null,              null,             'despejes',        'g'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases largos / precisos',       'pasesLargos',     'pasesLargosLog',  'pasesLargosPct', 'pasesLargos',     'r'),
  ]

  if (role === 'stopper_der') return [
    row('Recuperaciones',                'recuperaciones',   null,              null,             'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Despejes',                      'despejes',         null,              null,             'despejes',        'g'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases largos / precisos',       'pasesLargos',     'pasesLargosLog',  'pasesLargosPct', 'pasesLargos',     'r'),
    row('Centros / precisos',            'centros',         'centrosPrecisos', 'centrosPct',     'centros',         'r'),
  ]

  if (role === 'lateral') return [
    row('Recuperaciones',                'recuperaciones',   null,              null,             'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
  ]

  if (role === 'pivote') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
  ]

  if (role === 'int_def') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
  ]

  if (role === 'int_ofe') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases últ. tercio / precisos',  'pasesUT',         'pasesUTLog',      'pasesUTPct',     'pasesUT',         'r'),
    row('Duelos ofe. / ganados',         'duelosOfe',       'duelosOfeGan',    'duelosOfeGanPct','duelosOfe',       'r'),
    row('Tiros / logrados',              'tiros',           'tirosLogrados',   'tirosPct',       'tiros',           'r'),
    row('Asistencias a tiro',            'asistenciasTiro',  null,              null,             'asistenciasTiro', 'g'),
    row('Asistencias / xA',              'asistencias',     'xA',               null,             'asistencias',     'g'),
    row('Goles / xG',                    'goles',           'xG',               null,             'goles',           'g'),
  ]

  if (role === 'ext_lat') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases últ. tercio / precisos',  'pasesUT',         'pasesUTLog',      'pasesUTPct',     'pasesUT',         'r'),
    row('Duelos ofe. / ganados',         'duelosOfe',       'duelosOfeGan',    'duelosOfeGanPct','duelosOfe',       'r'),
    row('Centros / precisos',            'centros',         'centrosPrecisos', 'centrosPct',     'centros',         'r'),
    row('Regates / logrados',            'regates',         'regatesLogrados', 'regatesPct',     'regates',         'r'),
    row('Tiros / logrados',              'tiros',           'tirosLogrados',   'tirosPct',       'tiros',           'r'),
    row('Toques en área rival',          'toqueAreaRival',   null,              null,             'toqueAreaRival',  'g'),
    row('Asistencias a tiro',            'asistenciasTiro',  null,              null,             'asistenciasTiro', 'g'),
    row('Asistencias / xA',              'asistencias',     'xA',               null,             'asistencias',     'g'),
    row('Goles / xG',                    'goles',           'xG',               null,             'goles',           'g'),
  ]

  if (role === 'extremo') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases últ. tercio / precisos',  'pasesUT',         'pasesUTLog',      'pasesUTPct',     'pasesUT',         'r'),
    row('Duelos ofe. / ganados',         'duelosOfe',       'duelosOfeGan',    'duelosOfeGanPct','duelosOfe',       'r'),
    row('Centros / precisos',            'centros',         'centrosPrecisos', 'centrosPct',     'centros',         'r'),
    row('Regates / logrados',            'regates',         'regatesLogrados', 'regatesPct',     'regates',         'r'),
    row('Tiros / logrados',              'tiros',           'tirosLogrados',   'tirosPct',       'tiros',           'r'),
    row('Toques en área rival',          'toqueAreaRival',   null,              null,             'toqueAreaRival',  'g'),
    row('Asistencias a tiro',            'asistenciasTiro',  null,              null,             'asistenciasTiro', 'g'),
    row('Asistencias / xA',              'asistencias',     'xA',               null,             'asistencias',     'g'),
    row('Goles / xG',                    'goles',           'xG',               null,             'goles',           'g'),
  ]

  if (role === 'int_def_ofe') return [
    row('Recuperaciones / campo rival',  'recuperaciones',  'recuperacionesAdv',null,            'recuperaciones',  'r'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Interceptaciones',              'interceptaciones', null,              null,             'interceptaciones','w'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Pases adelante / precisos',     'pasesAdelante',   'pasesAdelanteLog','pasesAdelantePct','pasesAdelante',  'r'),
    row('Pases últ. tercio / precisos',  'pasesUT',         'pasesUTLog',      'pasesUTPct',     'pasesUT',         'r'),
    row('Duelos ofe. / ganados',         'duelosOfe',       'duelosOfeGan',    'duelosOfeGanPct','duelosOfe',       'r'),
    row('Tiros / logrados',              'tiros',           'tirosLogrados',   'tirosPct',       'tiros',           'r'),
    row('Toques en área rival',          'toqueAreaRival',   null,              null,             'toqueAreaRival',  'g'),
    row('Asistencias a tiro',            'asistenciasTiro',  null,              null,             'asistenciasTiro', 'g'),
    row('Asistencias / xA',              'asistencias',     'xA',               null,             'asistencias',     'g'),
    row('Goles / xG',                    'goles',           'xG',               null,             'goles',           'g'),
  ]

  if (role === 'delantero') return [
    row('Recup. campo rival',            'recuperacionesAdv',null,              null,             'recuperacionesAdv','g'),
    row('Duelos ofe. / ganados',         'duelosOfe',       'duelosOfeGan',    'duelosOfeGanPct','duelosOfe',       'r'),
    row('Duelos aéreos / ganados',       'duelosAereos',    'duelosAereosGan', 'duelosAereosPct','duelosAereos',    'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
    row('Pases recibidos',               'pasesRecibidos',   null,              null,             'pasesRecibidos',  'w'),
    row('Tiros / logrados',              'tiros',           'tirosLogrados',   'tirosPct',       'tiros',           'r'),
    row('Toques en área rival',          'toqueAreaRival',   null,              null,             'toqueAreaRival',  'g'),
    row('Asistencias a tiro',            'asistenciasTiro',  null,              null,             'asistenciasTiro', 'g'),
    row('Asistencias / xA',              'asistencias',     'xA',               null,             'asistencias',     'g'),
    row('Goles / xG',                    'goles',           'xG',               null,             'goles',           'g'),
  ]

  // Fallback
  return [
    row('Recuperaciones',                'recuperaciones',   null,              null,             'recuperaciones',  'r'),
    row('Duelos def. / ganados',         'duelosDef',       'duelosDefGan',    'duelosDefGanPct','duelosDef',       'r'),
    row('Pases / precisos',              'pases',           'pasesLogrados',   'pasesPct',       'pases',           'r'),
    row('Balones perdidos',              'balonesPerdidos',  null,              null,             'balonesPerdidos', 'r'),
  ]
}

export function processJugadores(rows, jornadas) {
  const jugMap = {}
  rows.forEach(r => {
    const nombre = r.jugador
    if (!nombre) return
    if (!jugMap[nombre]) jugMap[nombre] = {
      name: nombre,
      pos:  r.posicion || '',
      id:   nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      ini:  nombre.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase(),
      jornadaData: {},
    }
    jugMap[nombre].jornadaData[jKey(r.torneo, r.jornada)] = r
  })

  const players = Object.values(jugMap).map(p => {
    const lastJ = jornadas.filter(j => p.jornadaData[j]).slice(-1)[0]
    const lastR = p.jornadaData[lastJ] || {}
    const mins  = num(lastR.minutos)
    const pct   = Math.min(+(mins / 90 * 100).toFixed(0), 100)
    const role  = getRole(p.name)
    const stats = getStatsByRole(p.name, jornadas, p.jornadaData)
    const displayRole = ROLE_LABELS[role] || p.pos || 'Sin posición'
    return { id: p.id, name: p.name, pos: displayRole, defaultRole: role, ini: p.ini, mins, pct, stats, lastJ, rawByJ: p.jornadaData }
  })

  return players.sort((a, b) => {
    const roleKeys = Object.keys(ROLE_LABELS)
    const aRole = getRole(a.name)
    const bRole = getRole(b.name)
    const ai = roleKeys.indexOf(aRole)
    const bi = roleKeys.indexOf(bRole)
    const aIdx = ai === -1 ? 99 : ai
    const bIdx = bi === -1 ? 99 : bi
    if (aIdx !== bIdx) return aIdx - bIdx
    return a.name.localeCompare(b.name)
  })
}

export default function useSheetData() {
  const [state, setState] = useState({ status: 'loading', jornadas: [], D: {}, PL: [], raw: null })

  const load = async () => {
    setState(s => ({ ...s, status: 'loading' }))
    try {
      // In production (Vercel), use the proxy to avoid CORS
      const url = window.location.hostname === 'localhost'
        ? API_URL + '?action=all'
        : '/api/data'

      const res  = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      if (text.trim().startsWith('<')) throw new Error('El script devolvió HTML. Verifica que el acceso sea "Cualquier persona (anónimo)".')
      const raw  = JSON.parse(text)

      const colRows   = (raw.colectivo || []).filter(r => r.equipo === 'Necaxa' || r['Equipo'] === 'Necaxa')
      const rivalRows = (raw.colectivo || []).filter(r => r.equipo !== 'Necaxa' && r['Equipo'] !== 'Necaxa')
      const jorSet    = [...new Set(colRows.map(r => jKey(r.torneo, r.jornada)).filter(Boolean))]
      const jornadas  = jorSet.sort((a, b) => {
        const pa = jParts(a), pb = jParts(b)
        if (pa.torneo !== pb.torneo) return pa.torneo.localeCompare(pb.torneo)
        return parseInt(String(pa.jornada).replace(/\D/g,'')) - parseInt(String(pb.jornada).replace(/\D/g,''))
      })
      const D  = processColectivo(colRows, jornadas, rivalRows)
      const PL = processJugadores(raw.jugadores || [], jornadas)
      setState({ status: 'ok', jornadas, D, PL, raw })
    } catch (err) {
      setState(s => ({ ...s, status: 'error', error: err.message }))
    }
  }

  useEffect(() => { load() }, [])

  return { ...state, reload: load }
}
