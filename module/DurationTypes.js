import ObjectUtils from './ObjectUtils.js'

const list = [
  { key: 'instant', label: 'Sofort', hasOneTimeCost: true },
  { key: 'toggle', label: 'Aktivierbar', hasOneTimeCost: true, hasPerTurnCost: true },
  { key: 'channeling', label: 'Anhaltend', hasPerTurnCost: true },
  { key: 'rounds', label: 'Runden', hasFormula: true, hasOneTimeCost: true },
]

export default Object.freeze({
  list,
  map: ObjectUtils.asObject(list, 'key'),
})
