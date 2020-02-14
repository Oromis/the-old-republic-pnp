import { calcPropertyBaseValue, calcUpgradeCost } from '../CharacterFormulas.js'
import ArrayUtils from '../util/ArrayUtils.js'
import {processDeltaValue} from '../util/SheetUtils.js'
import SheetWithTabs from './SheetWithTabs.js'
import BaseActorSheet from './BaseActorSheet.js'
import SheetWithIncomingDamage from './SheetWithIncomingDamage.js'
import {fullLoadPromise} from '../util/GameUtils.js'
import CharacterGenerator from '../actor/CharacterGenerator.js'

function calcGainChange(actor, property, { action, defaultXpCategory }) {
  const prevXp = property.xp || 0
  const gainLog = property.gained || []
  let newGainLog, newXp
  switch (action) {
    case 'buy': {
      // Buy a point with XP
      const xpCategory = property.currentXpCategory || property.effectiveXpCategory || defaultXpCategory
      const xpCost = calcUpgradeCost(actor, property)
      newXp = prevXp + xpCost
      newGainLog = [...gainLog, { xpCategory, xp: xpCost }]
      break
    }

    case 'grant': {
      // The GM grants a point
      const xpCategory = property.currentXpCategory || property.effectiveXpCategory || defaultXpCategory
      const xpGain = calcUpgradeCost(actor, property)
      newXp = prevXp + xpGain
      newGainLog = [...gainLog, { xpCategory, xp: xpGain, xpGain }]
      break
    }

    case 'remove': {
      // Remove the last added point
      const baseVal = calcPropertyBaseValue(actor, property)
      newGainLog = gainLog.slice(0, gainLog.length - 1)
      const removed = gainLog[gainLog.length - 1]
      const xpCost = typeof removed.xp === 'number' ? removed.xp : actor.dataSet.xpTable.getUpgradeCost({
        category: removed.xpCategory,
        from: baseVal + newGainLog.length,
        to: baseVal + gainLog.length
      })
      newXp = prevXp - xpCost
      break
    }
  }

  return { xp: newXp, gainLog: newGainLog }
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export default class SwTorActorSheet extends BaseActorSheet {
  constructor(...args) {
    super(...args)

    new SheetWithTabs(this)

    if (this.isEditable) {
      new SheetWithIncomingDamage(this, { autoSubmit: this.autoSubmit })

      this.autoSubmit.addFilter('data.attributes.*.gp', this._processDeltaProperty)
      this.autoSubmit.addFilter('data.attributes.*.buff', this._processDeltaProperty)

      this.autoSubmit.addFilter('input.totalXp', (obj, { name }) => {
        const newVal = Math.round(processDeltaValue(obj[name], this.actor.xp.total))
        return {
          'data.xp.gained': newVal - this.actor.xpFromGp - this.actor.xp.granted
        }
      })

      if (this.actor.hasGenerator) {
        this.autoSubmit.addFilter('data.generator.*', updateData => {
          CharacterGenerator.generate(this.actor, updateData)
          return {}
        })
      }
    }
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
      submitOnChange: true,
      width: 784,
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

    const skills = [...this.actor.skills.list]
    const forceSkills = this.actor.forceSkills.list
    data.computed = {
      skillCategories: [
        ...this.actor.dataSet.skillCategories.list.map(cat => ({
          label: cat.label,
          skills: ArrayUtils.removeBy(skills, skill => skill.category === cat.key),
        })),
        { label: 'Mächte', skills: ArrayUtils.removeBy(skills, skill => skill.isForceSkill) },
        { label: 'Sonstige', skills: skills },
      ],
      forceSkills: forceSkills.length > 0 ? forceSkills : null,
      slots: this.actor.dataSet.slots.layout.map(row => row.map(slot => {
        if (slot == null) {
          return null
        } else {
          return this._formatSlot(slot)
        }
      })),
      inventory: this.actor.dataSet.itemTypes.list.map(type => ({
        ...type,
        items: this.actor.inventory.filter(item => item.type === type.key)
      })),
    }
    data.ui = {
      inventoryHidden: this._inventoryHidden,
    }
    if (this.actor.hasGenerator) {
      data.generator = CharacterGenerator.getChoices(this.actor)
      let trainingIndex = 0
      data.generator.chosenTrainings = CharacterGenerator.trainingSlots.reduce((obj, cur) => {
        obj[cur.key] = this.actor.trainings[trainingIndex++]
        return obj
      }, {})
      data.generator.trainingSlots = CharacterGenerator.trainingSlots
    }

    data.actor = this.actor
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    html.find('.gp-to-xp').click(this._onGpToXp)
    html.find('.xp-to-gp').click(this._onXpToGp)
    html.find('button.change-attr-gained').click(this._onChangeAttrGained)
    html.find('button.change-skill-gained').click(this._onChangeSkillGained)
    html.find('button.change-metric-gained').click(this._onChangeMetricGained)
    html.find('.apply-force-skill').click(this._onApplyForceSkill)
    html.find('.skill-sort-order').click(this._onMoveSkill)
    html.find('.generate').click(this._onGenerate)
    html.find('.generate-reset').click(this._onGenerateReset)
  }

  async _renderInner(...args) {
	  // Fix for a bug where the pop-out charsheet would be rendered before the templates have been loaded
    // => make sure that they're loaded before attempting to render the window content
	  await fullLoadPromise()
	  return super._renderInner(...args)
  }

  // ---------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------

  _onGpToXp = () => {
    if (this.actor.gp.value > 0) {
      this.actor.update({ 'data.xp.gp': (this.actor.xp.gp || 0) + 1 })
    }
  }

  _onXpToGp = () => {
    const gp = this.actor.xp.gp
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': gp - 1 })
    }
  }

  _onChangeAttrGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-attr')
    const defaultXpCategory = this.actor.dataSet.attributes.map[key].effectiveXpCategory
    const attribute = this.actor.attributes[key]

    const { xp, gainLog } = calcGainChange(this.actor, attribute, { action, defaultXpCategory })
    this.actor.update({
      [`data.attributes.${key}.gained`]: gainLog,
      [`data.attributes.${key}.xp`]: xp,
      [`data.attributes.${key}.xpCategory`]: null,  // Reset XP category after every change
    })
  }

  _onChangeSkillGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-skill')
    const skill = this.actor.skills[key]

    let go = true
    if (action === 'grant' && !game.user.isGM) {
      if (!confirm(`Hat dir der GM einen ${skill.name}-Punkt zugestanden?`)) {
        go = false
      }
    }

    if (go) {
      const { gainLog } = calcGainChange(this.actor, skill, { action })

      skill.update({
        'data.gained': gainLog,
        'data.tmpXpCategory': null, // Reset after every skill point
      })
    }
  }

  _onChangeMetricGained = event => {
    const action = event.currentTarget.getAttribute('data-action')
    const key = event.currentTarget.getAttribute('data-metric')
    const defaultXpCategory = this.actor.dataSet.metrics.map[key].effectiveXpCategory
    const metric = this.actor.metrics[key]

    const { xp, gainLog } = calcGainChange(this.actor, metric, { action, defaultXpCategory })
    this.actor.update({
      [`data.metrics.${key}.gained`]: gainLog,
      [`data.metrics.${key}.xp`]: xp,
      [`data.metrics.${key}.xpCategory`]: null,  // Reset XP category after every change
    })
  }

  _onApplyForceSkill = async event => {
    const skill = this.actor.getOwnedItem(event.currentTarget.getAttribute('data-id'))
    if (skill != null) {
      await skill.apply()
    }
  }

  _onMoveSkill = async event => {
    const direction = event.currentTarget.getAttribute('data-order')
    const type = event.currentTarget.getAttribute('data-type')
    const category = event.currentTarget.getAttribute('data-category')
    const id = event.currentTarget.getAttribute('data-id')
    const skillsOfType = this.actor.skills.list.filter(skill => skill.type === type && (!category || skill.category === category))
    const index = skillsOfType.findIndex(skill => skill.id === id)
    if (index !== -1) {
      const skill = skillsOfType[index]
      const reference = skillsOfType[index + (direction === 'up' ? -1 : 1)]
      if (reference != null) {
        await this.actor.updateManyEmbeddedEntities('OwnedItem', [
          { _id: skill.id, sort: reference.data.sort },
          { _id: reference.id, sort: skill.data.sort },
        ])
      }
    }
  }

  _onGenerate = () => {
	  return CharacterGenerator.generate(this.actor)
  }

  _onGenerateReset = async () => {
	  await this.actor.update({ 'data.generator.seed': null })
    return this._onGenerate()
  }
}
