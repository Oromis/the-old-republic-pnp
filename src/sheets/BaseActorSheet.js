import AutoSubmitSheet from './AutoSubmitSheet.js'
import ObjectUtils from '../util/ObjectUtils.js'
import Shortcuts, {CTRL} from '../shortcuts/Shortcuts.js'
import RollUtils from '../util/RollUtils.js'
import {processDeltaValue} from '../util/SheetUtils.js'

export default class BaseActorSheet extends ActorSheet {
  constructor(...args) {
    super(...args)

    this._inventoryHidden = {}

    if (this.isEditable) {
      this.autoSubmit = new AutoSubmitSheet(this)

      this.autoSubmit.addFilter('data.metrics.*.value', this._processDeltaProperty)
      this.autoSubmit.addFilter('data.metrics.*.buff', this._processDeltaProperty)
      this.autoSubmit.addFilter('data.combat.enemyDistance', this._processDeltaProperty)

      this.autoSubmit.addFilter('skills.*', (obj, { name, path }) => {
        const [_unused, key, ...rest] = path
        const skill = this.actor.skills[key]
        if (skill != null) {
          let value = obj[name]
          if (path.indexOf('buff') !== -1) {
            value = processDeltaValue(value, skill.buff || 0)
          } else if (path.indexOf('fixed') !== -1) {
            value = processDeltaValue(value, skill.fixed || 0)
          } else if (path.indexOf('vars') !== -1) {
            value = value === '' || isNaN(value) ? '' : +value
          }
          const payload = { [rest.join('.')]: value }
          const oldValue = ObjectUtils.try(skill.data, ...rest)
          if (value !== oldValue) {
            skill.update(payload)
          }
        }
        // No actor update
        return {}
      })

      this.autoSubmit.addFilter('items.*', (obj, { name, path }) => {
        const [_unused, id, ...rest] = path
        const item = this.actor.getOwnedItem(id)
        if (item != null) {
          const value = obj[name]
          const payload = { [rest.join('.')]: value }
          const oldValue = ObjectUtils.try(item.data, ...rest)
          if (value !== oldValue) {
            item.update(payload)
          }
        }
        // No actor update
        return {}
      })
    }
  }

  activateListeners(html) {
    super.activateListeners(html)

    const element = $(this.element)
    if (element.length > 0 && !element.attr('tabindex')) {
      element.attr('tabindex', '0')
      Shortcuts.create(element[0])
        .add(CTRL, '<', () => this._clearActorCache())
    }

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.equip-btn').click(this._onChangeEquipment)
    html.find('.do-roll').click(this._onDoRoll)
    html.find('.roll-check').click(this._onRollCheck)
    html.find('.clear-cache').click(this._clearActorCache)
    html.find('.modify-metrics').click(this._onModifyMetrics)
    html.find('.run-actor-action').click(this._onRunActorAction)
    html.find('.item-create').click(this._onCreateItem)
    html.find('.item-edit').click(this._onEditItem)
    html.find('.item-delete').click(this._onDeleteItem)
    html.find('.add-missing-skills').click(this._onAddMissingSkills)
    html.find('.toggle-inventory-view').click(this._toggleInventoryView)
  }

  // ---------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------

  _onCreateItem = event => {
    event.preventDefault()
    const type = event.currentTarget.getAttribute('data-type')
    const itemData = {
      name: `Neuer Gegenstand`,
      type,
      data: {}
    }
    return this.actor.createOwnedItem(itemData);
  }

  _onEditItem = ev => {
    const li = $(ev.currentTarget).parents("[data-item-id]")
    const item = this.actor.getOwnedItem(li.data("itemId"))
    item.sheet.render(true)
  }

  _onDeleteItem = ev => {
    const li = $(ev.currentTarget).parents("[data-item-id]")
    const id = li.data("itemId")
    const item = this.actor.getOwnedItem(id)
    if (item != null) {
      if (confirm(`Willst du das Item "${item.name}" wirklich löschen?`)) {
        this.actor.deleteOwnedItem(id)
        this.render(false)
      }
    }
  }

  _onChangeEquipment = async event => {
    const slotKey = event.currentTarget.getAttribute('data-slot')
    const rawItemId = event.currentTarget.getAttribute('data-item')
    try {
      return await this.actor.equipItem(slotKey, this.actor.getOwnedItem(rawItemId) || null)
    } catch (e) {
      ui.notifications.error(e.message)
      return Promise.reject(e)
    }
  }

  _onModifyMetrics = event => {
    const target = event.currentTarget
    let diff
    const raw = target.getAttribute('data-deduct')
    if (raw != null) {
      diff = this.actor.calculateMetricsCosts(JSON.parse(raw))
    } else {
      diff = JSON.parse(target.getAttribute('data-add'))
    }

    return this.actor.modifyMetrics(diff)
  }

  _onDoRoll = event => {
    const formula = ObjectUtils.try(this.actor, ...event.currentTarget.getAttribute('data-formula').split('.'))
    RollUtils.rollFormula(formula, {
      actor: this.actor.id,
      label: event.currentTarget.getAttribute('data-label') || undefined
    })
  }

  _onRollCheck = async event => {
    let check
    const path = event.currentTarget.getAttribute('data-path')
    if (path != null) {
      check = ObjectUtils.try(this.actor, ...path.split('.'))
    } else {
      check = JSON.parse(event.currentTarget.getAttribute('data-check'))
    }
    if (check == null) {
      throw new Error(`Check invalid. Path: ${path}`)
    }
    const label = event.currentTarget.getAttribute('data-label') || undefined

    await RollUtils.rollCheck(check, { actor: this.actor.id, label })
  }

  _onRunActorAction = event => {
    const actionPath = event.currentTarget.getAttribute('data-action')
    const parentPath = actionPath.split('.')
    const funcPath = parentPath.pop()
    const parent = ObjectUtils.try(this.actor, ...parentPath)
    const func = ObjectUtils.try(parent, funcPath)
    if (typeof func === 'function') {
      return func.call(parent)
    }
  }

  _onAddMissingSkills = async () => {
    for (const skill of this.actor.missingSkills) {
      await this.actor.createOwnedItem(skill.data)
    }
  }

  _clearActorCache = () => {
    this.actor.clearCache()
    this.actor.render(false)
  }

  _toggleInventoryView = event => {
    const category = event.currentTarget.getAttribute('data-category')
    this._inventoryHidden[category] = !this._inventoryHidden[category]
    this.actor.render()
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------

  _processDeltaProperty = (formData, { name }) => {
    const input = formData[name]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...name.split('.'))
      formData[name] = Math.round(processDeltaValue(input, old))
    }
  }

  _formatSlot(slot) {
    const equippedItem = this.actor.equippedItems.find(item => item.isEquippedInSlot(slot.key))
    return {
      key: slot.key,
      ...slot.staticData,
      item: equippedItem,
      options: [
        { id: null, name: '<Leer>', active: equippedItem == null },
        ...(equippedItem != null ? [{ id: equippedItem.id, name: equippedItem.name, active: true }] : []),
        ...this.actor.freeItems.filter(item => Array.isArray(item.slotTypes) && item.slotTypes.indexOf(slot.type) !== -1)
      ]
    }
  }

  _updateObject() {
    // Disable regular form submissions (we use AutoSubmitForm)
    return Promise.resolve()
  }
}
