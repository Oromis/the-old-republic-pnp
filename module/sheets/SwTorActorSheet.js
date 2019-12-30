import ObjectUtils from '../util/ObjectUtils.js'
import AutoSubmitSheet from './AutoSubmitSheet.js'
import { calcPropertyBaseValue, calcUpgradeCost } from '../CharacterFormulas.js'
import DamageTypes from '../DamageTypes.js'
import ArrayUtils from '../util/ArrayUtils.js'

function calcGainChange(actor, property, { action, defaultXpCategory }) {
  const prevXp = property.xp || 0
  const gainLog = property.gained || []
  let newGainLog, newXp
  if (action === '+') {
    const xpCategory = property.currentXpCategory || property.xpCategory || defaultXpCategory
    const xpCost = calcUpgradeCost(actor, property)
    newXp = prevXp + xpCost
    newGainLog = [...gainLog, { xpCategory, xp: xpCost }]
  } else {
    const baseVal = calcPropertyBaseValue(actor, property)
    newGainLog = gainLog.slice(0, gainLog.length - 1)
    const removed = gainLog[gainLog.length - 1]
    const xpCost = removed.xp || actor.dataSet.xpTable.getUpgradeCost({
      category: removed.xpCategory,
      from: baseVal + newGainLog.length,
      to: baseVal + gainLog.length
    })
    newXp = prevXp - xpCost
  }
  return { xp: newXp, gainLog: newGainLog }
}

