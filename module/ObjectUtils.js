function asArray(any) {
  if (any == null) {
    return null
  } else if (Array.isArray(any)) {
    return any
  } else {
    return [any]
  }
}

function zipEntries(acc, cur) {
  acc[cur[0]] = cur[1]
  return acc
}

function cloneDeep(aObject) {
  if (!aObject || typeof aObject !== 'object') {
    return aObject;
  }

  const result = Array.isArray(aObject) ? [] : {}
  for (const k in aObject) {
    const v = aObject[k]
    result[k] = (typeof v === "object") ? cloneDeep(v) : v
  }

  return result
}

export default Object.freeze({
  asArray,

  pick(obj, keys) {
    keys = asArray(keys)
    return Object.entries(obj)
      .filter(entry => keys.indexOf(entry[0]) !== -1)
      .reduce(zipEntries, {})
  },

  omitBy(obj, predicate) {
    return Object.entries(obj)
      .filter(entry => !predicate(entry[1], entry[0]))
      .reduce(zipEntries, {})
  },

  asObject(array, key) {
    return array.reduce((acc, cur) => {
      acc[cur[key]] = cur
      return acc
    }, {})
  },

  try(obj, ...paths) {
    let defaultValue = null
    paths = paths.filter(path => {
      const isString = typeof path === 'string'
      if (!isString && path != null && path.default != null) {
        defaultValue = path.default
      }
      return isString
    })

    if (obj == null) {
      return defaultValue
    }

    let val = obj
    for (const path of paths) {
      val = val[path]
      if (val == null) {
        return defaultValue
      }
    }
    return val
  },

  sameValue(value, ...keys) {
    const result = {}
    for (const key of keys) {
      result[key] = value
    }
    return result
  },

  cloneDeep,
})
