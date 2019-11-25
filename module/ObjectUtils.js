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
  }
})
