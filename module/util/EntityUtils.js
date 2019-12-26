import PropertyPrototype from '../properties/PropertyPrototype.js'
import ObjectUtils from './ObjectUtils.js'
import Property from '../properties/Property.js'

export function defineDataAccessor(object, key) {
  Object.defineProperty(object, key, {
    get() {
      return this.data.data[key]
    }
  })
}

export function defineEnumAccessor(
  object, key, { dataKey = key, dataSetKey = key + 's', getEnumData, instanceDataKey, configurable = false } = {}
) {
  Object.defineProperty(object, key, {
    configurable,
    get() {
      return this._cache.lookup(key, () => {
        const key = ObjectUtils.try(this.data.data, ...dataKey.split('.'))
        const enumData = typeof getEnumData === 'function' ? getEnumData() : this.dataSet[dataSetKey]
        let result = enumData.map[key]
        if (result == null) {
          result = enumData.map[enumData.default]
        }
        if (result instanceof PropertyPrototype) {
          let instanceData = null
          if (instanceDataKey != null) {
            instanceData = ObjectUtils.try(this.data.data, ...instanceDataKey.split('.'))
          }
          result = result.instantiate(this, instanceData)
        }
        return result
      })
    }
  })
}

export function defineGetter(object, key, getter) {
  Object.defineProperty(object, key, {
    get() {
      return getter.call(this)
    }
  })
}

export function makeRoll(property) {
  const result = {
    key: property.key,
    label: property.label || property.name,
    value: property.value.total,
  }
  if (result.target == null && typeof result.value === 'number') {
    result.target = Math.floor(result.value / 5)
  }
  return result
}

export default {
  defineDataAccessor,
  defineEnumAccessor,
  defineGetter,
}
