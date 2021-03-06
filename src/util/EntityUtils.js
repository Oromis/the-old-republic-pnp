import PropertyPrototype from '../properties/PropertyPrototype.js'
import ObjectUtils from './ObjectUtils.js'
import { Parser } from '../vendor/expr-eval/expr-eval.js'
import { roundDecimal } from './MathUtils.js'

export function defineDataAccessor(object, key, { configurable = false } = {}) {
  Object.defineProperty(object, key, {
    configurable,
    enumerable: true,
    get() {
      return this.data.data[key]
    }
  })
}

export function defineEnumAccessor(
  object, key, { dataKey = key, getKey, dataSetKey = key + 's', getEnumData, instanceDataKey, configurable = false } = {}
) {
  Object.defineProperty(object, key, {
    configurable,
    enumerable: true,
    get() {
      return this._cache.lookup(key, () => {
        const key = typeof getKey === 'function' ? getKey() : ObjectUtils.try(this.data, 'data', ...dataKey.split('.'))
        const enumData = typeof getEnumData === 'function' ? getEnumData() : this.dataSet[dataSetKey]
        let result = enumData.map[key]
        if (result == null) {
          result = enumData.map[enumData.default]
        }
        if (result instanceof PropertyPrototype) {
          let instanceData = null
          if (instanceDataKey != null) {
            instanceData = ObjectUtils.try(this.data.data, ...instanceDataKey.split('.'))
          }
          result = result.instantiate(this, instanceData)
        }
        return result
      })
    }
  })
}

export function defineGetter(object, key, getter, { configurable = false } = {}) {
  Object.defineProperty(object, key, {
    configurable,
    enumerable: true,
    get() {
      return getter.call(this)
    }
  })
}

export function defineCachedGetter(object, key, getter, { configurable = false } = {}) {
  return defineGetter(object, key, function () {
    return this._cache.lookup(key, getter)
  }, { configurable })
}

export function makeRoll(property) {
  const result = {
    key: property.key,
    label: property.label || property.name,
    value: property.value.total,
  }
  if (result.target == null && typeof result.value === 'number') {
    result.target = Math.floor(result.value / 5)
  }
  return result
}

export function evalSkillExpression(expr, skill, { vars, round }) {
  let formulaError = false
  let evalError = false
  let value = null
  let variables = null
  const skillValue = skill.value.total
  const defaultVariables = {
    skill: skillValue,
    [skill.key]: skillValue,
    [skill.key.toUpperCase()]: skillValue,
  }
  const defaultVariableNames = Object.keys(defaultVariables)

  try {
    const parsed = Parser.parse(expr)
    variables = parsed.variables().filter(name => defaultVariableNames.indexOf(name) === -1)
    try {
      value = parsed.evaluate({ ...defaultVariables, ...vars })
      if (round != null) {
        value = roundDecimal(value, round)
      }
    } catch (e) {
      evalError = true
    }
  } catch (e) {
    formulaError = true
    evalError = true
  }
  return { value, formulaError, evalError, variables, formula: expr }
}

export function resolveGlobalSkill(key) {
  // Look for a global skill item with the given key
  return game.items.entities.find(entity => entity.key === key && (entity.type || '').indexOf('skill') !== -1)
}

export function explainComputedValue({ value, label, bonusExplanation }) {
  const result = {
    total: value,
    components: [{ label, value }]
  }
  if (bonusExplanation.total) {
    result.total += bonusExplanation.total
    result.components.push(...bonusExplanation.components)
  }
  return result
}

export function replaceFunction(object, functionName, replacement) {
  const original = object[functionName]
  object[functionName] = function (...args) {
    return replacement.call(this, { original, args })
  }
}

export function defineAccessors(object, data) {
  for (const [key] of Object.entries(data)) {
    if (!(key in object)) {
      Object.defineProperty(object, key, {
        configurable: true,
        get() { return data[key] }
      })
    }
  }
}
