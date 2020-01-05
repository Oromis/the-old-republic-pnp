import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { roundDecimal } from '../util/MathUtils.js'
import { defineGetter } from '../util/EntityUtils.js'
import { measureDistance } from '../overrides/DistanceMeasurement.js'
import { keyMissing } from '../util/ProxyUtils.js'
import Modifier from '../util/Modifier.js'
import ActorTypes from '../datasets/ActorTypes.js'
import Skill from '../item/Skill.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._callDelegate('afterConstruct')
    this._pendingCalls = []
    this._cacheClearPending = false
  }

  prepareData(actorData) {
    actorData = super.prepareData(actorData) || this.data
    const data = actorData.data
    if (!Array.isArray(this.items)) {
      if (typeof this._getItems === 'function') {
        this.items = this._getItems()
      }
      this._callDelegate('beforeConstruct')
    }

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
    return super._onUpdate(...args)
  }

  _getItems(...args) {
    // _getItems() re-generates the array of owned items. Reset the cache in this case.
    const res = super._getItems(...args)
    this._cache && this._cache.clearKey('categorizedItems')
    return res
  }

  get attributes() {
    return this._getPropertyCollectionProxy('attributes')
  }

  attrValue(key) {
    return ObjectUtils.try(this.attributes[key], 'value', 'total', { default: 0 })
  }

  get metrics() {
    return this._getPropertyCollectionProxy('metrics')
  }

  get resistances() {
    return this._getPropertyCollectionProxy('resistances')
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

  get inventory() {
    return this._categorizedItems.inventory
  }

  get freeItems() {
    return this._categorizedItems.freeItems
  }

  get equippedItems() {
    return this._categorizedItems.equippedItems
  }

  get dataSet() {
    return this._cache.lookup('dataSet', () => DataSets.fromActorType(this.type))
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
      defineGetter(result, 'max', () => this._cache.lookup('inventoryWeightMax', () => (
        (this.attrValue('kk') + this.attrValue('ko')) / 2
      )))
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

    if (item != null && !item.isEquippedInSlot(slotKey)) {
      // Equip Item in slot
      const prevItemSlots = item.slots || []
      const itemSlotTypes = [...item.slotTypes]

      const awaitOperation = () => {
        // Work around a Foundry 0.4.3 bug: If this is a token actor, we need to wait for the response from
        // the server before proceeding or we'll override any changes done here in the next item update
        // (even if it is a completely different item)
        this._pendingCalls.push(() => this.equipItem(slotKey, this.getOwnedItem(item.id)))
      }

      // Remove any previous item in the slot
      const removedItems = []
      const oldItem = this.getItemInSlot(slotKey)
      if (oldItem != null) {
        removedItems.push(oldItem.id)
        await oldItem.unequip()
        return awaitOperation()
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
              await prevItem.unequip()
              return awaitOperation()
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

      this._cacheClearPending = true
      return item.equip(newItemSlots)
    } else if (item == null) {
      // Set the slot to empty
      const oldItem = this.getItemInSlot(slotKey)
      if (oldItem != null) {
        this._cacheClearPending = true
        await oldItem.unequip()
      }
    }
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
      const token = this.token
      // TODO this doesn't quite work yet. Need further digging or a Foundry update
      if (token != null && token.target != null) {
        return roundDecimal(measureDistance(token, token.target), 2)
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
      const delta = Math.floor(val * factor)
      return Math.min(delta, this.metrics[mk].missing)
    }))
    return { key, ...data, diff, factor }
  }

  /**
   * Changes the actor's metrics' values by the diff provided.
   */
  modifyMetrics(diff, { dryRun = false } = {}) {
    const metrics = {}
    for (const [key, val] of Object.entries(diff)) {
      if (this.metrics[key] != null && typeof this.metrics[key].value === 'number') {
        metrics[key] = { value: this.metrics[key].value + val }
      }
    }

    const payload = { data: { metrics } }
    if (dryRun) {
      return payload
    } else {
      return this.update(payload)
    }
  }

  enterTurn({ round, combat }) {
    // Apply turn regeneration
    const diff = this.getRegeneration('turn').diff
    const payload = this.modifyMetrics(diff, { dryRun: true })
    payload.data.lastTurnRegeneration = diff
    return this.update(payload)
  }

  undoEnterTurn({ round, combat }) {
    // Undo the last turn regeneration
    const reg = this.data.data.lastTurnRegeneration
    if (reg != null && typeof reg === 'object') {
      const payload = this.modifyMetrics(ObjectUtils.mapValues(reg, a => -a), { dryRun: true })
      payload.data['-=lastTurnRegeneration'] = null
      return this.update(payload)
    }
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
    return ActorTypes.map[ActorTypes.default]
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
        inventory: [],
        freeItems: [],
        equippedItems: [],
      }
      this.items.forEach(item => {
        if (item.type === 'skill' || item.type === 'force-skill') {
          categories.skills.push(item)
          if (item.type === 'force-skill') {
            categories.forceSkills.push(item)
          }
        } else if(item.type === 'training') {
          categories.trainings.push(item)
        } else {
          categories.inventory.push(item)
          if (item.isEquipped) {
            categories.equippedItems.push(item)
          } else {
            categories.freeItems.push(item)
          }
        }
      })
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
      this.trainings,
      this.equippedItems,
    ]

    for (const source of sources) {
      for (const item of source) {
        for (const effect of (item.effects || [])) {
          result.getModifier(effect.key).inject(effect.value, { label: item.name })
        }
      }
    }

    return result
  }

  // ----------------------------------------------------------------------------
  // Install some item hooks to make sure that item invariants are kept
  // ----------------------------------------------------------------------------

  createOwnedItem(data, ...rest) {
    return this._checkValidItem(data, () => super.createOwnedItem(data, ...rest))
      .then(res => {
        // This is done to work around a FoundryVTT-bug that causes token actors to not update automatically when
        // an item is changed.
        this._cache.clear()
        this.render(false)
        return res
      })
  }

  updateOwnedItem(data, ...rest) {
    let item = this.getOwnedItem(data.id)
    if (item != null) {
      data = item._filterUpdateData(data)
    } else {
      console.warn(`Updating item that does not exist: `, data)
    }
    let promise = this._checkValidItem(data, () => super.updateOwnedItem(data, ...rest))

    // This is done to work around a FoundryVTT-bug that causes token actors to miss an item update. I.e.
    // updates are always delayed by one change
    promise = promise.then(res => {
      this._cache.clear()
      if (this._cacheClearPending) {
        this._cacheClearPending = false

        // This has been added to force-update the actor's attributes and metrics when an equipped item changes
        // (because bonuses will change in this case)
        const data = this.prepareData({})
        this.update(data)
      }
      this.render(false)
      item = this.getOwnedItem(data.id)
      item.sheet.render(false)
      this._runPendingCalls()
      return res
    })
    return promise
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

  _runPendingCalls() {
    const calls = [...this._pendingCalls]
    this._pendingCalls = []
    for (const call of calls) {
      call()
    }
  }
}
