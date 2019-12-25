export default class Property {
  constructor(key, entity, data, { staticData, updaters = [] }) {
    this._key = key
    this._entity = entity
    this._data = data
    this._staticData = staticData
    this._updaters = updaters

    for (const [key, value] of Object.entries(this.full)) {
      if (!(key in this)) {
        Object.defineProperty(this, key, {
          get() { return this.full[key] }
        })
      }
    }
  }

  update() {
    for (const updater of this._updaters) {
      updater(this._data, { entity: this._entity, property: this })
    }
    return this
  }

  /**
   * @returns {number} The base value (before any modifications / XP / GP put into it)
   */
  calcBaseValue() {
    return 0
  }

  /**
   * @return The database representation of this property, only including persistent fields
   */
  get db() {
    return this._data
  }

  /**
   * @return The full/UI representation of this property, including some non-persistent fields
   */
  get full() {
    return Object.assign({ key: this._key }, this._staticData, this._data)
  }

  get key() {
    return this._key
  }
}
