import DataSets from '../datasets/DataSets.js'

export default class SwTorActor extends Actor {
  constructor(...args) {
    super(...args)

    this._categorizedItemStore = null
  }

  prepareData(actorData) {
    actorData = super.prepareData(actorData)
    const data = actorData.data
    if (this.data != null) {
      // Some of our calculations just don't make any sense before the actor is initialized.
      // E.g. when there aren't any items it's impossible to determine the correct amount of LeP
      // Because of missing buffs

      // Make sure that all attributes exist and that their values are up to date
      for (const generalAttr of this._dataSet.attributes.list) {
        data.attributes[generalAttr.key] = generalAttr
          .instantiate(this, data.attributes[generalAttr.key])
          .update()
          .db
      }
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
    return new Proxy(this, (obj, prop) => {
      if (prop === 'list') {
        // Array-based access
        return this._dataSet.attributes.list.map(a => a.instantiate(this, this.data.attributes[a.key]))
      } else {
        // Map-based access
        const prototype = this._dataSet.attributes.map[prop]
        if (prototype != null) {
          return prototype.instantiate(this, this.data.attributes[prop])
        } else {
          throw new Error(`Unknown attribute key: ${prop}`)
        }
      }
    })
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
}
