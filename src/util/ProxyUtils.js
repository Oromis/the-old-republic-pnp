export function keyMissing(callback) {
  return function (obj, prop) {
    if (prop in obj) {
      return obj[prop]
    } else {
      return callback(obj, prop)
    }
  }
}
