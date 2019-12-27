import { defineDataAccessor } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'effects')
  }
}
