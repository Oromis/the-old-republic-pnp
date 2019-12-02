import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'
import Config from './Config.js'
import XpTable from './XpTable.js'
import Species from './Species.js'
import AutoSubmitSheet from './AutoSubmitSheet.js'
import ItemTypes from './ItemTypes.js'
import SkillCategories from './SkillCategories.js'
import {
  calcPropertyBaseValue,
  calcFreeXp,
  calcGp,
  calcTotalXp,
  explainPropertyValue,
  explainMod, calcSkillXp, calcUpgradeCost
} from './CharacterFormulas.js'
import Metrics from './Metrics.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import { Parser } from './vendor/expr-eval/expr-eval.js'
import ForceDispositions from './ForceDispositions.js'
import EffectModifiers from './EffectModifiers.js'

function calcGained(actor, property, { freeXp }) {
  const gainLog = ObjectUtils.try(property, 'gained', { default: [] }).length
  return {
    canDowngrade: gainLog > 0,
    value: gainLog,
    upgradeCost: calcUpgradeCost(actor, property, { max: freeXp }),
  }
}

function calcGainChange(actor, property, { action, defaultXpCategory }) {
  const prevXp = ObjectUtils.try(property, 'xp', { default: 0 })
  const gainLog = ObjectUtils.try(property, 'gained', { default: [] })
  let newGainLog, newXp
  if (action === '+') {
    const xpCategory = ObjectUtils.try(property, 'tmpXpCategory') ||
      ObjectUtils.try(property, 'xpCategory', { default: defaultXpCategory })
    const xpCost = calcUpgradeCost(actor, property)
    newXp = prevXp + xpCost
    newGainLog = [...gainLog, { xpCategory, xp: xpCost }]
  } else {
    const baseVal = calcPropertyBaseValue(actor, property)
    newGainLog = gainLog.slice(0, gainLog.length - 1)
    const removed = gainLog[gainLog.length - 1]
    const xpCost = removed.xp || XpTable.getUpgradeCost({
      category: removed.xpCategory,
      from: baseVal + newGainLog.length,
      to: baseVal + gainLog.length
    })
    newXp = prevXp - xpCost
  }
  return { xp: newXp, gainLog: newGainLog }
}

function processDeltaValue(text, oldValue) {
  const matches = /\s*([+\-*/])\s*([+\-]?[\d.]+)/.exec(text)
  if (matches) {
    switch (matches[1]) {
      case '+':
        return oldValue + (+matches[2])
      case '-':
        return oldValue - (+matches[2])
      case '*':
        return oldValue * (+matches[2])
      case '/':
        return oldValue / (+matches[2])
    }
  }

  if (!isNaN(text)) {
    // Input is just a number => use it directly
    return +text
  }

  // If we get here then the format is invalid
  ui.notifications.error(`Ungültiger Wert: ${text}. Formate: <Number>, +<Number>, -<Number>, *<Number>, /<Number>`)
  return oldValue
}

