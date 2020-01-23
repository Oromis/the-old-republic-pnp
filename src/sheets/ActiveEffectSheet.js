import AutoSubmitSheet from './AutoSubmitSheet.js'
import { onDragOver, onDropItem } from '../util/SheetUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import Attributes from '../datasets/AllAttributes.js'
import Metrics from '../datasets/AllMetrics.js'
import ResistanceTypes from '../datasets/ResistanceTypes.js'
import SpecialProperties from '../datasets/SpecialProperties.js'
import SkillCategories from '../datasets/SkillCategories.js'

export default class ActiveEffectSheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    this._newTrigger = {}
    this._newActions = []

    const autoSubmit = new AutoSubmitSheet(this)
    autoSubmit.addFilter('newTrigger.*', (obj, { name, path }) => {
      const key = path[path.length - 1]
      this._newTrigger[key] = obj[name]
      this._newTrigger.supportsCondition = ['onTurnStart', 'onTurnEnd'].includes(this._newTrigger.event)
      this.render(false)
      return {}
    })

    autoSubmit.addFilter('newActions.*', (obj, { name, path }) => {
      const key = path[path.length - 1]
      const index = path[1]
      if (this._newActions[index] == null) {
        this._newActions[index] = {}
      }
      this._newActions[index][key] = obj[name]
      this.render(false)
      return {}
    })
  }

  /**
   * Extend and override the default options used by the Simple Item Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
			classes: ["sw-tor", "sheet", "item"],
			template: "systems/sw-tor/templates/active-effect-sheet.html",
			width: 554,
			height: 700,
		})
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Item sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    data.newTrigger = this._newTrigger
    data.newActions = this._newActions
    data.effectTypes = this._categorizedEffectTypes
    data.metricTypes = Metrics.list
    data.activeEffect = data.item = this.item
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {object}   The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html)

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    // Make the Item sheet droppable for other items
    this.form.ondragover = onDragOver()
    this.form.ondrop = onDropItem(this._handleDrop)

    html.find('.new-trigger').on('click', this._onNewTrigger)
    html.find('.delete-trigger').on('click', this._onDeleteTrigger)
    html.find('.new-effect').on('click', this._onNewEffect)
    html.find('.new-metric').on('click', this._onNewMetric)
    html.find('.new-end').on('click', this._onNewTermination)
    html.find('.delete-action').on('click', this._onDeleteAction)
  }

  _onNewTrigger = () => {
    if (this._newTrigger.event == null) {
      ui.notifications.error(`Ereignis fehlt!`)
      return
    }
    if (this._newTrigger.condition && !this._newTrigger.conditionArg) {
      ui.notifications.error(`Argument für Bedingung fehlt!`)
      return
    }
    const newTrigger = ObjectUtils.omit(this._newTrigger, ['supportsCondition'])
    newTrigger.actions = []
    this._newTrigger = {}
    return this.item.update({
      'data.triggers': [...this.item.data.data.triggers, newTrigger]
    })
  }

  _onDeleteTrigger = e => {
    if (confirm(`Willst du den Trigger wirklich löschen?`)) {
      const index = +e.currentTarget.getAttribute('data-index')
      return this.item.update({
        'data.triggers': this.item.data.data.triggers.filter((t, i) => i !== index)
      })
    }
  }

  _onNewEffect = e => {
    const index = +e.currentTarget.getAttribute('data-index')
    let newAction = this._newActions[index]
    if (newAction.effectKey == null) {
      ui.notifications.error(`Effekt auswählen!`)
      return
    }
    if (!newAction.effectBonus) {
      ui.notifications.error(`Bonus angeben!`)
      return
    }
    const effectProperty = this._getEffectTypeByKey(newAction.effectKey)
    if (effectProperty == null) {
      ui.notifications.error(`Effekt ${newAction.effectKey} unbekannt!`)
      return
    }
    newAction = {
      type: 'effect',
      key: newAction.effectKey,
      label: effectProperty.label,
      value: { bonus: newAction.effectBonus },
    }

    return this._addAction({ index, action: newAction })
  }

  _onNewMetric = e => {
    const index = +e.currentTarget.getAttribute('data-index')
    let newAction = this._newActions[index]
    if (newAction.metricKey == null) {
      ui.notifications.error(`Metrik auswählen!`)
      return
    }
    if (!newAction.metricDelta) {
      ui.notifications.error(`Delta angeben!`)
      return
    }
    const metric = Metrics.map[newAction.metricKey]
    if (metric == null) {
      ui.notifications.error(`Metrik ${newAction.metricKey} unbekannt!`)
      return
    }
    newAction = {
      type: 'metric',
      key: newAction.metricKey,
      label: metric.label,
      value: { delta: newAction.metricDelta },
    }

    return this._addAction({ index, action: newAction })
  }

  _onNewTermination = e => {
    const index = +e.currentTarget.getAttribute('data-index')
    return this._addAction({ index, action: { type: 'end' } })
  }

  _addAction({ index, action }) {
    this._newActions[index] = null
    return this.item.update({
      'data.triggers': this.item.data.data.triggers.map((trigger, i) => {
        if (i === index) {
          trigger = ObjectUtils.cloneDeep(trigger)
          trigger.actions = [...(trigger.actions || []), action]
        }
        return trigger
      })
    })
  }

  _onDeleteAction = e => {
    if (confirm(`Willst du die Aktion wirklich löschen?`)) {
      const triggerIndex = +e.currentTarget.getAttribute('data-trigger-index')
      const actionIndex = +e.currentTarget.getAttribute('data-action-index')
      return this.item.update({
        'data.triggers': this.item.data.data.triggers.map((trigger, i) => {
          if (i === triggerIndex) {
            trigger = ObjectUtils.cloneDeep(trigger)
            trigger.actions = trigger.actions.filter((_, idx) => idx !== actionIndex)
          }
          return trigger
        })
      })
    }
  }

  _updateObject() {
    return Promise.resolve()
  }

  _handleDrop = (type, item) => {
    return false
  }

  get _categorizedEffectTypes() {
    if (this._predefinedEffectsStore == null) {
      this._predefinedEffectsStore = [
        { label: 'Attribute', properties: Attributes.list },
        { label: 'Metriken', properties: Metrics.list },
        ...SkillCategories.list.map(cat => ({
          label: cat.label,
          properties: game.items.entities.filter(i => i.type === 'skill' && i.category === cat.key),
        })),
        { label: 'Mächte', properties: game.items.entities.filter(i => i.type === 'force-skill') },
        { label: 'Resistenzen', properties: ResistanceTypes.list },
        { label: 'Sonstiges', properties: SpecialProperties.list },
      ]
    }
    return this._predefinedEffectsStore
  }

  _getEffectTypeByKey(key) {
    for (const category of this._categorizedEffectTypes) {
      for (const property of category.properties) {
        if (property.key === key) {
          return property
        }
      }
    }
    return null
  }
}
