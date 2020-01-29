import ObjectUtils from '../util/ObjectUtils.js'
import HumanoidAttributes from './HumanoidAttributes.js'

const list = [
  ...HumanoidAttributes.list,

  // Beast attributes aren't included here on purpose since logically they are the same as the humanoid ones
  // ...BeastAttributes.list,
]

export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
