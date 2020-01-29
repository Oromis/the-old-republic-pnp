import Property from '../properties/Property.js'
import {explainPermanentPropertyValue} from '../CharacterFormulas.js'
import {makeRoll} from '../util/EntityUtils.js'

export default class Attribute extends Property {
  get check() {
    return {
      rolls: [makeRoll(this)],
    }
  }

  get permanentValue() {
    return explainPermanentPropertyValue(this.entity, this)
  }
}
