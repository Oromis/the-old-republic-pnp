import DataSets from '../datasets/DataSets.js'
import ObjectUtils from '../ObjectUtils.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._categorizedItemStore = null

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
    const res = super._onUpdate(...args)
    this._categorizedItemStore = null
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

  get _categorizedItems() {
    if (this._categorizedItemStore == null) {
      // Re-calculate cached lists
      const store = this._categorizedItemStore = {
        skills: [],
        forceSkills: [],
        trainings: [],
        inventory: [],
        freeItems: [],
        equippedItems: [],
      }
      this.data.items.forEach(item => {
        if (item.type === 'skill' || item.type === 'force-skill') {
          store.skills.push(item)
          if (item.type === 'force-skill') {
            store.forceSkills.push(item)
          }
        } else if(item.type === 'training') {
          store.trainings.push(item)
        } else {
          store.inventory.push(item)
          if (item.isEquipped) {
            store.equippedItems.push(item)
          } else {
            store.freeItems.push(item)
          }
        }
      })
    }
    return this._categorizedItemStore
  }

  // ---------------------------------------------------------------------
  // Private stuff
  // ---------------------------------------------------------------------

  get dataSet() {
    if (this._dataSetStore == null) {
      this._dataSetStore = DataSets.fromActorType(this.type)
    }
    return this._dataSetStore
  }

  _callDelegate(callbackName, ...args) {
    const delegate = this.dataSet.delegate
    if (typeof delegate[callbackName] === 'function') {
      return delegate[callbackName].apply(this, args)
    }
  }

  _defineDataAccessor(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.data.data[key]
      }
    })
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

  _updateCollection(data, key, { useThis = true } = {}) {
    if (data[key] == null) {
      data[key] = {}
    }
    for (const thing of this.dataSet[key].list) {
      let propertyInstance = thing
        .instantiate(this, data[key][thing.key])
      if (useThis) {
        propertyInstance.update()
      }
      data[key][thing.key] = propertyInstance.db
    }
  }
}
