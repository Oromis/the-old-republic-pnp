import Property from './Property.js'

export default class PropertyPrototype {
  constructor(key, { staticData, template, updaters = [], PropertyClass = Property }) {
    this.key = key
    this._staticData = staticData
    this._template = template
    this._updaters = updaters

    this.PropertyClass = PropertyClass
  }

  instantiate(entity, data) {
    return new this.PropertyClass(this.key, entity, this.applyTemplate(data), {
      staticData: this._staticData,
      updaters: this._updaters,
    })
  }

  applyTemplate(data) {
    return Object.assign({}, this._template, data)
  }
}
