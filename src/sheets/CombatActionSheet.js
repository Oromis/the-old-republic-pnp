export default class CombatActionSheet extends ItemSheet {
  constructor(...args) {
    super(...args)

    this._registeredEntities = []
  }

  close(...args) {
    this._updateAppAssociations([])
    return super.close(...args)
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["sw-tor", "dark", "sheet", "combat-action"],
      template: "systems/sw-tor/templates/combat-action-sheet.html",
      width: 554,
      height: 200,
      resizable: false,
      submitOnChange: false,
      submitOnClose: false,
    })
  }

  getData() {
    const data = super.getData()
    const rawAttacks = this._rawAttacks
    data.attacks = this.item.processAttacks(rawAttacks).attacks
    this._updateAppAssociations(this._extractObjects(data.attacks))
    data.combatAction = data.item = this.item
    return data
  }

  activateListeners(html) {
    super.activateListeners(html)

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    html.find('.delete-attack').on('click', e => {
      this.item.removeAttackByIndex(+e.currentTarget.getAttribute('data-index'))
    })
    html.find('.delete-defense').on('click', e => {
      this.item.removeDefenseByIndices(
        +e.currentTarget.getAttribute('data-attack-index'),
        +e.currentTarget.getAttribute('data-defense-index')
      )
    })
    html.find('.apply-damage').on('click', async e => {
      const attackIndex = +e.currentTarget.getAttribute('data-attack-index')
      const defenseIndex = +e.currentTarget.getAttribute('data-defense-index')
      const { attacks } = this.item.processAttacks(this._rawAttacks)
      const attack = attacks[attackIndex]
      if (attack != null) {
        const defense = attack.defenses[defenseIndex]
        if (defense != null) {
          for (let i = 0; i < defense.totalHits; ++i) {
            const { costs } = defense.defender.calcIncomingDamage({ type: attack.damage.type, amount: attack.damage.amount })
            if (costs != null) {
              await defense.defender.modifyMetrics(defense.defender.calculateMetricsCosts(costs))
            }
          }
        }
      }
    })
  }

  _updateObject() {
    return Promise.resolve()
  }

  get _rawAttacks() {
    return (this.item.data.data.attacks != null && this.item.data.data.attacks.length > 0 ?
      this.item.data.data.attacks :
      this.item.data.data.prevAttacks) || []
  }

  _extractObjects(attacks) {
    const result = []
    for (const attack of attacks) {
      result.push(attack.message)
      if (attack.damageMessage) {
        result.push(attack.damageMessage)
      }
      for (const defense of attack.defenses) {
        result.push(defense.message)
      }
    }
    return result.filter(i => i != null)
  }

  _updateAppAssociations(entities) {
    const previouslyRegistered = new Set(this._registeredEntities)
    const newRegistered = []
    for (const entity of entities) {
      if (!previouslyRegistered.delete(entity)) {
        // Item was not in the set => we need to register this entity
        entity.apps[this.appId] = this
      }
      newRegistered.push(entity)
    }

    // Any items left in the previouslyRegistered set need to be unregistered
    for (const old of [...previouslyRegistered]) {
      delete old.apps[this.appId]
    }

    this._registeredEntities = newRegistered
  }
}
