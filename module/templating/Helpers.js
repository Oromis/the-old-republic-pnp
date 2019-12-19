import ObjectUtils from '../ObjectUtils.js'
import Attributes from '../datasets/HumanoidAttributes.js'

function formatMod(val) {
  return val > 0 ? `+${val}` : val
}

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

const formatAttrKey = key => key.toUpperCase()

export function registerHelpers() {
  Handlebars.registerHelper({
    json: obj => JSON.stringify(obj),
    concat: (...args) => args.filter(arg => typeof arg === 'string').join(''),
    resolve: (object, ...path) => ObjectUtils.try(object, ...path),
    class: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(`class="${when ? then : otherwise}"`),
    ite: ({ hash: { when, then, otherwise = '' } }) => new Handlebars.SafeString(when ? then : otherwise),
    embedClass: ({ hash: { name, ...rest } }) => conditionalClass(name, rest),
    errorClass: ({ hash }) => conditionalClass(ERROR_CLASS, hash),
    hiddenClass: ({ hash }) => conditionalClass(HIDDEN_CLASS, hash),
    isMultiple: arg => arg > 1,
    isRelevantFactor: num => typeof num === 'number' && num !== 1,
    formatAttrKey,
    formatAttrLabel: key => ObjectUtils.try(Attributes.map[key], 'label'),
    formatPercentage: val => `${Math.round(val)}%`,
    formatCheckView: ({ hash: { check, label } }) => new Handlebars.SafeString(
      check.rolls.map(roll => `
        <span title="${roll.label}">
          <strong>${formatAttrKey(roll.key)}</strong>
          ${roll.target}
        </span>
      `).join('') + `
      <span>|</span>
      <span title="Ausgleichspunkte">
        <strong>AgP</strong>
        ${check.AgP}
      </span>
      <a class="roll-check" title="Probe werfen" data-check='${JSON.stringify(check)}' data-label="${label}">
        <i class="fas fa-dice-d20"></i>
      </a>
    `),
    formatCheckDiff: (diff, classes = '') => new Handlebars.SafeString(
      `<span class="check-diff ${diff >= 0 ? 'good' : 'bad'} ${classes}">` +
      `${diff > 0 ? '+' : ''}${diff}` +
      '</span>'
    ),
    formatD20Result: result => new Handlebars.SafeString(`<span class="roll d20 ${categorizeD20Result(result)}">${result}</span>`),
    formatMod,
    formatExplanation: components => components.map(component => `${component.label}: ${formatMod(component.value)}`).join(' | '),
    formatRegen: regen => Object.entries(regen).map(([label, cost]) => `${label}: ${formatMod(cost)}`).join(' | '),
    formatCosts: costs => Object.entries(costs).map(([label, cost]) => `${label}: ${formatMod(-cost)}`).join(' | '),
    expressionVariables: variables => variables && variables.length > 0 ? new Handlebars.SafeString(`<div>Variablen: [${variables}]</div>`) : '',
    stepButtons: ({ hash: { val, name, buttonClass = 'small char set-value', valueClass = '' } }) => {
      return new Handlebars.SafeString(`
        <button type="button" class="${buttonClass}" data-field="${name}" data-value="${val - 1}" data-action="-">-</button>
        <span class="${valueClass}">${val}</span>
        <button type="button" class="${buttonClass}" data-field="${name}" data-value="${val + 1}" data-action="+">+</button>
      `)
    },
    metricView: ({ hash: { metric, linked } }) => new Handlebars.SafeString(`
      <div class="metric" title="${metric.key} | ${metric.label}">
        <div class="metric-bar" style="width: ${(metric.value / metric.max.total) * 100}%; background-color: ${metric.backgroundColor};"></div>
        <label class="metric-value flex-row multi-item flex-center">
          <input type="text" ${linked ? 'data-link' : 'name'}="data.metrics.${metric.key}.value" value="${metric.value}" class="align-right transparent flex-grow" />
          <span>/</span>
          <span class="input-width flex-grow">${metric.max.total}</span>
        </label>
      </div>
    `),
    damageIcon: ({ hash: { type, classes = '' } }) => type != null ? (
      new Handlebars.SafeString(`<img src="${type.icon}" alt="${type.label}" title="${type.label}" class="${classes}" />`)
    ) : ''
  })
}