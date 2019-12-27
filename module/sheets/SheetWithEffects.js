import Mixin from './Mixin.js'
import ObjectUtils from '../util/ObjectUtils.js'
import Attributes from '../datasets/AllAttributes.js'
import Metrics from '../datasets/AllMetrics.js'
import ResistanceTypes from '../datasets/ResistanceTypes.js'
import { timeout } from '../util/Timing.js'

export default class SheetWithEffects extends Mixin {
  constructor(parent, { autoSubmit }) {
    super(parent)

    autoSubmit.addFilter('data.effects.*.value', (obj, { name, path }) => {
      const effects = ObjectUtils.cloneDeep(parent.item.effects || [])
      const index = +path[2]
      if (effects.length >= index) {
        effects[index].value = +obj[name]
        return { 'data.effects': effects }
      } else {
        return {}
      }
    })

    this._newEffect = { key: null, label: null, value: null }
    autoSubmit.addFilter('newEffect.*', (obj, { name, path }) => {
      // The "new effect" data isn't actually stored in the item, it's just kept in the UI until it is added
      // as a full effect
      const key = path[path.length - 1]
      this._newEffect[key] = obj[name]
      parent.render(false)
      return {}
    })

    this.interceptMethod('getData', ({ args, callSuper }) => {
      const data = callSuper(...args)
      data.newEffect = this._newEffect
      data.predefinedEffects = this._categorizedPredefinedEffects
      return data
    }, { wrapSuper: true })

    this.interceptMethod('activateListeners', this.activateListeners)

    this.interceptMethod('_handleDrop', ({ args, callSuper }) => {
      const [type, item] = args
      const res = callSuper(...args)
      if (!res && item.data.key && typeof item.data.key === 'string') {
        this._newEffect.type = ''
        this._newEffect.key = item.data.key
        this._newEffect.label = item.name
        parent.render(false)
        return true
      } else {
        return res
      }
    }, { wrapSuper: true })
  }

  activateListeners(html) {
    html.find('.new-effect').click(() => {
      const newEffect = ObjectUtils.cloneDeep(this._newEffect)
      if (newEffect != null) {
        if (newEffect.type) {
          // Predefined type
          newEffect.key = newEffect.type
          newEffect.label = this._getPredefinedEffectByKey(newEffect.type).label
        }
        if (newEffect.key && typeof newEffect.value === 'number') {
          if (!newEffect.label) {
            newEffect.label = newEffect.key
          }
          this._newEffect.key = ''
          this._newEffect.label = ''
          this._newEffect.value = ''
          this.parent.item.update({
            'data.effects': [...(this.parent.item.effects || []), ObjectUtils.pick(newEffect, ['key', 'label', 'value'])],
          })
        }
      }
    })
    html.find('.delete-effect').click(e => {
      const targetKey = +e.currentTarget.getAttribute('data-index')
      this.parent.item.update({
        'data.effects': (this.parent.item.effects || []).filter((v, i) => i !== targetKey),
      })
    })

    html.find('.submit-effect').on('keypress', async e => {
      if (e.key === 'Enter') {
        await timeout(10)
        html.find('.new-effect').click()
      }
    })
  }

  get _categorizedPredefinedEffects() {
    if (this._predefinedEffectsStore == null) {
      this._predefinedEffectsStore = [
        { label: 'Attribute', properties: Attributes.list },
        { label: 'Metriken', properties: Metrics.list },
        { label: 'Resistenzen', properties: ResistanceTypes.list },
      ]
    }
    return this._predefinedEffectsStore
  }

  _getPredefinedEffectByKey(key) {
    for (const category of this._categorizedPredefinedEffects) {
      for (const property of category.properties) {
        if (property.key === key) {
          return property
        }
      }
    }
    return null
  }
}
