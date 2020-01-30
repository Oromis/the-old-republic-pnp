import _ from 'lodash'

import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { roundDecimal } from '../util/MathUtils.js'
import { defineGetter } from '../util/EntityUtils.js'
import { measureDistance } from '../overrides/DistanceMeasurement.js'
import { keyMissing } from '../util/ProxyUtils.js'
import Modifier, { STAGE_PERMANENT, STAGE_TEMPORARY } from '../util/Modifier.js'
import ActorTypes from '../datasets/ActorTypes.js'
import TokenUtils from '../util/TokenUtils.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    if (!this._swTorInitialized) {
      this._callDelegate('beforeConstruct')
      this._swTorInitialized = true
    }
    this._callDelegate('afterConstruct')
  }

  prepareData(actorData) {
    if (!this._swTorInitialized) {
      this._callDelegate('beforeConstruct')
      this._swTorInitialized = true
    }

    actorData = super.prepareData(actorData) || this.data
    const data = actorData.data

    this._callDelegate('beforePrepareData', actorData)

    // Make sure that all attributes exist and that their values are up to date
    this._updateCollection(data, 'attributes')
    this._updateCollection(data, 'metrics')
    this._updateCollection(data, 'resistances')

    this._callDelegate('afterPrepareData', actorData)

    return actorData
  }

  // ---------------------------------------------------------------------
  // Update hooks
  // ---------------------------------------------------------------------

  _onUpdate(...args) {
    this._cache.clear()
    this._callDelegate('onUpdate', ...args)
    return super._onUpdate(...args)
  }

  _onModifyEmbeddedEntity(...args) {
    this._cache.clear()
    return super._onModifyEmbeddedEntity(...args)
  }

  prepareEmbeddedEntities(...args) {
    // prepareEmbeddedEntities() re-generates the array of owned items. Reset the cache in this case.
    const res = super.prepareEmbeddedEntities(...args)
    this._cache && this._cache.clear()
    return res
  }

  render(force, context, ...rest) {
    if (context != null) {
      if (['createOwnedItem', 'updateOwnedItem', 'updateManyOwnedItem', 'deleteOwnedItem'].indexOf(context.renderContext) !== -1) {
        this.prepareEmbeddedEntities()
        this.prepareData({})
      }
    } else if (this.isToken) {
      this.prepareEmbeddedEntities()
      this.prepareData({})
    }
    return super.render(force, context, ...rest)
  }

  get attributes() {
    return this._getPropertyCollectionProxy('attributes')
  }

  attrValue(key, { prop = 'value' } = {}) {
    return ObjectUtils.try(this.attributes[key], prop, 'total', { default: 0 })
  }

  get metrics() {
    return this._getPropertyCollectionProxy('metrics')
  }

  get resistances() {
    return this._getPropertyCollectionProxy('resistances')
  }

  get propertyValues() {
    return new Proxy(this, {
      get(actor, key) {
        if (key === 'actor') {
          return actor
        }
        const sources = [
          actor.attributes,
          actor.skills,
          actor.metrics,
          actor.resistances,
        ]
        for (const source of sources) {
          // Not exactly the most efficient way to do this...
          const prop = source.list.find(i => i.key === key)
          if (prop != null) {
            return ObjectUtils.try(prop, 'value', 'total') || prop.max
          }
        }
        return 0
      }
    })
  }

  // ---------------------------------------------------------------------
  // Item accessors
  // ---------------------------------------------------------------------

  get skills() {
    return this._getItemCollectionProxy(this._categorizedItems.skills)
  }

  skillValue(key) {
    return ObjectUtils.try(this.skills[key], 'value', 'total', { default: 0 })
  }

  get forceSkills() {
    return this._getItemCollectionProxy(this._categorizedItems.forceSkills)
  }

  get trainings() {
    return this._categorizedItems.trainings
  }

  get innateAbilities() {
    return this._categorizedItems.innateAbilities
  }

  get specialAbilities() {
    return this._categorizedItems.specialAbilities
  }

  get inventory() {
    return this._categorizedItems.inventory
  }

  get freeItems() {
    return this._categorizedItems.freeItems
  }

  get equippedItems() {
    return this._categorizedItems.equippedItems
  }

  get activeEffects() {
    return this._categorizedItems.activeEffects
  }

  get dataSet() {
    return this._cache.lookup('dataSet', () => DataSets.fromActorType(this.data.type))
  }

  get modifiers() {
    return this._cache.lookup('modifiers', () => {
      return new Proxy(this._calcModifiers(), {
        get: keyMissing((_, key) => new Modifier(key))
      })
    })
  }

  get weight() {
    return this._cache.lookup('weight', () => {
      const result = {}
      defineGetter(result, 'value', () => this._cache.lookup('inventoryWeight', () => (
        roundDecimal(this.inventory.reduce((acc, cur) => acc + (cur.quantity || 1) * (cur.weight || 0), 0), 2)
      )))
      defineGetter(result, 'max', () => this._cache.lookup('inventoryWeightMax', () => this._getMaxInventoryWeight()))
      defineGetter(result, 'isOverloaded', () => this._cache.lookup('inventoryOverloaded', () => (
        this.weight.value > this.weight.max
      )))
      return result
    })
  }

  async equipItem(slotKey, item) {
    const targetSlot = this.dataSet.slots.map[slotKey]
    if (targetSlot == null) {
      throw new Error(`Ungültiger Slot: ${slotKey}`)
    }
    const itemUpdates = []

    if (item != null && !item.isEquippedInSlot(slotKey)) {
      // Equip Item in slot
      const prevItemSlots = item.slots || []
      const itemSlotTypes = [...item.slotTypes]

      // Remove any previous item in the slot
      const removedItems = []
      const oldItem = this.getItemInSlot(slotKey)
      if (oldItem != null) {
        removedItems.push(oldItem.id)
        // Unequip item
        itemUpdates.push({ _id: oldItem._id, 'data.slots': [] })
      }

      // Find an item that will be in a slot after the current equipItem() execution has finished
      const localGetItemInSlot = (slotKey) => {
        const item = this.getItemInSlot(slotKey)
        if (item == null) {
          return item
        } else {
          return removedItems.indexOf(item.id) !== -1 ? null : item
        }
      }

      // Add item to the slot we've assigned it to
      const newItemSlots = [slotKey]
      {
        // Remove the assigned slot from the list of slot types we need to take care of
        const index = itemSlotTypes.indexOf(targetSlot.type)
        if (index === -1) {
          throw new Error(`Item doesn't fit into the given slot (${slotKey} is not in [${itemSlotTypes.join(', ')}])`)
        } else {
          itemSlotTypes.splice(index, 1)
        }
      }
      // A list of slots that are not fill by our item
      const slotList = this.dataSet.slots.list.filter(slot => slot.key !== slotKey)

      // Now: For each slot type we need to fill we'll find a corresponding slot to put the item into,
      // remove any previous items in that slot and add our new item
      for (const itemSlotType of itemSlotTypes) {
        let handled = false
        // See if our item is in one of these slots already
        for (const prevItemSlot of prevItemSlots) {
          const slot = this.dataSet.slots.map[prevItemSlot]
          if (slot.type === itemSlotType) {
            // Yes, this item is in a matching slot already. Nothing to do.
            handled = true
            break
          }
        }

        if (!handled) {
          // Find a slot to put this item into. Prefer empty slots.
          let slot = slotList.find(slot => slot.type === itemSlotType && localGetItemInSlot(slot.key) == null)
          if (slot == null) {
            // No empty slot of the given type => find a filled slot and remove its item
            slot = slotList.find(slot => slot.type === itemSlotType)
          }
          if (slot != null) {
            const prevItem = localGetItemInSlot(slot.key)
            if (prevItem != null) {
              // Remove the previous item
              removedItems.push(prevItem.id)
              itemUpdates.push({ _id: prevItem._id, 'data.slots': [] })
            }
            // Make sure that no slot is assigned to twice
            slotList.splice(slotList.indexOf(slot), 1)

            // Add the new item to the slot
            newItemSlots.push(slot.key)
          } else {
            // There's absolutely no slot that can be used.
            throw new Error(`Kann ${item.name} nicht ausrüsten: Kein freier Slot vom Typ ${itemSlotType}`)
          }
        }
      }

      itemUpdates.push({ _id: item._id, 'data.slots': newItemSlots })
    } else if (item == null) {
      // Set the slot to empty
      const oldItem = this.getItemInSlot(slotKey)
      if (oldItem != null) {
        itemUpdates.push({ _id: oldItem._id, 'data.slots': [] })
      }
    }

    return this.updateManyEmbeddedEntities('OwnedItem', itemUpdates)
  }

  getItemInSlot(slotKey) {
    return this.equippedItems.find(item => item.isEquippedInSlot(slotKey))
  }

  get equippedWeapons() {
    return this._cache.lookup('equippedWeapons', () => {
      const weapons = []
      this.dataSet.slots.list.filter(slot => slot.supportsWeapon).forEach(slot => {
        let item = this.getItemInSlot(slot.key)
        if (item == null) {
          item = this._getEmptySlotWeapon(slot.key)
        }
        if (item != null) {
          if (item.id == null || !weapons.some(weapon => weapon.id === item.id)) {
            weapons.push(item)
          }
        }
      })
      return weapons
    })
  }

  get targetDistance() {
    if (ObjectUtils.try(this.data.data.targetDistance, 'type') === 'auto') {
      const token = this.token || this.getActiveTokens()[0]
      const targets = Array.from(game.user.targets)
      if (token != null && targets.length > 0) {
        return roundDecimal(measureDistance(token, targets[0]), 2)
      }
    }

    // Automatic distance is not available or enabled => use the user-defined distance
    return ObjectUtils.try(this.data.data.targetDistance, 'value')
  }

  get usesAutomaticTargetDistance() {
    return ObjectUtils.try(this.data.data.targetDistance, 'type') === 'auto'
  }

  calcIncomingDamage({ type, amount }) {
    let incomingDamage = amount
    const damageType = type
    let resistances = []
    let costs = null
    if (damageType != null) {
      costs = {}
      for (const res of this.resistances.list.filter(rt => rt.canResist(damageType))) {
        const result = res.full
        const { damage, cost } = res.resist(incomingDamage, damageType)
        result.damageBefore = incomingDamage
        result.damageReduction = incomingDamage - damage
        result.damageAfter = damage
        incomingDamage = damage

        if (cost != null && typeof cost === 'object') {
          for (const [metricKey, amount] of Object.entries(cost)) {
            if (amount !== 0) {
              costs[metricKey] = (costs[metricKey] || 0) + amount
            }
          }
        }

        resistances.push(result)
      }

      // Resistances have reduced the incoming damage, the rest will be deducted from the targets
      const targets = damageType.targets || [{ key: 'LeP' }]
      for (const target of targets) {
        const factor = target.factor || 1
        costs[target.key] = (costs[target.key] || 0) + (incomingDamage * factor)
      }
    }
    return { resistances, costs }
  }

  get regenerationTypes() {
    return this._cache.lookup('regenerationTypes', () => [
      this.getRegeneration('turn', { label: 'Nächste Runde', className: 'next-turn', icon: 'fa-redo' }),
      this.getRegeneration('day', { label: 'Nächster Tag', className: 'next-day', icon: 'fa-sun' }),
    ])
  }

  getRegeneration(key, data) {
    let diff = this.metrics.list.reduce((result, metric) => {
      result[metric.key] = metric.getRegeneration(key)
      return result
    }, {})
    const factor = ObjectUtils.try(this.data.data.regeneration, key, 'factor', { default: 1 })
    diff = ObjectUtils.omitZero(ObjectUtils.mapValues(diff, (val, mk) => {
      let delta = Math.floor(val * factor)
      const newVal = this.metrics[mk].getModifiedValue(delta)
      delta = newVal - this.metrics[mk].value
      return Math.min(delta, this.metrics[mk].missing)
    }))
    return { key, ...data, diff, factor }
  }

  /**
   * Given a cost object of the form { <metric-key>: <cost|number> }, calculates an object containing the actual
   * values being deducted from the actor's metrics if they need to be paid at the current point in time.
   * Doesn't actually pay these costs, it just computes the effect it would have on the actor.
   * @param costs {object} The costs object
   * @returns {object} A diff of the actor's metrics
   */
  calculateMetricsCosts(costs) {
    const result = {}
    for (const key of Object.keys(costs)) {
      const metric = this.metrics[key]
      if (metric != null) {
        const costOptions = metric.costOptions
        let costAmount = costs[key]
        for (let i = 0; i < costOptions.length; ++i) {
          let costOption = costOptions[i]
          if (typeof costOption === 'string') {
            costOption = { key: costOption, factor: 1 }
          }
          const costKey = costOption.key

          const previouslyDeducted = -(result[costKey] || 0)
          const available = this.metrics[costKey].value - previouslyDeducted
          let toDeduct = costAmount * costOption.factor

          if (available < toDeduct && i < costOptions.length - 1) {
            // Costs can be paid via a different metric
            toDeduct = available
          }

          costAmount -= Math.round(toDeduct / costOption.factor)
          if (toDeduct > 0) {
            result[costKey] = -(previouslyDeducted + toDeduct)
          }

          if (costAmount === 0) {
            break
          }
        }
      }
    }
    return result
  }

  /**
   * Changes the actor's metrics' values by the diff provided.
   */
  modifyMetrics(diff, { dryRun = false } = {}) {
    const metrics = {}
    for (const [key, delta] of Object.entries(diff)) {
      if (this.metrics[key] != null && typeof this.metrics[key].value === 'number') {
        metrics[key] = { value: this.metrics[key].value + delta }
      }
    }

    const payload = { data: { metrics } }
    if (dryRun) {
      return payload
    } else {
      return this.update(payload)
    }
  }

  async enterTurn({ round, combat }) {
    // Apply turn regeneration
    const diff = this.getRegeneration('turn').diff
    await this._emitActiveEffectEvent('onTurnStart', this.activeEffects, { metricsChanges: diff })
    const payload = this.modifyMetrics(diff, { dryRun: true })
    payload.data.lastTurnRegeneration = diff
    this._callDelegate('enterTurn', payload)
    return this.update(payload)
  }

  async undoEnterTurn({ round, combat }) {
    // Undo the last turn regeneration
    const reg = this.data.data.lastTurnRegeneration
    if (reg != null && typeof reg === 'object') {
      const diff = ObjectUtils.mapValues(reg, a => -a)
      await this._emitActiveEffectEvent('onTurnStart', this.activeEffects, { undo: true, metricsChanges: diff })
      const payload = this.modifyMetrics(diff, { dryRun: true })
      payload.data['-=lastTurnRegeneration'] = null
      this._callDelegate('undoEnterTurn', payload)
      return this.update(payload)
    }
  }

  async exitTurn() {
    return this._emitActiveEffectEvent('onTurnEnd', this.activeEffects)
  }

  async undoExitTurn() {
    return this._emitActiveEffectEvent('onTurnEnd', this.activeEffects, { undo: true })
  }

  /// Notifies the actor that the next turn (of any combatant) in the current combat has started
  async nextTurn() {
    return this._emitActiveEffectEvent('onNextTurn', this.activeEffects)
  }

  async undoNextTurn() {
    return this._emitActiveEffectEvent('onNextTurn', this.activeEffects, { undo: true })
  }

  get missingSkills() {
    return this._cache.lookup('missingSkills', () => game.items.entities.filter(item => {
      if (item.isSkill && item.actorType === this.actorType) {
        // Potential match
        if (this.skills[item.key] != null) {
          // We already have this skill => not missing
          return false
        } else {
          if (item.isBasicSkill) {
            // Yes, we're lacking this basic skill
            return true
          } else {
            // Check if this skill was acquired through some kind of bonus
            return this.modifiers[item.key].explainXp().activationPaid
          }
        }
      } else {
        // Different actor type or no skill => no match
        return false
      }
    }))
  }

  get actorType() {
    return ActorTypes.map[this.data.type] || ActorTypes.map[ActorTypes.default]
  }

  clearCache() {
    this._cache.clear()
  }

  syncItems({ types = null } = {}) {
    const updateData = []
    for (const item of this.items) {
      if (types == null || types.includes(item.type)) {
        const globalItem = game.items.entities.find(i => item.type === i.type && (item.key != null ? item.key === i.key : item.name === i.name))
        if (globalItem && Object.keys(diffObject(item.data.data, globalItem.data.data)).length > 0) {
          updateData.push({ _id: item._id, data: _.merge({}, item.data.data, globalItem.data.data) })
          // console.log(`Would update item ${item.type} / ${item.name}`, item.data.data, globalItem.data.data,
          //   diffObject(item.data.data, updateData[updateData.length - 1].data))
        }
      }
    }

    if (updateData.length > 0) {
      return this.updateManyEmbeddedEntities('OwnedItem', updateData)
    }
  }

  // ---------------------------------------------------------------------
  // Private stuff
  // ---------------------------------------------------------------------

  get _cache() {
    if (this._cacheStore == null) {
      this._cacheStore = new DataCache()
    }
    return this._cacheStore
  }

  get _categorizedItems() {
    return this._cache.lookup('categorizedItems', () => {
      // Re-calculate cached lists
      const categories = {
        skills: [],
        forceSkills: [],
        trainings: [],
        innateAbilities: [],
        specialAbilities: [],
        inventory: [],
        freeItems: [],
        equippedItems: [],
        activeEffects: [],
      }
      for (const item of this.items || []) {
        if (item.type === 'skill' || item.type === 'force-skill') {
          categories.skills.push(item)
          if (item.type === 'force-skill') {
            categories.forceSkills.push(item)
          }
        } else if(item.type === 'training') {
          categories.trainings.push(item)
        } else if (item.type === 'innate-ability') {
          categories.innateAbilities.push(item)
        } else if (item.type === 'special-ability') {
          categories.specialAbilities.push(item)
        } else if (item.type === 'active-effect') {
          categories.activeEffects.push(item)
        } else {
          categories.inventory.push(item)
          if (item.isEquipped) {
            categories.equippedItems.push(item)
          } else {
            categories.freeItems.push(item)
          }
        }
      }
      return categories
    })
  }

  _callDelegate(callbackName, ...args) {
    const delegate = this.dataSet.delegate
    if (typeof delegate[callbackName] === 'function') {
      return delegate[callbackName].apply(this, args)
    }
  }

  _getItemCollectionProxy(items) {
    return new Proxy(items, {
      get(list, prop) {
        if (prop === 'list') {
          return list
        } else {
          // Map-based access
          return list.find(item => item.key === prop)
        }
      }
    })
  }

  _getPropertyCollectionProxy(key) {
    return new Proxy(this, {
      get(actor, prop) {
        // Cache?
        if (prop === 'list') {
          // Array-based access
          return actor.dataSet[key].list.map(a => a.instantiate(actor, actor.data.data[key][a.key]))
        } else {
          // Map-based access
          const prototype = actor.dataSet[key].map[prop]
          if (prototype != null) {
            return prototype.instantiate(actor, actor.data.data[key][prop])
          } else {
            throw new Error(`Unknown attribute key: ${prop}`)
          }
        }
      },
      has(obj, prop) {
        return prop === 'list' || prop in actor.dataSet[key].map
      },
    })
  }

  _updateCollection(data, key) {
    if (data[key] == null) {
      data[key] = {}
    }
    for (const thing of this.dataSet[key].list) {
      data[key][thing.key] = thing
        .instantiate(this, data[key][thing.key])
        .update()
        .db
    }
  }

  _getEmptySlotWeapon() {
    // The weapon that the actor uses if a weapon slot is empty. For humanoids, this would be something like a "fist".
    return null
  }

  _calcModifiers() {
    const result = {}

    /**
     * @param key {string}
     * @return {Modifier}
     */
    result.getModifier = function getModifier(key) {
      if (result[key] == null) {
        result[key] = new Modifier(key)
      }
      return result[key]
    }

    const sources = [
      { items: this.innateAbilities, stage: STAGE_PERMANENT },
      { items: this.specialAbilities, stage: STAGE_PERMANENT },
      { items: this.trainings, stage: STAGE_PERMANENT },
      { items: this.equippedItems, stage: STAGE_TEMPORARY },
      { items: this.activeEffects, stage: STAGE_TEMPORARY },
    ]

    for (const source of sources) {
      for (const item of source.items) {
        for (const effect of (Array.isArray(item.effects) ? item.effects : [])) {
          result.getModifier(effect.key).inject(effect.value, { label: item.name, stage: source.stage })
        }
      }
    }

    return result
  }

  _getMaxInventoryWeight() {
    // To be overridden by subclasses
    return 0
  }

  async _emitActiveEffectEvent(eventType, activeEffects, { undo = false, metricsChanges = null } = {}) {
    const submitMetricsChanges = metricsChanges == null
    if (metricsChanges == null) {
      metricsChanges = {}
    }
    const activeEffectChanges = []
    const deletedEffects = []
    for (const activeEffect of activeEffects) {
      const result = activeEffect.handleEvent(eventType, { undo })
      if (result.delete) {
        deletedEffects.push(activeEffect._id)
      }
      if (result.metricsChanges) {
        for (const [key, value] of Object.entries(result.metricsChanges)) {
          metricsChanges[key] = (metricsChanges[key] || 0) + value
        }
      }
      if (result.activeEffect) {
        activeEffectChanges.push(result.activeEffect)
      }
    }

    if (activeEffectChanges.length > 0) {
      await this.updateManyEmbeddedEntities('OwnedItem', activeEffectChanges)
    }
    if (deletedEffects.length > 0) {
      await this.deleteManyEmbeddedEntities('OwnedItem', deletedEffects)
    }
    if (submitMetricsChanges && Object.keys(metricsChanges).length > 0) {
      await this.modifyMetrics(metricsChanges)
    }
  }

  // ----------------------------------------------------------------------------
  // Install some item hooks to make sure that item invariants are kept
  // ----------------------------------------------------------------------------

  createEmbeddedEntity(embeddedName, data, ...rest) {
    return this._checkValidItem(data, async () => {
      const item = await super.createEmbeddedEntity(embeddedName, data, ...rest)
      if (data.type === 'active-effect') {
        let activeEffect = this.items.find(i => i._id === item._id)
        if (activeEffect == null) {
          // There's a foundry bug which will sometimes report the wrong ID for the created item
          // (it will actually return the actor's ID). This is a workaround for this case.
          activeEffect = this.items[this.items.length - 1]
          if (activeEffect != null && activeEffect.type !== 'active-effect') {
            // Sanity check failed
            activeEffect = null
          }
        }
        if (activeEffect != null && activeEffect.showOnToken) {
          await this._emitActiveEffectEvent('onInit', [activeEffect])
          if (activeEffect) {
            for (const token of this._linkedTokens) {
              await TokenUtils.addEffect(token, activeEffect.img)
            }
          }
        } else {
          ui.notifications.error(`Aktiver Effekt ${item._id} nicht gefunden!`)
        }
      }
      return item
    })
  }

  updateEmbeddedEntity(embeddedName, data, ...rest) {
    let item = this.getOwnedItem(data._id)
    if (item != null) {
      data = item._filterUpdateData(data)
    } else {
      console.warn(`Updating item that does not exist: `, data)
    }

    return this._checkValidItem(data, () => super.updateEmbeddedEntity(embeddedName, data, ...rest))
  }

  async deleteEmbeddedEntity(embeddedName, id, ...rest) {
    this._handleDeletedOwnedItem(id)
    return super.deleteEmbeddedEntity(embeddedName, id, ...rest)
  }

  async updateManyEmbeddedEntities(embeddedName, changes, ...rest) {
    if (this.isToken) {
      // There seems to be a FoundryVTT bug in 0.4.5 that prevents updateManyEmbeddedEntities from working for
      // token actors ...
      for (const change of changes) {
        await this.updateEmbeddedEntity(embeddedName, change, ...rest)
      }
    } else {
      return super.updateManyEmbeddedEntities(embeddedName, changes, ...rest)
    }
  }

  async deleteManyEmbeddedEntities(embeddedName, ids, ...rest) {
    await Promise.all(ids.map(id => this._handleDeletedOwnedItem(id)))
    return super.deleteManyEmbeddedEntities(embeddedName, ids, ...rest)
  }

  async _handleDeletedOwnedItem(id) {
    const activeEffect = this.items.find(i => i._id === id)
    if (activeEffect != null && activeEffect.type === 'active-effect' && activeEffect.showOnToken) {
      for (const token of this._linkedTokens) {
        await TokenUtils.removeEffect(token, activeEffect.img)
      }
    }
  }

  _checkValidItem(data, cb) {
    // Check if actor type matches
    if (data.data) {
      // data.data can be absent if we're updating something outside the data object, like the name.
      // Don't do anything in this case as it's never harmful.
      const newActorType = data.data.actorType
      if (newActorType != null && ActorTypes.map[newActorType] !== this.actorType) {
        const msg = `Bad actor type: ${newActorType}`
        return Promise.reject(msg)
      }

      // Check that there are no duplicate keys
      const newKey = data.data.key
      if (typeof newKey === 'string' && newKey.length > 0) {
        for (const item of this.items) {
          const key = item.data.data.key
          if (key === newKey) {
            // Duplicate found => reject to add the item
            const msg = `Found duplicate Item key: ${newKey}`
            return Promise.reject(msg)
          }
        }
      }
    }

    return cb()
  }

  get _linkedTokens() {
    return this.getActiveTokens()
  }
}
