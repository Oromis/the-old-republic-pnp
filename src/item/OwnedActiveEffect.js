import {Parser} from '../vendor/expr-eval/expr-eval.js'
import {defineGetter} from '../util/EntityUtils.js'
import ObjectUtils from '../util/ObjectUtils.js'
import {formatEffectValue} from '../util/FormatUtils.js'

function willTrigger(lhs, op, rhs) {
  switch (op) {
    case 'eq':
      return lhs === rhs
    case 'gte':
      return lhs >= rhs
    default:
      return true
  }
}

export default {
  beforeConstruct() {
    defineGetter(this, 'effects', function () {
      return this.data.data.effects || []
    })

    defineGetter(this, 'summary', function () {
      const lines = []
      for (const effect of this.effects) {
        lines.push(`${effect.label || effect.key}: ${formatEffectValue(effect.value)}`)
      }
      return lines.join(', ')
    })

    this.handleEvent = function handleEvent(type, { undo = false } = {}) {
      const newData = ObjectUtils.cloneDeep(this.data.data)
      if (!Array.isArray(newData.effects)) {
        newData.effects = []
      }

      const valueFactor = undo ? -1 : 1
      let metricsChanges = null
      let changed = false
      let ended = false
      for (const trigger of (newData.triggers || [])) {
        if (trigger.event === type) {
          changed = true
          trigger.activationCount = (trigger.activationCount || 0) + (valueFactor)

          let triggers = true
          if (trigger.condition && trigger.conditionArg != null) {
            try {
              const rhs = Parser.evaluate(trigger.conditionArg, this.actor.propertyValues)
              triggers = willTrigger(trigger.activationCount, trigger.condition, rhs)
            } catch (e) {
              console.warn(e)
              ui.notifications.error(`Konnte Bedinung ${trigger.conditionArg} nicht evaluieren: ${e.message}`)
            }
          }

          if (triggers) {
            for (const action of trigger.actions) {
              switch (action.type) {
                case 'effect': {
                  try {
                    const existing = newData.effects.find(e => e.key === action.key)
                    const bonus = valueFactor * Parser.evaluate(action.value.bonus, this.actor.propertyValues)
                    if (existing != null) {
                      existing.value.bonus += bonus
                      if (existing.value.bonus === 0) {
                        newData.effects = newData.effects.filter(e => e !== existing)
                      }
                    } else {
                      newData.effects.push({
                        key: action.key,
                        label: action.label,
                        value: { bonus },
                      })
                    }
                  } catch (e) {
                    console.warn(e)
                    ui.notifications.error(`Konnte Effekt ${action.value.bonus} nicht evaluieren: ${e.message}`)
                  }
                  break
                }

                case 'metric': {
                  if (metricsChanges == null) {
                    metricsChanges = {}
                  }
                  try {
                    const actionValue = Math.round(Parser.evaluate(action.value.delta, this.actor.propertyValues))
                    metricsChanges[action.key] = (metricsChanges[action.key] || 0) + (valueFactor * actionValue)
                  } catch (e) {
                    console.warn(e)
                    ui.notifications.error(`Konnte Effekt ${action.value.delta} nicht evaluieren: ${e.message}`)
                  }

                  break
                }

                case 'end':
                  ended = true
                  break
              }
            }
          }
        }
      }

      if (ended) {
        return {
          delete: true
        }
      } else if (changed) {
        return {
          activeEffect: {
            _id: this._id,
            data: newData,
          },
          metricsChanges,
        }
      } else {
        return {}
      }
    }
  }
}
