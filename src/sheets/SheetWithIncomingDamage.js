import Mixin from './Mixin.js'
import DamageTypes from '../DamageTypes.js'

export default class SheetWithIncomingDamage extends Mixin {
  constructor(parent, { autoSubmit }) {
    super(parent)

    this._damageIncoming = {
      type: DamageTypes.default,
      amount: 0,
    }

    this.interceptMethod('getData', this.getData, { wrapSuper: true })

    autoSubmit.addFilter('input.damageIncoming.*', (obj, { name, path }) => {
      this._damageIncoming[path[path.length - 1]] = obj[name]
      this.parent.render(false)
      return {}
    })
  }

  getData({ args, callSuper }) {
    const data = callSuper(args)

    const incomingDamageType = DamageTypes.map[this._damageIncoming.type] || DamageTypes.map[DamageTypes.default]
    const incomingDamageAmount = this._damageIncoming.amount
    const incomingDamage = this.parent.actor.calcIncomingDamage({ type: incomingDamageType, amount: incomingDamageAmount })
    if (data.ui == null) {
      data.ui = {}
    }
    data.ui.damageIncoming = {
      type: incomingDamageType,
      amount: incomingDamageAmount,
      resistances: incomingDamage.resistances,
      cost: incomingDamage.costs != null ? this.parent.actor.calculateMetricsCosts(incomingDamage.costs) : null,
    }
    return data
  }
}
