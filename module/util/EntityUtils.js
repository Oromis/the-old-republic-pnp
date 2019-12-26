import PropertyPrototype from '../properties/PropertyPrototype.js'
import ObjectUtils from '../ObjectUtils.js'

export function defineDataAccessor(object, key) {
  Object.defineProperty(object, key, {
    get() {
      return this.data.data[key]
    }
  })
}

export function defineEnumAccessor(object, key, { dataKey = key, dataSetKey = key + 's', instanceDataKey } = {}) {
  Object.defineProperty(object, key, {
    get() {
      return this._cache.lookup(key, () => {
        const key = ObjectUtils.try(this.data.data, ...dataKey.split('.'))
        let result = this.dataSet[dataSetKey].map[key]
        if (result == null) {
          result = this.dataSet[dataSetKey].map[this.dataSet[dataSetKey].default]
        }
        if (result instanceof PropertyPrototype) {
          result = result.instantiate(this, ObjectUtils.try(this.data.data, ...instanceDataKey.split('.')))
        }
        return result
      })
    }
  })
}

export default {
  defineDataAccessor,
  defineEnumAccessor,
}