function processDeltaValue(text, oldValue) {
  const matches = /\s*([+\-*/])\s*([+\-]?[\d.]+)/.exec(text)
  if (matches) {
    switch (matches[1]) {
      case '+':
        return (+oldValue) + (+matches[2])
      case '-':
        return (+oldValue) - (+matches[2])
      case '*':
        return (+oldValue) * (+matches[2])
      case '/':
        return (+oldValue) / (+matches[2])
    }
  }

  if (!isNaN(text)) {
    // Input is just a number => use it directly
    return +text
  }

  // If we get here then the format is invalid
  ui.notifications.error(`Ungültiger Wert: ${text}. Formate: <Number>, +<Number>, -<Number>, *<Number>, /<Number>`)
  return oldValue
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export default class SwTorActorSheet extends ActorSheet {
  constructor(...args) {
    super(...args)

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "attributes"
    this._inventoryHidden = {}
    this._damageIncoming = {
      type: DamageTypes.default,
      amount: 0,
    }

    const autoSubmit = new AutoSubmitSheet(this)

    autoSubmit.addFilter('data.attributes.*.gp', this._processDeltaProperty)
    autoSubmit.addFilter('data.attributes.*.buff', this._processDeltaProperty)
    autoSubmit.addFilter('data.metrics.*.value', this._processDeltaProperty)
    autoSubmit.addFilter('data.metrics.*.buff', this._processDeltaProperty)
    autoSubmit.addFilter('data.combat.enemyDistance', this._processDeltaProperty)

    autoSubmit.addFilter('skills.*', (obj, { name, path }) => {
      const [_unused, key, ...rest] = path
      const skill = this.actor.skills[key]
      if (skill != null) {
        let value = obj[name]
        if (path.indexOf('buff') !== -1) {
          value = processDeltaValue(value, skill.buff || 0)
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

    autoSubmit.addFilter('items.*', (obj, { name, path }) => {
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

    autoSubmit.addFilter('input.totalXp', (obj, { name }) => {
      const newVal = Math.round(processDeltaValue(obj[name], this.actor.xp.total))
      return {
        'data.xp.gained': newVal - this.actor.xpFromGp
      }
    })

    autoSubmit.addFilter('input.damageIncoming.*', (obj, { name, path }) => {
      this._damageIncoming[path[path.length - 1]] = obj[name]
      this.render(false)
      return {}
    })
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["sw-tor", "sheet", "actor"],
  	  template: "systems/sw-tor/templates/actor-sheet.html",
      submitOnUnfocus: true,
      width: 754,
      height: 600
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()

    const computedActorData = this.actor

    const skills = [...this.actor.skills.list]
    const forceSkills = this.actor.forceSkills.list
    data.computed = {
      skillCategories: [
        ...this.actor.dataSet.skillCategories.list.map(cat => ({
          label: cat.label,
          skills: ArrayUtils.removeBy(skills, skill => skill.category === cat.key),
        })),
        { label: 'Mächte', skills: ArrayUtils.removeBy(skills, skill => skill.isForceSkill) },
        { label: 'Sonstige', skills },
      ],
      forceSkills: forceSkills.length > 0 ? forceSkills : null,
      slots: this.actor.dataSet.slots.layout.map(row => row.map(slot => {
        if (slot == null) {
          return null
        } else {
          const equippedItem = this.actor.equippedItems.find(item => item.isEquippedInSlot(slot.key))
          return {
            ...slot,
            item: equippedItem,
            options: [
              { id: null, name: '<Leer>', active: equippedItem == null },
              ...(equippedItem != null ? [{ id: equippedItem.id, name: equippedItem.name, active: true }] : []),
              ...computedActorData.freeItems.filter(item => Array.isArray(item.slotTypes) && item.slotTypes.indexOf(slot.type) !== -1)
            ]
          }
        }
      })),
      inventory: this.actor.dataSet.itemTypes.list.map(type => ({
        ...type,
        items: this.actor.inventory.filter(item => item.type === type.key)
      })),
    }

    const incomingDamageType = DamageTypes.map[this._damageIncoming.type] || DamageTypes.map[DamageTypes.default]
    const incomingDamageAmount = this._damageIncoming.amount
    const incomingDamage = this.actor.calcIncomingDamage({ type: incomingDamageType, amount: incomingDamageAmount })
    data.ui = {
      inventoryHidden: this._inventoryHidden,
      damageIncoming: {
        type: incomingDamageType,
        amount: incomingDamageAmount,
        resistances: incomingDamage.resistances,
        cost: incomingDamage.costs,
      },
    }
    data.actor = this.actor
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.gp-to-xp').click(this._onGpToXp)
    html.find('.xp-to-gp').click(this._onXpToGp)
    html.find('button.change-attr-gained').click(this._onChangeAttrGained)
    html.find('button.change-skill-gained').click(this._onChangeSkillGained)
    html.find('button.change-metric-gained').click(this._onChangeMetricGained)
    html.find('.do-roll').click(this._onDoRoll)
    html.find('.roll-check').click(this._onRollCheck)
    html.find('.item-create').click(this._onCreateItem)

    // Update Item (or skill)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]")
      const item = this.actor.getOwnedItem(li.data("itemId"))
      item.sheet.render(true)
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]")
      const id = li.data("itemId")
      const item = this.actor.getOwnedItem(id)
      if (item != null) {
        if (confirm(`Willst du das Item "${item.name}" wirklich löschen?`)) {
          this.actor.deleteOwnedItem(id)
          li.slideUp(200, () => this.render(false))
        }
      }
    })

    html.find('.toggle-inventory-view').click(event => {
      const category = event.currentTarget.getAttribute('data-category')
      this._inventoryHidden[category] = !this._inventoryHidden[category]
      this.actor.render()
    })

    html.find('.modify-metrics').click(this._onModifyMetrics)
    html.find('.equip-btn').click(this._onChangeEquipment)
  }

  /* -------------------------------------------- */

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

  _onModifyMetrics = event => {
    const target = event.currentTarget
    let diff, factor = 1
    const raw = target.getAttribute('data-deduct')
    if (raw != null) {
      diff = this.actor.calculateMetricsCosts(JSON.parse(raw))
    } else {
      diff = JSON.parse(target.getAttribute('data-add'))
    }

    return this.actor.modifyMetrics(diff)
  }

  _onChangeEquipment = async event => {
    const slotKey = event.currentTarget.getAttribute('data-slot')
    const rawItemId = event.currentTarget.getAttribute('data-item')
    try {
      return await this.actor.equipItem(slotKey, isNaN(rawItemId) ? null : this.actor.getOwnedItem(+rawItemId))
    } catch (e) {
      ui.notifications.error(e.message)
      return Promise.reject(e)
    }
  }

  _onGpToXp = () => {
    if (this.actor.gp.value > 0) {
      this.actor.update({ 'data.xp.gp': (this.actor.xp.gp || 0) + 1 })
    }
  }

  _onXpToGp = () => {
    const gp = this.actor.xp.gp
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': gp - 1 })
    }
  }

  _onChangeAttrGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-attr')
    const defaultXpCategory = this.actor.dataSet.attributes.map[key].xpCategory
    const attribute = this.actor.attributes[key]

    const { xp, gainLog } = calcGainChange(this.actor, attribute, { action, defaultXpCategory })
    this.actor.update({
      [`data.attributes.${key}.gained`]: gainLog,
      [`data.attributes.${key}.xp`]: xp,
      [`data.attributes.${key}.xpCategory`]: defaultXpCategory,  // Reset XP category after every change
    })
  }

  _onChangeSkillGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-skill')
    const skill = this.actor.skills[key]

    const { gainLog } = calcGainChange(this.actor, skill, { action })

    skill.update({
      'data.gained': gainLog,
      'data.tmpXpCategory': skill.xpCategory, // Reset after every skill point
    })
  }

  _onChangeMetricGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-metric')
    const defaultXpCategory = this.actor.dataSet.metrics.map[key].xpCategory
    const metric = this.actor.metrics[key]

    const { xp, gainLog } = calcGainChange(this.actor, metric, { action, defaultXpCategory })
    this.actor.update({
      [`data.metrics.${key}.gained`]: gainLog,
      [`data.metrics.${key}.xp`]: xp,
      [`data.metrics.${key}.xpCategory`]: defaultXpCategory,  // Reset XP category after every change
    })
  }

  _onDoRoll = event => {
    const formula = event.currentTarget.getAttribute('data-formula').replace(/(\d+)w(\d+)/g, '$1d$2')
    new Roll(formula).toMessage({
      speaker: { actor: this.actor.id },
      flavor: event.currentTarget.getAttribute('data-label')
    })
  }

  _onRollCheck = async event => {
    const check = JSON.parse(event.currentTarget.getAttribute('data-check'))
    const flavor = event.currentTarget.getAttribute('data-label') || undefined
    const die = new Die(20)
    die.roll(check.rolls.length)

    const payload = {
      rolls: check.rolls.map((roll, i) => {
        const target = Math.floor(roll.value / 5)
        return { ...roll, die: die.results[i], target, diff: target + (roll.advantage || 0) - die.results[i] }
      }),
    }
    if (check.AgP) {
      payload.AgP = {
        value: check.AgP,
        diff: check.AgP - payload.rolls.reduce((acc, cur) => acc + (cur.diff < 0 ? -cur.diff : 0), 0)
      }
    }
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rollMode: game.settings.get("core", "rollMode"),
      flavor,
      speaker: { actor: this.actor.id },
      sound: CONFIG.sounds.dice,
      content: await renderTemplate('systems/sw-tor/templates/check-roll.html', payload)
    }

    ChatMessage.create(chatData)
  }

  _processDeltaProperty = (formData, { name }) => {
    const input = formData[name]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...name.split('.'))
      formData[name] = Math.round(processDeltaValue(input, old))
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject() {
    // Disable regular form submissions (we use AutoSubmitForm)
    return Promise.resolve()
  }
}
