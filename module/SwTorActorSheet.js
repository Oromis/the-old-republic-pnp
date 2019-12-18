import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'
import Config from './Config.js'
import XpTable from './XpTable.js'
import Species from './Species.js'
import AutoSubmitSheet from './AutoSubmitSheet.js'
import ItemTypes from './ItemTypes.js'
import SkillCategories from './SkillCategories.js'
import {
  calcFreeXp,
  calcGp,
  calcMaxInventoryWeight,
  calcPropertyBaseValue,
  calcSkillXp,
  calcTotalXp,
  calcUpgradeCost, explainArmor,
  explainEffect,
  explainPropertyValue
} from './CharacterFormulas.js'
import Metrics from './Metrics.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import {Parser} from './vendor/expr-eval/expr-eval.js'
import ForceDispositions from './ForceDispositions.js'
import EffectModifiers from './EffectModifiers.js'
import Slots from './Slots.js'
import {describeTraining} from "./TrainingSheet.js"
import {makeRoll, resolveEffectLabel} from './SheetUtils.js'
import DamageTypes from './DamageTypes.js'
import ResistanceTypes from './ResistanceTypes.js'

let timeout = null

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

function roundDecimal(val, places) {
  return Math.round(val * (10 ** places)) / (10 ** places)
}

function evalExpression(expr, { vars }) {
  try {
    const parsed = Parser.parse(expr)
    return parsed.evaluate(vars)
  } catch (e) {
    console.warn(`Evaluating ${expr} failed: `, e)
  }
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
      value = roundDecimal(value, round)
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
    this._inventoryHidden = {}
    this._needsUpdate = false

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

  computeActorData(data) {
    let inventory = [], skills = [], freeItems = [], equippedItems = [], trainings = []

    const actorSlots = data.data.slots || {}
    let weaponSlots = [
      { ...Slots.map['right-hand'], skill: { key: 'fau' }, ...ObjectUtils.try(data.data.weaponSlots, 'right-hand') },
      { ...Slots.map['left-hand'], skill: { key: 'fau' }, ...ObjectUtils.try(data.data.weaponSlots, 'left-hand') },
    ]

    data.items.forEach(item => {
      if (item.type === 'skill' || item.type === 'force-skill') {
        skills.push(item)
      } else if(item.type === 'training') {
        trainings.push(item)
      } else {
        inventory.push(item)
        const slotEntries = Object.entries(actorSlots).filter(([_, v]) => v === item.id)
        if (slotEntries.length > 0) {
          equippedItems.push(item)
          for (const weaponSlot of weaponSlots) {
            if (slotEntries.some(([key]) => key === weaponSlot.key)) {
              if (weaponSlots.some(slot => slot.item === item)) {
                // Item has been covered by a previous slot => remove the entire slot
                weaponSlots = weaponSlots.filter(slot => slot !== weaponSlot)
              } else {
                weaponSlot.item = item
                if (item.data.skill != null) {
                  weaponSlot.skill = { key: item.data.skill }
                }
              }
            }
          }
        } else {
          freeItems.push(item)
        }
      }
    })

    return {
      ...this.actorData,
      equippedItems,
      freeItems,
      trainings,
      skills,
      inventory,
      weaponSlots,
    }
  }

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()

    const actorSlots = data.data.slots || {}

    const computedActorData = this.computeActorData(data)

    let gp = calcGp(computedActorData)
    const freeXp = calcFreeXp(computedActorData)

    const attributes = Attributes.list.map(generalAttr => {
      const attr = { ...generalAttr, ...data.data.attributes[generalAttr.key] }
      const result = {
        ...attr,
        gained: calcGained(computedActorData, attr, { freeXp }),
        value: explainPropertyValue(computedActorData, attr),
        mod: explainEffect(computedActorData, attr),
      }
      if (result.value.total !== ObjectUtils.try(data.data.attributes, generalAttr.key, 'value')) {
        this._needsUpdate = true
      }
      return result
    })

    const attributesMap = ObjectUtils.asObject(attributes, 'key')
    computedActorData.attributes = ObjectUtils.asObject(attributes, 'key')

    const skills = computedActorData.skills.map(skill => {
      const value = explainPropertyValue(computedActorData, skill.data)
      return {
        ...skill,
        key: skill.data.key,
        xp: calcSkillXp(computedActorData, skill.data),
        xpCategory: skill.data.tmpXpCategory || skill.data.xpCategory,
        gained: calcGained(computedActorData, skill.data, { freeXp }),
        value,
        check: {
          rolls: [
            makeRoll({
              key: skill.data.attribute1,
              label: attributesMap[skill.data.attribute1].label,
              value: attributesMap[skill.data.attribute1].value.total
            }),
            makeRoll({
              key: skill.data.attribute2,
              label: attributesMap[skill.data.attribute2].label,
              value: attributesMap[skill.data.attribute2].value.total
            }),
            makeRoll({ key: skill.data.key, label: skill.name, value: value.total }),
          ],
          AgP: Math.floor(value.total / 5),
        },
      }
    })

    computedActorData.skills = ObjectUtils.asObject(skills, 'key')

    for (const weaponSlot of computedActorData.weaponSlots) {
      if (weaponSlot.skill && computedActorData.skills[weaponSlot.skill.key]) {
        weaponSlot.skill = computedActorData.skills[weaponSlot.skill.key]
        if (weaponSlot.item != null) {
          if (weaponSlot.skill.data.category === 'ranged') {
            weaponSlot.isRanged = true
            const enemyDistance = ObjectUtils.try(data.data.combat, 'enemyDistance')
            if (enemyDistance != null) {
              weaponSlot.precision = -evalSkillExpression(
                ObjectUtils.try(weaponSlot.item.data.precision, 'formula'),
                weaponSlot.skill,
                { vars: ObjectUtils.sameValue(enemyDistance, 'Entfernung', 'entfernung', 'Distance', 'distance'), round: 0 }
              ).value
              weaponSlot.projectileEnergy = Math.max(roundDecimal(evalSkillExpression(
                ObjectUtils.try(weaponSlot.item.data.projectileEnergy, 'formula'),
                weaponSlot.skill,
                { vars: ObjectUtils.sameValue(enemyDistance, 'Entfernung', 'entfernung', 'Distance', 'distance') }
              ).value, 3), 0)
            }
          }

          if (weaponSlot.item.data.hasStrengthModifier) {
            weaponSlot.strengthModifier = roundDecimal((computedActorData.attributes.kk.value.total + 50) / 100, 2)
          }
        }

        // Defense
        if (weaponSlot.skill.data.category === 'melee') {
          weaponSlot.canDefend = true
          const paradeAdvantage = (weaponSlot.coordination || 0) +
            ObjectUtils.try(data.data.weaponSlots, weaponSlot.key, 'paradeAdvantage', { default: 0 })
          weaponSlot.paradeCheck = ObjectUtils.cloneDeep(weaponSlot.skill.check)
          for (const roll of weaponSlot.paradeCheck.rolls) {
            roll.advantage = paradeAdvantage
          }
        }

        // Offense
        const attackAdvantage = (weaponSlot.precision || 0) +
          (weaponSlot.coordination || 0) +
          ObjectUtils.try(data.data.weaponSlots, weaponSlot.key, 'advantage', { default: 0 })
        weaponSlot.attackCheck = ObjectUtils.cloneDeep(weaponSlot.skill.check)
        for (const roll of weaponSlot.attackCheck.rolls) {
          roll.advantage = attackAdvantage
        }
        if (weaponSlot.item != null) {
          weaponSlot.damage = weaponSlot.item.data.damage.formula
          if (weaponSlot.projectileEnergy != null && weaponSlot.projectileEnergy !== 1) {
            weaponSlot.damage = `(${weaponSlot.damage})*${weaponSlot.projectileEnergy}`
          }
          if (weaponSlot.strengthModifier != null && weaponSlot.strengthModifier !== 1) {
            weaponSlot.damage = `(${weaponSlot.damage})*${weaponSlot.strengthModifier}`
          }
        }
      } else {
        weaponSlot.skill = null
      }
    }

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
          ...this._evalForceSkillCost(skill, ObjectUtils.try(skill.data.cost, 'oneTime')),
        })
      }
      if (durationType.hasPerTurnCost) {
        skill.cost.push({
          key: 'perTurn',
          ...this._evalForceSkillCost(skill, ObjectUtils.try(skill.data.cost, 'perTurn')),
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

    const metrics = Metrics.list.map(generalMetric => {
      const metric = {
        ...generalMetric,
        ...ObjectUtils.try(data.data, 'metrics', generalMetric.key),
      }

      return {
        ...metric,
        gained: generalMetric.xpCategory ? calcGained(computedActorData, metric, { freeXp }) : null,
        max: explainPropertyValue(computedActorData, metric, { target: 'max' }),
        mod: explainEffect(computedActorData, metric),
        missing: metric.max - metric.value,
      }
    })
    computedActorData.metrics = ObjectUtils.asObject(metrics, 'key')

    const evasion = computedActorData.skills.aus

    const resistances = ResistanceTypes.list.map(rt => {
      let value
      if (rt.key === 'armor') {
        value = explainArmor(computedActorData)
      } else {
        value = explainPropertyValue(computedActorData, { key: `r_${rt.key}` })
      }
      return {
        ...rt,
        value,
      }
    })
    let incomingDamage = ObjectUtils.try(data.data.combat, 'damageIncoming', 'amount')
    const incomingDamageType = DamageTypes.map[ObjectUtils.try(data.data.combat, 'damageIncoming', 'type')]
    let incomingDamageResistances = []
    let incomingDamageCost = null
    if (incomingDamageType != null) {
      incomingDamageCost = { LeP: 0 }
      incomingDamageResistances = resistances.filter(rt => rt.canResist(incomingDamageType))
      for (const res of incomingDamageResistances) {
        const { damage, cost } = res.resist(incomingDamage, incomingDamageType, computedActorData)
        res.damageBefore = incomingDamage
        res.damageReduction = incomingDamage - damage
        res.damageAfter = damage
        incomingDamage = damage

        if (cost != null && typeof cost === 'object') {
          for (const [metricKey, amount] of Object.entries(cost)) {
            if (amount !== 0) {
              incomingDamageCost[metricKey] = (incomingDamageCost[metricKey] || 0) + amount
            }
          }
        }
      }

      // Resistances have reduced the incoming damage, the rest will be deducted from HP
      incomingDamageCost.LeP += incomingDamage
    }

    data.computed = {
      gp,
      freeXp,
      totalXp: calcTotalXp(computedActorData),
      xpFromGp: data.data.xp.gp * Config.character.gpToXpRate,
      xpCategories: XpTable.getCategories(),
      speciesName: ObjectUtils.try(Species.map[data.data.species], 'name', { default: 'None' }),
      attributes: computedActorData.attributes,
      skillCategories: [
        ...SkillCategories.list.map(cat => ({
          label: cat.label,
          skills: skills.filter(skill => skill.data.category === cat.key)
        })),
        { label: 'Mächte', skills: forceSkills }
      ],
      forceSkills: forceSkills.length > 0 ? forceSkills : null,
      metrics,
      slots: Slots.layout.map(row => row.map(slot => {
        if (slot == null) {
          return null
        } else {
          const equippedItem = computedActorData.equippedItems.find(item => item.id === actorSlots[slot.key])
          return {
            ...slot,
            item: equippedItem,
            options: [
              { id: null, name: '<Leer>', active: equippedItem == null },
              ...(equippedItem != null ? [{ ...equippedItem, active: true }] : []),
              ...computedActorData.freeItems.filter(item => Array.isArray(item.data.slotTypes) && item.data.slotTypes.indexOf(slot.type) !== -1)
            ]
          }
        }
      })),
      inventory: ItemTypes.list.map(type => ({
        ...type,
        items: computedActorData.inventory.filter(item => item.type === type.key)
      })),
      weaponSlots: computedActorData.weaponSlots,
      evasion,
      weight: {
        value: roundDecimal(
          computedActorData.inventory.reduce((acc, cur) => acc + (cur.data.quantity || 1) * (cur.data.weight || 0), 0),
          2
        ),
        max: calcMaxInventoryWeight(computedActorData),
      },
      flags: {
        hasGp: gp > 0,
        canRefundXpToGp: data.data.xp.gp > 0,
      },
      damageIncoming: {
        type: incomingDamageType,
        resistances: incomingDamageResistances,
        cost: incomingDamageCost,
      },
      regeneration: {
        turn: this._prepareRegen('turn', {
          EnP: ObjectUtils.try(computedActorData.metrics.EnP, 'missing', { default: 0 }),
          MaP: 2,
        }, computedActorData, { label: 'Nächste Runde', className: 'next-turn', icon: 'fa-redo' }),
        day: this._prepareRegen('day', {
          EnP: ObjectUtils.try(computedActorData.metrics.EnP, 'missing', { default: 0 }),
          MaP: ObjectUtils.try(computedActorData.metrics.MaP, 'missing', { default: 0 }),
          AuP: ObjectUtils.try(computedActorData.metrics.AuP, 'missing', { default: 0 }),
          LeP: ObjectUtils.try(computedActorData.metrics.LeP, 'missing', { default: 0 }),
        }, computedActorData, { label: 'Nächster Tag', className: 'next-day', icon: 'fa-sun' })
      }
    }
    data.computed.weight.overloaded = data.computed.weight.value > data.computed.weight.max
    data.speciesList = Species.list
    data.damageTypes = DamageTypes.list
    data.trainings = computedActorData.trainings.map(t => ({
      ...t,
      desc: describeTraining(t)
    }))
    data.itemTypes = ItemTypes.list
    data.ui = {
      inventoryHidden: this._inventoryHidden,
    }
    return data
  }

  _prepareRegen(key, diff, actor, data) {
    const factor = ObjectUtils.try(this.actorData.regeneration, key, 'factor', { default: 1 })
    diff = ObjectUtils.omitZero(ObjectUtils.mapValues(diff, (val, mk) => {
      const delta = Math.floor(val * factor)
      return Math.min(delta, actor.metrics[mk].max.total - actor.metrics[mk].value)
    }))
    return { key, factor, diff, ...data }
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
    html.find('.do-roll').click(this._onDoRoll)
    html.find('.roll-check').click(this._onRollCheck)
    html.find('.item-create').click(this._onCreateItem)

    if (this._needsUpdate) {
      if (timeout != null) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        timeout = null
        this._needsUpdate = false
        this._onSubmit(new Event('click'))
      }, 100)
    }

    // Update Item (or skill)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]")
      const id = li.data("itemId")
      const item = this.actor.getOwnedItem(id)
      if (item != null) {
        if (confirm(`Willst du das Item "${item.name}" wirklich löschen?`)) {
          this.actor.deleteOwnedItem(id)
          li.slideUp(200, () => this.render(false))
        }
      }
    })

    html.find('.toggle-inventory-view').click(event => {
      const category = event.currentTarget.getAttribute('data-category')
      this._inventoryHidden[category] = !this._inventoryHidden[category]
      this.actor.render()
    })

    html.find('.modify-metrics').click(this._onModifyMetrics)
    html.find('.equip-btn').click(this._onChangeEquipment)
    html.find('.next-turn').click(this._onNextTurn)
    html.find('.next-day').click(this._onNextDay)
  }

  /* -------------------------------------------- */

  _onNextTurn = () => {

  }

  _onNextDay = () => {

  }

  _onCreateItem = () => {
    event.preventDefault()
    const type = event.currentTarget.getAttribute('data-type')
    const itemData = {
      name: `Neuer Gegenstand`,
      type,
      data: {}
    }
    return this.actor.createOwnedItem(itemData);
  }

  _onModifyMetrics = event => {
    const target = event.currentTarget
    let diff, factor = 1
    const raw = target.getAttribute('data-deduct')
    if (raw != null) {
      diff = JSON.parse(raw)
      factor = -1
    } else {
      diff = JSON.parse(target.getAttribute('data-add'))
    }

    const metrics = {}
    for (const [key, val] of Object.entries(diff)) {
      if (this.actorData.metrics[key] != null && typeof this.actorData.metrics[key].value === 'number') {
        metrics[key] = { value: this.actorData.metrics[key].value + (factor * val) }
      }
    }
    this.actor.update({ data: { metrics } })
  }

  _onChangeEquipment = event => {
    const slots = { ...this.actor.data.data.slots }
    const slotKey = event.currentTarget.getAttribute('data-slot')
    const slot = Slots.map[slotKey]
    if (slot == null) {
      return ui.notifications.error(`Ungültiger Slot: ${slotKey}`)
    }
    function removeItem(id) {
      for (const key of Object.keys(slots)) {
        if (slots[key] === id) {
          slots[key] = null
        }
      }
    }

    const rawItemId = event.currentTarget.getAttribute('data-item')
    const itemId = +rawItemId
    if (!rawItemId ? slots[slotKey] != null : slots[slotKey] !== itemId) {
      // Item changed
      const item = this.actor.getOwnedItem(itemId)
      if (rawItemId && item != null) {
        removeItem(itemId) // Remove item from any other slots
        let found = false
        const slotsToFill = [...item.data.data.slotTypes].filter(type => {
          if (found || type !== slot.type) {
            return true
          } else {
            found = true
            return false
          }
        })
        if (typeof slots[slotKey] === 'number') {
          // Remove the item that has been in the slot previously
          removeItem(slots[slotKey])
        }
        slots[slotKey] = itemId

        for (const type of slotsToFill) {
          // Find an empty slot to put this item into
          let newSlot = Slots.list.find(s => s.type === type && slot.key !== s.key && !slots[s.key])
          if (newSlot != null) {
            // Empty slot found :)
            slots[newSlot.key] = itemId
          } else {
            // No empty slot of the type we're looking for => just take any other slot and remove the currently
            // equipped item
            newSlot = Slots.list.find(s => s.type === type && slot.key !== s.key)
            if (newSlot == null) {
              // Cannot equip the item, don't have enough slots
              return ui.notifications.error(`Kann ${item.name} nicht ausrüsten: Kein freier Slot vom Typ ${slot.type}`)
            } else {
              const oldId = slots[newSlot.key]
              slots[newSlot.key] = itemId
              // Remove the old item completely (from all slots)
              removeItem(oldId)
            }
          }
        }
      } else {
        // Set the slot to empty
        const oldId = slots[slotKey]
        if (oldId != null) {
          removeItem(oldId)
        }
      }
      this.actor.update({ 'data.slots': slots })
    }
  }

  _onGpToXp = () => {
    const gp = calcGp(this.computeActorData(this.actor.data))
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

    const { xp, gainLog } = calcGainChange(this.computeActorData(this.actor.data), attribute, { action, defaultXpCategory })
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

    const { xp, gainLog } = calcGainChange(this.computeActorData(this.actor.data), skill.data, { action })

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

    const { xp, gainLog } = calcGainChange(this.computeActorData(this.actor.data), metric, { action })
    this.actor.update({
      [`data.metrics.${key}.gained`]: gainLog,
      [`data.metrics.${key}.xp`]: xp,
      [`data.metrics.${key}.xpCategory`]: Metrics.map[key].xpCategory,  // Reset XP category after every change
    })
  }

  _onDoRoll = event => {
    const formula = event.currentTarget.getAttribute('data-formula').replace(/(\d+)w(\d+)/g, '$1d$2')
    new Roll(formula).toMessage({
      speaker: { actor: this.actor.id },
      flavor: event.currentTarget.getAttribute('data-label')
    })
  }

  _onRollCheck = async event => {
    const check = JSON.parse(event.currentTarget.getAttribute('data-check'))
    const flavor = event.currentTarget.getAttribute('data-label') || undefined
    const die = new Die(20)
    die.roll(check.rolls.length)

    const payload = {
      rolls: check.rolls.map((roll, i) => {
        const target = Math.floor(roll.value / 5)
        return { ...roll, die: die.results[i], target, diff: target + (roll.advantage || 0) - die.results[i] }
      }),
    }
    if (check.AgP) {
      payload.AgP = {
        value: check.AgP,
        diff: check.AgP - payload.rolls.reduce((acc, cur) => acc + (cur.diff < 0 ? -cur.diff : 0), 0)
      }
    }
    const chatData = {
      user: game.user._id,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      rollMode: game.settings.get("core", "rollMode"),
      flavor,
      speaker: { actor: this.actor.id },
      sound: CONFIG.sounds.dice,
      content: await renderTemplate('systems/sw-tor/templates/check-roll.html', payload)
    }

    ChatMessage.create(chatData)
  }

  _processDeltaProperty(formData, path) {
    const input = formData[path]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...path.split('.'))
      formData[path] = Math.round(processDeltaValue(input, old))
    }
  }

  _evalForceSkillCost(skill, costData) {
    const result = evalSkillExpression(
      ObjectUtils.try(costData, 'formula'),
      skill,
      { vars: ObjectUtils.try(costData, 'vars'), round: 0 }
    )
    let amount = result.value
    const options = [Metrics.map.MaP, Metrics.map.AuP, Metrics.map.LeP]
    result.costStructure = {}
    for (const option of options) {
      if (amount <= 0) {
        break
      }
      const delta = option === Metrics.map.LeP ? amount : Math.min(amount, this.actorData.metrics[option.key].value)
      if (delta !== 0) {
        amount -= delta
        result.costStructure[option.key] = delta
      }
    }
    return result
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

    // Take care of attributes.
    Attributes.list.forEach(attr => {
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.gp`)
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.buff`)
    })

    // Skills
    for (const key of Object.keys(formData)) {
      const match = /skills\.([\wüäö\-_]+)\.(.*)/.exec(key)
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

            const payload = { [match[2]]: value }
            const oldValue = ObjectUtils.try(skill, ...match[2].split('.'))
            if (value !== oldValue) {
              skillEntity.update(payload)
            }
          }
        }
        delete formData[key]
      }
    }

    Metrics.list.forEach(metric => {
      this._processDeltaProperty(formData, `data.metrics.${metric.key}.value`)
      this._processDeltaProperty(formData, `data.metrics.${metric.key}.buff`)
    })

    this._processDeltaProperty(formData, `data.combat.enemyDistance`)

    if (parsed.input.totalXp != null) {
      const newVal = Math.round(processDeltaValue(parsed.input.totalXp, calcTotalXp(this.computeActorData(this.actor.data))))
      formData['data.xp.gained'] = newVal -
        (ObjectUtils.try(this.actorData, 'xp', 'gp', { default: 0 }) * Config.character.gpToXpRate)
    }

    // Update the Actor
    return this.actor.update(formData)
  }

  get actorData() {
    return this.actor.data.data
  }

  getSkill(key) {
    return this.actor.data.items.find(item => ['skill', 'force-skill'].indexOf(item.type) !== -1 && item.data.key === key)
  }
}
