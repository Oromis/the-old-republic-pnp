import ObjectUtils from '../util/ObjectUtils.js'
import HumanoidMetrics from './HumanoidMetrics.js'

const list = [
  ...HumanoidMetrics.list,
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
