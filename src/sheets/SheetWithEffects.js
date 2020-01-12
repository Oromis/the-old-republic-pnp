import Mixin from './Mixin.js'
import ObjectUtils from '../util/ObjectUtils.js'
import Attributes from '../datasets/AllAttributes.js'
import Metrics from '../datasets/AllMetrics.js'
import ResistanceTypes from '../datasets/ResistanceTypes.js'
import { timeout } from '../util/Timing.js'
import SpecialProperties from '../datasets/SpecialProperties.js'

export default class SheetWithEffects extends Mixin {
  /**
   * Injects effect configuration logic into the sheet.
   * @param parent The sheet instance to inject into
   * @param {AutoSubmitSheet} autoSubmit The AutoSubmitSheet instance used by the sheet. Required.
   * @param {boolean} paysForActivation True if the effects configured by this sheet pay for skill
   *    activation costs. False otherwise.
   */
  constructor(parent, { autoSubmit, paysForActivation = false }) {
    super(parent)

    this._options = {
      paysForActivation
    }

    autoSubmit.addFilter('data.effects.*.value', (obj, { name, path }) => {
      const effects = ObjectUtils.cloneDeep(this.itemEffects)
      const [_data, _effects, index, ...rest] = path
      if (effects.length >= +index) {
        ObjectUtils.set(effects[index], rest.join('.'), +obj[name])
        return { 'data.effects': effects }
      } else {
        return {}
      }
    })

    this._resetNewEffect = function () {
      this._newEffect = { key: null, label: null, bonus: null, xp: null, xpCategoryBonus: null }
    }

    this._resetNewEffect()
    autoSubmit.addFilter('newEffect.*', (obj, { name, path }) => {
      // The "new effect" data isn't actually stored in the item, it's just kept in the UI until it is added
      // as a full effect
      const key = path[path.length - 1]
      this._newEffect[key] = obj[name]
      if (key === 'type') {
        parent.render(false)
      }
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
        const hasBonus = typeof newEffect.bonus === 'number' && newEffect.bonus !== 0
        const hasXp = typeof newEffect.xp === 'number' && newEffect.xp !== 0
        const hasXpCategoryBonus = typeof newEffect.xpCategoryBonus === 'number' && newEffect.xpCategoryBonus !== 0
        if (newEffect.key && (hasBonus || hasXp || hasXpCategoryBonus)) {
          if (!newEffect.label) {
            newEffect.label = newEffect.key
          }

          const toAdd = ObjectUtils.pick(newEffect, ['key', 'label'])
          toAdd.value = {}
          if (hasBonus) {
            toAdd.value.bonus = newEffect.bonus
          }
          if (hasXp) {
            toAdd.value.xp = newEffect.xp
            toAdd.value.activationPaid = this._options.paysForActivation
          }
          if (hasXpCategoryBonus) {
            toAdd.value.xpCategoryBonus = newEffect.xpCategoryBonus
          }
          this._resetNewEffect()
          this.parent.item.update({
            'data.effects': [
              ...this.itemEffects,
              toAdd,
            ],
          })
        }
      }
    })
    html.find('.delete-effect').click(e => {
      const targetKey = +e.currentTarget.getAttribute('data-index')
      this.parent.item.update({
        'data.effects': this.itemEffects.filter((v, i) => i !== targetKey),
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
        { label: 'Sonstiges', properties: SpecialProperties.list },
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

  get itemEffects() {
    return Array.isArray(this.parent.item.effects) ? this.parent.item.effects : []
  }
}
