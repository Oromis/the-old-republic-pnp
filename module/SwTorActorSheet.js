import Attributes from './datasets/HumanoidAttributes.js'
import ObjectUtils from './ObjectUtils.js'
import XpTable from './XpTable.js'
import AutoSubmitSheet from './AutoSubmitSheet.js'
import ItemTypes from './ItemTypes.js'
import SkillCategories from './datasets/SkillCategories.js'
import {
  calcMaxInventoryWeight,
  calcPropertyBaseValue,
  calcUpgradeCost,
} from './CharacterFormulas.js'
import Metrics from './datasets/HumanoidMetrics.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './datasets/DurationTypes.js'
import {Parser} from './vendor/expr-eval/expr-eval.js'
import ForceDispositions from './ForceDispositions.js'
import EffectModifiers from './EffectModifiers.js'
import Slots from './Slots.js'
import {describeTraining} from "./TrainingSheet.js"
import DamageTypes from './DamageTypes.js'

function calcGainChange(actor, property, { action, defaultXpCategory }) {
  const prevXp = property.xp || 0
  const gainLog = property.gained || []
  let newGainLog, newXp
  if (action === '+') {
    const xpCategory = property.tmpXpCategory || property.xpCategory || defaultXpCategory
    const xpCost = calcUpgradeCost(actor, property)
    newXp = prevXp + xpCost
    newGainLog = [...gainLog, { xpCategory, xp: xpCost }]
  } else {
    const baseVal = calcPropertyBaseValue(actor, property)
    newGainLog = gainLog.slice(0, gainLog.length - 1)
    const removed = gainLog[gainLog.length - 1]
    const xpCost = removed.xp || actor.dataSet.xpTable.getUpgradeCost({
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
        return (+oldValue) + (+matches[2])
      case '-':
        return (+oldValue) - (+matches[2])
      case '*':
        return (+oldValue) * (+matches[2])
      case '/':
        return (+oldValue) / (+matches[2])
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

    const autoSubmit = new AutoSubmitSheet(this)

    autoSubmit.addFilter('data.attributes.*.gp', this._processDeltaProperty)
    autoSubmit.addFilter('data.attributes.*.buff', this._processDeltaProperty)
    autoSubmit.addFilter('data.metrics.*.value', this._processDeltaProperty)
    autoSubmit.addFilter('data.metrics.*.buff', this._processDeltaProperty)
    autoSubmit.addFilter('data.combat.enemyDistance', this._processDeltaProperty)

    autoSubmit.addFilter('skills.*', (obj, { name, path }) => {
      const [_unused, key, ...rest] = path
      const skill = this.getSkill(key)
      if (skill != null) {
        const skillEntity = this.actor.getOwnedItem(skill.id)
        if (skillEntity != null) {
          let value = obj[name]
          if (path.indexOf('buff') !== -1) {
            value = processDeltaValue(value, skill.data.buff || 0)
          } else if (path.indexOf('vars') !== -1) {
            value = value === '' || isNaN(value) ? '' : +value
          }
          const payload = { [rest.join('.')]: value }
          const oldValue = ObjectUtils.try(skill, ...rest)
          if (value !== oldValue) {
            skillEntity.update(payload)
          }
        }
      }
      // No actor update
      return {}
    })

    autoSubmit.addFilter('input.totalXp', (obj, { name }) => {
      const newVal = Math.round(processDeltaValue(obj[name], this.actor.xp.total))
      return {
        'data.xp.gained': newVal - this.actor.xpFromGp
      }
    })
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

    const actorSlots = data.data.slots || {}

    const computedActorData = this.actor

    // TODO Skills mixin
    const skills = this.actor.skills.list
    // skills = computedActorData.skills.map(skill => {
    //   const value = explainPropertyValue(computedActorData, skill.data)
    //   return {
    //     ...skill,
    //     key: skill.data.key,
    //     // TODO put in Skill mixin
    //     xp: calcSkillXp(computedActorData, skill.data),
    //     xpCategory: skill.data.tmpXpCategory || skill.data.xpCategory,
    //     gained: calcGained(computedActorData, skill.data, { freeXp }),
    //     value,
    //     check: {
    //       rolls: [
    //         makeRoll({
    //           key: skill.data.attribute1,
    //           label: attributesMap[skill.data.attribute1].label,
    //           value: attributesMap[skill.data.attribute1].value.total
    //         }),
    //         makeRoll({
    //           key: skill.data.attribute2,
    //           label: attributesMap[skill.data.attribute2].label,
    //           value: attributesMap[skill.data.attribute2].value.total
    //         }),
    //         makeRoll({ key: skill.data.key, label: skill.name, value: value.total }),
    //       ],
    //       AgP: Math.floor(value.total / 5),
    //     },
    //   }
    // })

    // TODO
    // for (const weaponSlot of computedActorData.weaponSlots) {
    //   if (weaponSlot.skill && computedActorData.skills[weaponSlot.skill.key]) {
    //     weaponSlot.skill = computedActorData.skills[weaponSlot.skill.key]
    //     if (weaponSlot.item != null) {
    //       if (weaponSlot.skill.data.category === 'ranged') {
    //         weaponSlot.isRanged = true
    //         const enemyDistance = ObjectUtils.try(data.data.combat, 'enemyDistance')
    //         if (enemyDistance != null) {
    //           weaponSlot.precision = -evalSkillExpression(
    //             ObjectUtils.try(weaponSlot.item.data.precision, 'formula'),
    //             weaponSlot.skill,
    //             { vars: ObjectUtils.sameValue(enemyDistance, 'Entfernung', 'entfernung', 'Distance', 'distance'), round: 0 }
    //           ).value
    //           weaponSlot.projectileEnergy = Math.max(roundDecimal(evalSkillExpression(
    //             ObjectUtils.try(weaponSlot.item.data.projectileEnergy, 'formula'),
    //             weaponSlot.skill,
    //             { vars: ObjectUtils.sameValue(enemyDistance, 'Entfernung', 'entfernung', 'Distance', 'distance') }
    //           ).value, 3), 0)
    //         }
    //       }
    //
    //       if (weaponSlot.item.data.hasStrengthModifier) {
    //         weaponSlot.strengthModifier = roundDecimal((computedActorData.attributes.kk.value.total + 50) / 100, 2)
    //       }
    //     }
    //
    //     // Defense
    //     if (weaponSlot.skill.data.category === 'melee') {
    //       weaponSlot.canDefend = true
    //       const paradeAdvantage = (weaponSlot.coordination || 0) +
    //         ObjectUtils.try(data.data.weaponSlots, weaponSlot.key, 'paradeAdvantage', { default: 0 })
    //       weaponSlot.paradeCheck = ObjectUtils.cloneDeep(weaponSlot.skill.check)
    //       for (const roll of weaponSlot.paradeCheck.rolls) {
    //         roll.advantage = paradeAdvantage
    //       }
    //     }
    //
    //     // Offense
    //     const attackAdvantage = (weaponSlot.precision || 0) +
    //       (weaponSlot.coordination || 0) +
    //       ObjectUtils.try(data.data.weaponSlots, weaponSlot.key, 'advantage', { default: 0 })
    //     weaponSlot.attackCheck = ObjectUtils.cloneDeep(weaponSlot.skill.check)
    //     for (const roll of weaponSlot.attackCheck.rolls) {
    //       roll.advantage = attackAdvantage
    //     }
    //     if (weaponSlot.item != null) {
    //       weaponSlot.damage = weaponSlot.item.data.damage.formula
    //       if (weaponSlot.projectileEnergy != null && weaponSlot.projectileEnergy !== 1) {
    //         weaponSlot.damage = `(${weaponSlot.damage})*${weaponSlot.projectileEnergy}`
    //       }
    //       if (weaponSlot.strengthModifier != null && weaponSlot.strengthModifier !== 1) {
    //         weaponSlot.damage = `(${weaponSlot.damage})*${weaponSlot.strengthModifier}`
    //       }
    //     }
    //   } else {
    //     weaponSlot.skill = null
    //   }
    // }

    // TODO force skill mixin
    const forceSkills = []
    // const forceSkills = skills.filter(skill => skill.type === 'force-skill').map(skill => {
    //   skill.range = RangeTypes.map[skill.data.range.type].format(skill.data.range)
    //   const durationType = ObjectUtils.try(DurationTypes.map[skill.data.duration.type], { default: DurationTypes.map.instant })
    //   if (durationType.hasFormula) {
    //     const expressionResult = evalSkillExpression(skill.data.duration.formula, skill, { round: 0 })
    //     skill.duration = { ...expressionResult, value: `${expressionResult.value} ${durationType.label}` }
    //   } else {
    //     skill.duration = { value: durationType.label }
    //   }
    //   skill.cost = []
    //   if (durationType.hasOneTimeCost) {
    //     skill.cost.push({
    //       key: 'oneTime',
    //       ...this._evalForceSkillCost(skill, ObjectUtils.try(skill.data.cost, 'oneTime')),
    //     })
    //   }
    //   if (durationType.hasPerTurnCost) {
    //     skill.cost.push({
    //       key: 'perTurn',
    //       ...this._evalForceSkillCost(skill, ObjectUtils.try(skill.data.cost, 'perTurn')),
    //       postfix: 'pro Runde',
    //     })
    //   }
    //   const effectModifier = ObjectUtils.try(skill.data.effect, 'modifier')
    //   skill.effect = {
    //     prefix: effectModifier ? EffectModifiers.map[effectModifier].label : null,
    //     ...evalSkillExpression(ObjectUtils.try(skill.data.effect, 'formula'), skill, { round: 0 }),
    //     d6: +ObjectUtils.try(skill.data.effect, 'd6', { default: 0 }),
    //   }
    //   skill.disposition = ObjectUtils.try(ForceDispositions.map, skill.data.disposition, { default: ForceDispositions.map.neutral })
    //   return skill
    // })

    // TODO
    // let incomingDamage = ObjectUtils.try(data.data.combat, 'damageIncoming', 'amount')
    // const incomingDamageType = DamageTypes.map[ObjectUtils.try(data.data.combat, 'damageIncoming', 'type')]
    // let incomingDamageResistances = []
    // let incomingDamageCost = null
    // if (incomingDamageType != null) {
    //   incomingDamageCost = { LeP: 0 }
    //   incomingDamageResistances = resistances.filter(rt => rt.canResist(incomingDamageType))
    //   for (const res of incomingDamageResistances) {
    //     const { damage, cost } = res.resist(incomingDamage, incomingDamageType, computedActorData)
    //     res.damageBefore = incomingDamage
    //     res.damageReduction = incomingDamage - damage
    //     res.damageAfter = damage
    //     incomingDamage = damage
    //
    //     if (cost != null && typeof cost === 'object') {
    //       for (const [metricKey, amount] of Object.entries(cost)) {
    //         if (amount !== 0) {
    //           incomingDamageCost[metricKey] = (incomingDamageCost[metricKey] || 0) + amount
    //         }
    //       }
    //     }
    //   }
    //
    //   // Resistances have reduced the incoming damage, the rest will be deducted from HP
    //   incomingDamageCost.LeP += incomingDamage
    // }

    data.computed = {
      skillCategories: [
        ...SkillCategories.list.map(cat => ({
          label: cat.label,
          skills: skills.filter(skill => skill.data.category === cat.key)
        })),
        { label: 'Mächte', skills: forceSkills }
      ],
      forceSkills: forceSkills.length > 0 ? forceSkills : null,
      metrics: this.actor.metrics.list,
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
      evasion: this.actor.skills.aus,
      weight: {
        value: roundDecimal(
          computedActorData.inventory.reduce((acc, cur) => acc + (cur.data.quantity || 1) * (cur.data.weight || 0), 0),
          2
        ),
        max: calcMaxInventoryWeight(computedActorData),
      },
      flags: {
        hasGp: this.actor.gp.value > 0,
        canRefundXpToGp: this.actor.xp.gp > 0,
      },
      // TODO
      // damageIncoming: {
      //   type: incomingDamageType,
      //   resistances: incomingDamageResistances,
      //   cost: incomingDamageCost,
      // },
      // TODO
      // regeneration: {
      //   turn: this._prepareRegen('turn', {
      //     EnP: ObjectUtils.try(computedActorData.metrics.EnP, 'max', 'total', { default: 0 }) / 25,
      //     MaP: 2,
      //   }, computedActorData, { label: 'Nächste Runde', className: 'next-turn', icon: 'fa-redo' }),
      //   day: this._prepareRegen('day', {
      //     EnP: ObjectUtils.try(computedActorData.metrics.EnP, 'missing', { default: 0 }),
      //     MaP: ObjectUtils.try(computedActorData.metrics.MaP, 'missing', { default: 0 }),
      //     AuP: ObjectUtils.try(computedActorData.metrics.AuP, 'missing', { default: 0 }),
      //     LeP: ObjectUtils.try(computedActorData.metrics.LeP, 'missing', { default: 0 }),
      //   }, computedActorData, { label: 'Nächster Tag', className: 'next-day', icon: 'fa-sun' })
      // }
    }
    data.computed.weight.overloaded = data.computed.weight.value > data.computed.weight.max
    data.damageTypes = DamageTypes.list
    data.trainings = computedActorData.trainings.map(t => ({
      ...t,
      desc: describeTraining(t)
    }))
    data.itemTypes = ItemTypes.list
    data.ui = {
      inventoryHidden: this._inventoryHidden,
    }
    data.actor = this.actor
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

    // Update Item (or skill)
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents("[data-item-id]")
      const item = this.actor.getOwnedItem(li.data("itemId"))
      item.sheet.render(true)
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
    if (this.actor.gp.value > 0) {
      this.actor.update({ 'data.xp.gp': (this.actor.xp.gp || 0) + 1 })
    }
  }

  _onXpToGp = () => {
    const gp = this.actor.gp.value
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
    const defaultXpCategory = this.actor.dataSet.attributes.map[key].xpCategory
    const attribute = this.actor.attributes[key]

    const { xp, gainLog } = calcGainChange(this.actor, attribute, { action, defaultXpCategory })
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

  _processDeltaProperty = (formData, { name }) => {
    const input = formData[name]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...name.split('.'))
      formData[name] = Math.round(processDeltaValue(input, old))
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
    // Disable regular form submissions (we submit individual fields)
    return Promise.resolve()
  }

  get actorData() {
    return this.actor.data.data
  }

  getSkill(key) {
    return this.actor.data.items.find(item => ['skill', 'force-skill'].indexOf(item.type) !== -1 && item.data.key === key)
  }
}
