import Property from './Property.js'
import {keyMissing} from '../util/ProxyUtils.js'

export default class PropertyPrototype {
  constructor(key, { staticData, template, updaters = [], PropertyClass = Property }) {
    this.key = key
    this._staticData = staticData
    this._template = template
    this._updaters = updaters

    this.PropertyClass = PropertyClass
  }

  instantiate(entity, data) {
    const property = new this.PropertyClass(this.key, entity, this.applyTemplate(data), {
      staticData: this._staticData,
      updaters: this._updaters,
    })
    // Enable access to all data members of the property without any further effort
    return new Proxy(property, keyMissing((p, key) => p.full[key]))
  }

  applyTemplate(data) {
    return Object.assign({}, this._template, data)
  }
}