function evalSkillExpression(expr, skill, { vars, round }) {
  let error = false
  let value = null
  let variables = null
  const defaultVariables = {
    skill: skill.value.total,
    [skill.data.key]: skill.value.total,
    [skill.data.key.toUpperCase()]: skill.value.total,
  }
  const defaultVariableNames = Object.keys(defaultVariables)

  try {
    const parsed = Parser.parse(expr)
    variables = parsed.variables().filter(name => defaultVariableNames.indexOf(name) === -1)
    value = parsed.evaluate({ ...defaultVariables, ...vars })
    if (round != null) {
      value = Math.round(value * (10 ** round)) / (10 ** round)
    }
  } catch (e) {
    error = true
  }
  return { value, error, variables }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export default class SwTorActorSheet extends ActorSheet {
  constructor(...args) {
    super(...args);

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "attributes"
    this._itemFilter = ''

    new AutoSubmitSheet(this)
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["sw-tor", "sheet", "actor"],
  	  template: "systems/sw-tor/templates/actor-sheet.html",
      submitOnUnfocus: true,
      width: 754,
      height: 600
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    let gp = calcGp(data.data)
    const freeXp = calcFreeXp(data)
    let inventory = [], skills = []

    data.items.forEach(item => {
      if (item.type === 'skill' || item.type === 'force-skill') {
        skills.push(item)
      } else {
        inventory.push(item)
      }
    })

    const attributes = Attributes.list.map(generalAttr => {
      const attr = { ...generalAttr, ...data.data.attributes[generalAttr.key] }
      return {
        ...attr,
        gained: calcGained(this.actorData, attr, { freeXp }),
        value: explainPropertyValue(this.actorData, attr),
        mod: explainMod(this.actorData, attr),
      }
    })

    skills = skills.map(skill => ({
      ...skill,
      xp: calcSkillXp(skill.data),
      xpCategory: skill.data.tmpXpCategory || skill.data.xpCategory,
      gained: calcGained(this.actorData, skill.data, { freeXp }),
      value: explainPropertyValue(this.actorData, skill.data),
    }))

    const forceSkills = skills.filter(skill => skill.type === 'force-skill').map(skill => {
      skill.range = RangeTypes.map[skill.data.range.type].format(skill.data.range)
      const durationType = ObjectUtils.try(DurationTypes.map[skill.data.duration.type], { default: DurationTypes.map.instant })
      if (durationType.hasFormula) {
        const expressionResult = evalSkillExpression(skill.data.duration.formula, skill, { round: 0 })
        skill.duration = { ...expressionResult, value: `${expressionResult.value} ${durationType.label}` }
      } else {
        skill.duration = { value: durationType.label }
      }
      skill.cost = []
      if (durationType.hasOneTimeCost) {
        skill.cost.push({
          key: 'oneTime',
          ...evalSkillExpression(ObjectUtils.try(skill.data.cost, 'oneTime', 'formula'), skill, { vars: ObjectUtils.try(skill.data.cost, 'oneTime', 'vars'), round: 0 }),
        })
      }
      if (durationType.hasPerTurnCost) {
        skill.cost.push({
          key: 'perTurn',
          ...evalSkillExpression(ObjectUtils.try(skill.data.cost, 'perTurn', 'formula'), skill, { vars: ObjectUtils.try(skill.data.cost, 'perTurn', 'vars'), round: 0 }),
          postfix: 'pro Runde',
        })
      }
      const effectModifier = ObjectUtils.try(skill.data.effect, 'modifier')
      skill.effect = {
        prefix: effectModifier ? EffectModifiers.map[effectModifier].label : null,
        ...evalSkillExpression(ObjectUtils.try(skill.data.effect, 'formula'), skill, { round: 0 }),
        d6: +ObjectUtils.try(skill.data.effect, 'd6', { default: 0 }),
      }
      skill.disposition = ObjectUtils.try(ForceDispositions.map, skill.data.disposition, { default: ForceDispositions.map.neutral })
      return skill
    })

    const computed = {
      attributes: ObjectUtils.asObject(attributes, 'key'),
      skills: ObjectUtils.asObject(skills, 'key'),
    }

    data.computed = {
      gp,
      freeXp,
      totalXp: calcTotalXp(data),
      xpFromGp: data.data.xp.gp * Config.character.gpToXpRate,
      xpCategories: XpTable.getCategories(),
      speciesName: ObjectUtils.try(Species.map[data.data.species], 'name', { default: 'None' }),
      attributes: computed.attributes,
      skillCategories: [
        ...SkillCategories.list.map(cat => ({
          label: cat.label,
          skills: skills.filter(skill => skill.data.category === cat.key)
        })),
        { label: 'Mächte', skills: forceSkills }
      ],
      forceSkills: forceSkills.length > 0 ? forceSkills : null,
      metrics: Metrics.list.map(generalMetric => {
        const metric = {
          ...generalMetric,
          ...ObjectUtils.try(data.data, 'metrics', generalMetric.key),
        }

        return {
          ...metric,
          gained: generalMetric.xpCategory ? calcGained(this.actorData, metric, { freeXp }) : null,
          max: explainPropertyValue(computed, metric, { target: 'max' }),
          mod: explainMod(this.actorData, metric),
        }
      }),
      inventory,
      flags: {
        hasGp: gp > 0,
        canRefundXpToGp: data.data.xp.gp > 0
      },
    }
    data.speciesList = Species.list
    data.itemTypes = ItemTypes.list
    data.ui = {
      itemFilter: this._itemFilter,
    }
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.gp-to-xp').click(this._onGpToXp)
    html.find('.xp-to-gp').click(this._onXpToGp)
    html.find('button.set-value').click(this._onSetValueButton)
    html.find('button.change-attr-gained').click(this._onChangeAttrGained)
    html.find('button.change-skill-gained').click(this._onChangeSkillGained)
    html.find('button.change-metric-gained').click(this._onChangeMetricGained)
    html.find('.use-force').click(this._onUseForce)
    html.find('.do-roll').click(this._onDoRoll)

    // Update Item (or skill)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });
  }

  /* -------------------------------------------- */

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  _onGpToXp = () => {
    const gp = calcGp(this.actor.data.data)
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': ObjectUtils.try(this.actor.data.data, 'xp', 'gp', { default: 0 }) + 1 })
    }
  }

  _onXpToGp = () => {
    const gp = ObjectUtils.try(this.actor.data.data, 'xp', 'gp', { default: 0 })
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': gp - 1 })
    }
  }

  _onSetValueButton = event => {
    let value = event.target.getAttribute('data-value')
    if (!isNaN(value)) {
      value = +value
    }
    this.actor.update({
      [event.target.getAttribute('data-field')]: value
    })
  }

  _onChangeAttrGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-attr')
    const defaultXpCategory = Attributes.map[key].xpCategory
    const attribute = {
      ...Attributes.map[key],
      ...this.actorData.attributes[key],
    }

    const { xp, gainLog } = calcGainChange(this.actorData, attribute, { action, defaultXpCategory })
    this.actor.update({
      [`data.attributes.${key}.gained`]: gainLog,
      [`data.attributes.${key}.xp`]: xp,
      [`data.attributes.${key}.xpCategory`]: defaultXpCategory,  // Reset XP category after every change
    })
  }

  _onChangeSkillGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-skill')
    const skill = this.getSkill(key)

    const { xp, gainLog } = calcGainChange(this.actorData, skill.data, { action })

    const skillEntity = this.actor.getOwnedItem(skill.id)
    if (skillEntity != null) {
      skillEntity.update({
        'data.gained': gainLog,
        'data.xp': xp,
        'data.tmpXpCategory': ObjectUtils.try(skill.data, 'xpCategory'), // Reset after every skill point
      })
    } else {
      throw new Error(`Skill entity does not exist: ${key}, ${skill.id}`)
    }
  }

  _onChangeMetricGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-metric')
    const metric = {
      ...Metrics.map[key],
      ...this.actorData.metrics[key],
    }

    const { xp, gainLog } = calcGainChange(this.actorData, metric, { action })
    this.actor.update({
      [`data.metrics.${key}.gained`]: gainLog,
      [`data.metrics.${key}.xp`]: xp,
      [`data.metrics.${key}.xpCategory`]: Metrics.map[key].xpCategory,  // Reset XP category after every change
    })
  }

  _onUseForce = event => {
    let amount = +event.currentTarget.getAttribute('data-amount')
    if (isNaN(amount)) {
      ui.notifications.error(`Ungültiger Machtpunkte-Wert: ${amount}`)
    } else {
      const options = [Metrics.map.MaP, Metrics.map.AuP, Metrics.map.LeP]
      const changeset = {}
      for (const option of options) {
        if (amount <= 0) {
          break
        }
        const delta = option === Metrics.map.LeP ? amount : Math.min(amount, this.actorData.metrics[option.key].value)
        if (delta !== 0) {
          amount -= delta
          changeset[`data.metrics.${option.key}.value`] = this.actorData.metrics[option.key].value - delta
        }
      }
      this.actor.update(changeset)
    }
  }

  _onDoRoll = event => {
    const formula = event.currentTarget.getAttribute('data-formula')
    new Roll(formula).toMessage({
      flavor: event.currentTarget.getAttribute('data-label')
    })
  }

  _processDeltaProperty(formData, path) {
    const input = formData[path]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...path.split('.'))
      formData[path] = Math.round(processDeltaValue(input, old))
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    // Handle the free-form attributes list
    const parsed = expandObject(formData)
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if ( /[\s.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});
    //
    // // Remove attributes which are no longer used
    // for ( let k of Object.keys(this.object.data.data.attributes) ) {
    //   if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    // }
    //
    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, {_id: this.actor._id, "data.attributes": attributes});

    // Take care of attributes.
    Attributes.list.forEach(attr => {
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.gp`)
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.buff`)
    })

    // Skills
    for (const key of Object.keys(formData)) {
      const match = /skills\.([\w\-_]+)\.(.*)/.exec(key)
      if (match) {
        const skill = this.getSkill(match[1])
        if (skill != null) {
          const skillEntity = this.actor.getOwnedItem(skill.id)
          if (skillEntity != null) {
            let value = formData[key]
            if (match[2] === 'data.buff') {
              value = processDeltaValue(value, skill.data.buff || 0)
            } else if (match[2].indexOf('.vars.') !== -1) {
              value = value === '' || isNaN(value) ? '' : +value
            }
            skillEntity.update({ [match[2]]: value })
          }
        }
        delete formData[key]
      }
    }

    Metrics.list.forEach(metric => {
      this._processDeltaProperty(formData, `data.metrics.${metric.key}.value`)
      this._processDeltaProperty(formData, `data.metrics.${metric.key}.buff`)
    })

    if (parsed.input.totalXp != null) {
      const newVal = Math.round(processDeltaValue(parsed.input.totalXp, calcTotalXp(this.actor.data)))
      formData['data.xp.gained'] = newVal -
        (ObjectUtils.try(this.actorData, 'xp', 'gp', { default: 0 }) * Config.character.gpToXpRate)
    }

    this._itemFilter = formData['ui.itemFilter']

    // Update the Actor
    return this.actor.update(formData);
  }

  get actorData() {
    return this.actor.data.data
  }

  getSkill(key) {
    return this.actor.data.items.find(item => item.data.key === key)
  }
}
