import { defineDataAccessor, defineEnumAccessor, defineGetter } from '../util/EntityUtils.js'

export default {
  beforeConstruct() {
    defineDataAccessor(this, 'description')
    defineDataAccessor(this, 'quantity')
    defineDataAccessor(this, 'weight')
    defineDataAccessor(this, 'price')
    defineEnumAccessor(this, 'itemType', { getKey: () => this.data.type, dataSetKey: 'itemTypes' })

    this._addUpdateFilter('data.skill', data => {
      // Skill keys are always lowercase internally
      if (typeof data.data.skill === 'string') {
        data.data.skill = data.data.skill.toLowerCase()
      }
    })
  }
}
