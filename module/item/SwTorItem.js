import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'

export default class SwTorItem extends Item {
  constructor(...args) {
    super(...args)

    this._constructed = true

    this._callDelegate('afterConstruct')
  }

  prepareData(data) {
    data = super.prepareData(data) || this.data

    if (!this._constructed) {
      this._callDelegate('beforeConstruct')
      this._constructed = true
    }

    this._callDelegate('beforePrepareData', data)
    this._callDelegate('afterPrepareData', data)

    return data
  }

  _onUpdate(...args) {
    this._cache.clear()
    return super._onUpdate(...args)
  }

  // ----------------------------------------------------------------------------
  // Data access
  // ----------------------------------------------------------------------------

  get isEquipped() {
    return Array.isArray(this.data.slots) && this.data.slots.length > 0
  }

  get dataSet() {
    if (this._dataSetStore == null) {
      this._dataSetStore = DataSets.fromItemType(this.type)
    }
    return this._dataSetStore
  }

  // ----------------------------------------------------------------------------
  // Private methods
  // ----------------------------------------------------------------------------

  get _cache() {
    if (this._cacheStore == null) {
      this._cacheStore = new DataCache()
    }
    return this._cacheStore
  }

  _callDelegate(callbackName, ...args) {
    const delegates = [...(this.dataSet.delegates || []), this.dataSet.delegate]
    let result
    for (const delegate of delegates) {
      if (delegate != null && typeof delegate[callbackName] === 'function') {
        result = delegate[callbackName].apply(this, args)
      }
    }
    return result
  }
}
