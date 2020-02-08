import Alea from './Alea.js'

export default class PRNG {
  constructor(seed) {
    this.alea = new Alea(seed)
  }

  fromRange(arg) {
    let min = 0
    let max
    if (typeof arg === 'number') {
      max = arg
    } else if (typeof arg === 'object') {
      if (typeof arg.min === 'number') {
        min = arg.min
      }
      max = arg.max
    }

    const diff = max - min
    return min + (this.alea.quick() * diff)
  }

  intFromRange(arg) {
    return Math.floor(this.fromRange(arg))
  }

  decide(chance = 0.5) {
    return this.alea.quick() < chance
  }

  fromArray(array) {
    const index = this.intFromRange(array.length)
    return array[index]
  }

  fromWeightedArray(array, { remove = false, calcWeight = cur => cur.weight } = {}) {
    const total = array.reduce((acc, cur) => acc + calcWeight(cur), 0)
    const target = this.fromRange(total)
    let sum = 0
    const index = array.findIndex(item => {
      sum += calcWeight(item)
      return sum >= target
    })
    const result = array[index]
    if (remove) {
      array.splice(index, 1)
    }
    return result
  }
}
