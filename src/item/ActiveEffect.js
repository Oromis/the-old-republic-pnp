import { defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineGetter(this, 'showOnToken', function () {
      let result = this.data.data.showOnToken
      if (result == null) {
        result = true
      }
      return result
    })
  }
}
