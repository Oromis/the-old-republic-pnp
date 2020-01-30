import ObjectUtils from '../util/ObjectUtils.js'
import {SlotPrototype} from './Slot.js'

const list = [
  new SlotPrototype('limb-1', { staticData: { label: 'Limb 1', type: 'hand', supportsWeapon: true, } }),
  new SlotPrototype('limb-2', { staticData: { label: 'Limb 2', type: 'hand', supportsWeapon: true, } }),
  new SlotPrototype('limb-3', { staticData: { label: 'Limb 3', type: 'hand', supportsWeapon: true, } }),
  new SlotPrototype('limb-4', { staticData: { label: 'Limb 4', type: 'hand', supportsWeapon: true, } }),
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
