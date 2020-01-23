import {defineAccessors, defineCachedGetter} from '../util/EntityUtils.js'

class Trigger {
  constructor(data) {
    this._data = data

    defineAccessors(this, this._data)
  }
}

export default {
  beforeConstruct() {
    defineCachedGetter(this, 'triggers', () => {
      return this.data.data.triggers.map(trigger => new Trigger(trigger))
    })
  }
}
