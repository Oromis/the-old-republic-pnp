import ObjectUtils from '../util/ObjectUtils.js'

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
    concat: (...args) => args.filter(arg => typeof arg === 'string').join(''),
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
    embedClass: ({ hash: { name, ...rest } }) => conditionalClass(name, rest),
    errorClass: ({ hash }) => conditionalClass(ERROR_CLASS, hash),
    hiddenClass: ({ hash }) => conditionalClass(HIDDEN_CLASS, hash),
    isMultiple: arg => arg > 1,
    isRelevantFactor: num => typeof num === 'number' && num !== 1,
    formatList: list => list.join(', '),
    formatAttrKey,
    formatPercentage: val => `${Math.round(val)}%`,
    formatCheckView: ({ hash: { check, label } }) => new Handlebars.SafeString(
      check.rolls.map(roll => `
        <span title="${roll.label}">
          <strong>${formatAttrKey(roll.key)}</strong>
          ${roll.target}${roll.advantage ? formatCheckDiff(roll.advantage, 'small') : ''}
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
    formatCheckDiff: (diff, classes = '') => new Handlebars.SafeString(formatCheckDiff(diff, classes)),
    formatD20Result: result => new Handlebars.SafeString(`<span class="roll d20 ${categorizeD20Result(result)}">${result}</span>`),
    formatMod,
    formatExplanation: components => {
      if (!Array.isArray(components)) {
        return `Explanation missing!`
      } else {
        return components.map(component => `${component.label}: ${formatMod(component.value)}`).join(' | ')
      }
    },
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
    ) : ''
  })
}
