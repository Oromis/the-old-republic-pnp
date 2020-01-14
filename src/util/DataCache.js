export default class DataCache {
  constructor() {
    this._data = {}
  }

  clear() {
    this._data = {}
  }

  clearKey(key) {
    delete this._data[key]
  }

  lookup(key, generator) {
    if (key in this._data) {
      return this._data[key]
    } else if (typeof generator === 'function') {
      return this._data[key] = generator(key)
    }
  }

  insert(key, value) {
    this._data[key] = value
    return value
  }
}
