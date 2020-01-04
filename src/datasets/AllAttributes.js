import ObjectUtils from '../util/ObjectUtils.js'
import HumanoidAttributes from './HumanoidAttributes.js'

const list = [
  ...HumanoidAttributes.list,
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
