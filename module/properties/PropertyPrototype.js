import Property from './Property.js'

export default class PropertyPrototype {
  constructor(key, { staticData, template, updaters = [], PropertyClass = Property }) {
    this.key = key
    this._staticData = staticData
    this._template = template
    this._updaters = updaters

    this.PropertyClass = PropertyClass

    for (const [key] of Object.entries(this._staticData)) {
      if (!(key in this)) {
        Object.defineProperty(this, key, {
          get() { return this._staticData[key] }
        })
      }
    }
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
