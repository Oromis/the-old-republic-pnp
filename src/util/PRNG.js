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
    return min + Math.floor(this.alea.quick() * diff)
  }

  fromArray(array) {
    const index = this.fromRange(array.length)
    return array[index]
  }

  fromWeightedArray(array) {
    const total = array.reduce((acc, cur) => acc + cur.weight, 0)
    const target = this.fromRange(total)
    let sum = 0
    return array.find(item => {
      sum += item.weight
      return sum >= target
    })
  }
}
