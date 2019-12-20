import DataSets from '../datasets/DataSets.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._categorizedItemStore = null

    this._callDelegate('afterConstruct')
  }

  prepareData(actorData) {
    actorData = super.prepareData(actorData)
    const data = actorData.data
    const thisInitialized = this.data != null
    if (thisInitialized) {
      // Some of our calculations just don't make any sense before the actor is initialized.
      // E.g. when there aren't any items it's impossible to determine the correct amount of LeP
      // Because of missing buffs
      this._callDelegate('beforePrepareData', actorData)
    }

    // Make sure that all attributes exist and that their values are up to date
    this._updateCollection('attributes', { useThis: thisInitialized })
    this._updateCollection('metrics', { useThis: thisInitialized })

    if (thisInitialized) {
      this._callDelegate('afterPrepareData', actorData)
    }
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
    return this._getCollectionProxy('attributes')
  }

  get metrics() {
    return this._getCollectionProxy('metrics')
  }

  // ---------------------------------------------------------------------
  // Item accessors
  // ---------------------------------------------------------------------

  get skills() {
    return this._categorizedItems.skills
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
        trainings: [],
        inventory: [],
        freeItems: [],
        equippedItems: [],
      }
      this.data.items.forEach(item => {
        if (item.type === 'skill' || item.type === 'force-skill') {
          store.skills.push(item)
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

  get _dataSet() {
    if (this._dataSetStore == null) {
      this._dataSetStore = DataSets.fromActorType(this.type)
    }
    return this._dataSetStore
  }

  _callDelegate(callbackName, ...args) {
    const delegate = this._dataSet.delegate
    if (typeof delegate[callbackName] === 'function') {
      return delegate[callbackName].apply(this, args)
    }
  }

  _defineDataAccessor(key) {
    Object.defineProperty(this, key, {
      get() {
        return this.data[key]
      }
    })
  }

  _getCollectionProxy(key) {
    return new Proxy(this, (obj, prop) => {
      if (prop === 'list') {
        // Array-based access
        return this._dataSet[key].list.map(a => a.instantiate(this, this.data[key][a.key]))
      } else {
        // Map-based access
        const prototype = this._dataSet[key].map[prop]
        if (prototype != null) {
          return prototype.instantiate(this, this.data[key][prop])
        } else {
          throw new Error(`Unknown attribute key: ${prop}`)
        }
      }
    })
  }

  _updateCollection(data, key, { useThis = true } = {}) {
    for (const thing of this._dataSet[key].list) {
      let propertyInstance = thing
        .instantiate(this, data[key][thing.key])
      if (useThis) {
        propertyInstance.update()
      }
      data[key][thing.key] = propertyInstance.db
    }
  }
}
