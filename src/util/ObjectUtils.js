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

function omitBy(obj, predicate) {
  return Object.entries(obj)
    .filter(entry => !predicate(entry[1], entry[0]))
    .reduce(zipEntries, {})
}

function mapValues(obj, func) {
  return Object.entries(obj)
    .map(([k, v]) => [k, func(v, k)])
    .reduce(zipEntries, {})
}

export function isObject(arg) {
  return arg != null && typeof arg === 'object'
}

export default Object.freeze({
  asArray,

  pick(obj, keys) {
    keys = asArray(keys)
    return Object.entries(obj)
      .filter(entry => keys.indexOf(entry[0]) !== -1)
      .reduce(zipEntries, {})
  },

  omit(obj, keys) {
    keys = asArray(keys)
    return Object.entries(obj)
      .filter(entry => keys.indexOf(entry[0]) === -1)
      .reduce(zipEntries, {})
  },

  mapValues,
  omitBy,
  omitZero(obj) {
    return omitBy(obj, val => val === 0 || val == null)
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
      const isPathComponent = typeof path === 'string' || typeof path === 'number'
      if (!isPathComponent && path != null && path.default != null) {
        defaultValue = path.default
      }
      return isPathComponent
    })
    const segments = paths

    if (obj == null) {
      return defaultValue
    }

    let val = obj
    for (const segment of segments) {
      val = val[segment]
      if (val == null) {
        return defaultValue
      }
    }
    return val
  },

  set(obj, path, value) {
    const paths = path.split('.')

    let parent = obj
    for (let i = 0; i < paths.length; ++i) {
      if (!isObject(parent)) {
        throw new Error(`Expected object, found ${parent}`)
      }

      if (i < paths.length - 1) {
        // Walk the path
        parent = parent[paths[i]]
      } else {
        // Set the value
        parent[paths[i]] = value
      }
    }
  },

  sameValue(value, ...keys) {
    const result = {}
    for (const key of keys) {
      result[key] = value
    }
    return result
  },

  cloneDeep,

  validObjectsFilter: isObject,
})
