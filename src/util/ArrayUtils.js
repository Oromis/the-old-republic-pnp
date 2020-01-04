export default {
  removeBy(array, predictate) {
    const result = []
    for (let i = 0; i < array.length; ) {
      if (predictate(array[i])) {
        // Remove this element
        result.push(array[i])
        array.splice(i, 1)
      } else {
        // Move to next element
        ++i
      }
    }
    return result
  }
}
