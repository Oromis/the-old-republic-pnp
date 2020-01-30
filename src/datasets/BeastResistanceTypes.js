import ObjectUtils from '../util/ObjectUtils.js'
import ResistanceTypes from './ResistanceTypes.js'

const list = [
  ResistanceTypes.map.r_armor,
  ResistanceTypes.map.r_fire,
  ResistanceTypes.map.r_poison,
  ResistanceTypes.map.r_ice,
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
