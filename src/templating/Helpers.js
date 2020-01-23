import ObjectUtils from '../util/ObjectUtils.js'
import { formatMod } from '../util/FormatUtils.js'
import {roundDecimal} from '../util/MathUtils.js'

const ERROR_CLASS = 'has-error'
const HIDDEN_CLASS = 'hidden'

function conditionalClass(className, { when, unless }) {
  if (when) {
    return className
  } else if (typeof unless !== 'undefined' && !unless) {
    return className
  } else {
    return ''
  }
}

function categorizeD20Result(value) {
  if (value === 1) {
    return 'good'
  } else if (value === 20) {
    return 'bad'
  } else {
    return ''
  }
}

const formatAttrKey = key => key && key.toUpperCase()

function formatMetricChanges(diff) {
  return Object.entries(diff).map(([label, cost]) => `${label}: ${formatMod(cost)}`).join(' | ')
}

function formatCheckDiff(diff, classes = '') {
  return (
    `<span class="check-diff ${diff >= 0 ? 'good' : 'bad'} ${classes}">` +
    `${diff > 0 ? '+' : ''}${diff}` +
    '</span>'
  )
}

export function registerHelpers() {
  Handlebars.registerHelper({
    json: obj => JSON.stringify(obj),
    concat: (...args) => args.filter(arg => typeof arg !== 'object').join(''),
    fallback: (...args) => {
      // Last argument is Handlebars-specific. Don't use it.
      let result
      for (let i = 0; i < args.length - 1; ++i) {
        result = args[i]
        if (result) {
          break
        }
      }
      return result
    },
    resolve: (object, ...path) => ObjectUtils.try(object, ...path),
    class: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(`class="${when ? then : otherwise}"`),
    ite: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(when ? then : otherwise),
    isEqual: (a, b) => a === b,
    embedClass: ({ hash: { name, ...rest } }) => conditionalClass(name, rest),
    errorClass: ({ hash }) => conditionalClass(ERROR_CLASS, hash),
    hiddenClass: ({ hash }) => conditionalClass(HIDDEN_CLASS, hash),
    isMultiple: arg => arg > 1,
    isOne: arg => arg === 1,
    isNumeric: arg => typeof arg === 'number',
    canBeNumeric: arg => typeof arg === 'number' || (typeof arg === 'string' && !isNaN(arg)),
    roundNumber: (number, decimals) => roundDecimal(number, decimals),
    isLessThan: (number, threshold) => number < threshold,
    isRelevantFactor: num => typeof num === 'number' && num !== 1,
    formatList: list => list.join(', '),
    formatAttrKey,
    formatPercentage: val => `${Math.round(val)}%`,
    formatCheckDiff: (diff, classes = '') => new Handlebars.SafeString(diff != null ? (
      formatCheckDiff(diff, typeof classes === 'string' ? classes : '')
    ) : ''),
    formatD20Result: result => new Handlebars.SafeString(
      `<span class="roll d20 ${categorizeD20Result(result)}">${result}</span>`
    ),
    formatMod,
    formatExplanation: components => {
      if (!Array.isArray(components)) {
        return `Explanation missing!`
      } else {
        return components.map(component => `${component.label}: ${formatMod(component.value)}`).join(' | ')
      }
    },
    formatBuffedValue: value => new Handlebars.SafeString(
      `<span class="${value.total > value.permanent ? 'good' : ''}${value.total < value.permanent ? 'bad' : ''}">` +
        `${value.total}` +
      `</span>`
    ),
    formatRegen: regen => formatMetricChanges(regen),
    formatCosts: (actor, costs) => formatMetricChanges(actor.calculateMetricsCosts(costs)),
    expressionVariables: variables => variables && variables.length > 0 ? new Handlebars.SafeString(`<div>Variablen: [${variables}]</div>`) : '',
    metricView: ({ hash: { metric, linked } }) => new Handlebars.SafeString(`
      <div class="metric" title="${metric.key} | ${metric.label}m">
        <div class="metric-bar" style="width: ${(metric.value / metric.max) * 100}%; background-color: ${metric.backgroundColor};"></div>
        <label class="metric-value flex-row multi-item flex-center">
          <input type="text" ${linked ? 'data-link' : 'name'}="data.metrics.${metric.key}.value" value="${metric.value}" class="align-right transparent flex-grow" />
          <span>/</span>
          <span class="input-width flex-grow">${metric.max}</span>
        </label>
      </div>
    `),
    damageIcon: ({ hash: { type, classes = '' } }) => type != null ? (
      new Handlebars.SafeString(`<img src="${type.icon}" alt="${type.label}" title="${type.label}" class="${classes}" />`)
    ) : '',
    calcCoordination: (slot, actor) => slot.explainCoordination(actor).total,
    explainCoordination: (slot, actor) => slot.explainCoordination(actor).components,

    // ----------------------------------------------------------------------------
    // Tabs
    // ----------------------------------------------------------------------------
    tabGroup: function ({ hash: { id, minWidth = null }, fn }) {
      return new Handlebars.SafeString(
        `<nav class="tab-group" data-id="${id}" data-min-width="${minWidth || ''}">` +
          `${fn({ tabGroup: this.tabGroups[id] || { active: {} } })}` +
        `</nav>`
      )
    },

    tabHeader: function ({ hash: { id, label } }) {
      return new Handlebars.SafeString(
        `<a class="tab-header ${this.tabGroup.active[id] ? 'active' : ''}" data-id="${id}">${label}</a>`
      )
    },

    tabContents: function ({ fn }) {
      return new Handlebars.SafeString(
        `<section class="tab-contents flex-row multi-item flex-cross-start">${fn(this)}</section>`
      )
    },

    tabContent: function ({ hash: { groupId, id, classes = '' }, fn }) {
      const group = this.tabGroups[groupId] || { active: {} }
      return new Handlebars.SafeString(
        `<div class="tab-wrapper padded ${group.active[id] ? '' : HIDDEN_CLASS}" data-id="${id}">` +
          `<div class="tab-content ${id} ${classes}">` +
            `${fn(this)}` +
          `</div>` +
        `</div>`
      )
    },

    // ----------------------------------------------------------------------------
    // Active Effects
    // ----------------------------------------------------------------------------
    formatActiveEffectTriggerEvent: key => {
      return {
        onInit: 'Zu Beginn',
        onTurnStart: 'Bei Zugbeginn',
        onTurnEnd: 'Bei Zugende'
      }[key] || ''
    },

    formatActiveEffectTriggerCondition: key => {
      return {
        eq: 'Bei Aktivierung Nr.',
        gte: 'Ab Aktivierung Nr.',
      }[key] || ''
    },

    formatActiveEffectActionType: key => {
      return {
        effect: 'Effekt aktivieren',
        metric: 'Metrik verändern',
        end: 'Terminieren',
      }[key] || ''
    }
  })
}
