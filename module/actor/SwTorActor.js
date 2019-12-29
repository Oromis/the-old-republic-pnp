import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'
import ObjectUtils from '../util/ObjectUtils.js'
import { roundDecimal } from '../util/MathUtils.js'
import { defineGetter } from '../util/EntityUtils.js'
import Slots from '../datasets/HumanoidSlots.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._callDelegate('afterConstruct')
    this._pendingCalls = []
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
        oldItem.unequip()
        if (this.isToken) {
          return awaitOperation()
        }
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
              prevItem.unequip()
              if (this.isToken) {
                return awaitOperation()
              }
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

      return await item.equip(newItemSlots)
    } else if (item == null) {
      // Set the slot to empty
      const oldItem = this.getItemInSlot(slotKey)
      if (oldItem != null) {
        await oldItem.unequip()
      }
    }
  }

  getItemInSlot(slotKey) {
    return this.equippedItems.find(item => item.isEquippedInSlot(slotKey))
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

  // ----------------------------------------------------------------------------
  // Install some item hooks to make sure that item invariants are kept
  // ----------------------------------------------------------------------------

  createOwnedItem(data, ...rest) {
    let promise = this._checkValidItem(data, () => super.createOwnedItem(data, ...rest))

    if (this.isToken) {
      // This is done to work around a FoundryVTT-bug that causes token actors to not update automatically when
      // an item is changed.
      promise = promise.then(res => {
        this._cache.clearKey('categorizedItems')
        this.render(false)
        return res
      })
    }

    return promise
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
      this._cache.clearKey('categorizedItems')
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
    const newActorType = data.data.actorType
    if (newActorType != null && newActorType !== this.type) {
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
