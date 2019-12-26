import DataSets from '../datasets/DataSets.js'
import DataCache from '../util/DataCache.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._callDelegate('afterConstruct')
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
    return this._checkValidItem(data, () => super.createOwnedItem(data, ...rest))
  }

  updateOwnedItem(data, ...rest) {
    const item = this.getOwnedItem(data.id)
    if (item != null) {
      data = item._filterUpdateData(data)
    } else {
      console.warn(`Updating item that does not exist: `, data)
    }
    let promise = this._checkValidItem(data, () => super.updateOwnedItem(data, ...rest))

    // This is done to work around a FoundryVTT-bug that causes token actors to miss an item update. I.e.
    // updates are always delayed by one change
    if (this.isToken) {
      promise = promise.then(res => {
        this._cache.clearKey('categorizedItems')
        this.render(false)
        return res
      })
    }
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
}
