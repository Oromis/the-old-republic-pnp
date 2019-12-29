import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'

// This hack is needed because Foundry sets the item's owner ("actor" key) after prepareData() was called for the
// first time. Unfortunately, we need to know whether we're an owned item or not by then. So we capture the options
// constructor argument before invoking the super constructor and use it in the first prepareData() call.
let optionsDuringConstruction = null
function captureOptions(options) {
  optionsDuringConstruction = options
  return options
}

export default class SwTorItem extends Item {
  constructor(data, options = {}, ...rest) {
    super(data, captureOptions(options), ...rest)

    this._constructed = true

    this._callDelegate('afterConstruct')
  }

  prepareData(data) {
    data = super.prepareData(data) || this.data

    if (!this._constructed) {
      this.options = optionsDuringConstruction
      this._callDelegate('beforeConstruct')
      this._constructed = true
    }

    this._callDelegate('beforePrepareData', data)
    this._callDelegate('afterPrepareData', data)

    return data
  }

  update(data, ...rest) {
    super.update(this._filterUpdateData(data), ...rest)
  }

  _onUpdate(...args) {
    this._cache.clear()
    return super._onUpdate(...args)
  }

  // ----------------------------------------------------------------------------
  // Data access
  // ----------------------------------------------------------------------------

  get dataSet() {
    if (this._dataSetStore == null) {
      this._dataSetStore = DataSets.fromItemType(this.type, { owned: this.isOwned })
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

  _filterUpdateData(data) {
    data = expandObject(data)
    for (const filter of this._updateFilters) {
      const pathParts = filter.path.split('.')
      let matches = true
      let context = data
      for (const part of pathParts) {
        if (part in context) {
          context = context[part]
        } else {
          matches = false
          break
        }
      }
      if (matches) {
        filter.filter(data, { match: context })
      }
    }
    return data
  }

  get _updateFilters() {
    if (this._updateFiltersStore == null) {
      this._updateFiltersStore = []
    }
    return this._updateFiltersStore
  }

  _addUpdateFilter(path, filter) {
    this._updateFilters.push({ path, filter })
  }
}
