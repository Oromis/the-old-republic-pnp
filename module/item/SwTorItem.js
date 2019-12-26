import DataSets from '../datasets/DataSets.js'

export default class SwTorItem extends Item {
  constructor(...args) {
    super(...args)

    this._constructed = true

    this._callDelegate('afterConstruct')
  }

  prepareData(data) {
    data = super.prepareData(data)

    if (!this._constructed) {
      this._callDelegate('beforeConstruct')
      this._constructed = true
    }

    this._callDelegate('beforePrepareData', data)
    this._callDelegate('afterPrepareData', data)
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

  _callDelegate(callbackName, ...args) {
    const delegates = [...(this.dataSet.delegates || []), this.dataSet.delegate]
    for (const delegate of delegates) {
      if (delegate != null && typeof delegate[callbackName] === 'function') {
        return delegate[callbackName].apply(this, args)
      }
    }
  }

  _defineDataAccessor(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.data.data[key]
      }
    })
  }
}
