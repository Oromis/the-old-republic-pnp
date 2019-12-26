import HumanoidAttributes from './HumanoidAttributes.js'
import HumanoidMetrics from './HumanoidMetrics.js'
import HumanoidActor from '../actor/HumanoidActor.js'
import ResistanceTypes from './ResistanceTypes.js'
import HumanoidSpecies from './HumanoidSpecies.js'
import XpTable from '../XpTable.js'
import RegularSkill from '../item/RegularSkill.js'
import SkillCategories from './SkillCategories.js'

export default Object.freeze({
  fromActorType(type) {
    // TODO return different data sets for droids, ships, ...
    return {
      delegate: HumanoidActor,
      attributes: HumanoidAttributes,
      metrics: HumanoidMetrics,
      species: HumanoidSpecies,
      resistances: ResistanceTypes,
      xpTable: XpTable,
    }
  },

  fromItemType(type) {
    switch (type) {
      case 'skill':
        return {
          delegate: RegularSkill,
          categories: SkillCategories,
        }

      default:
        // Regular inventory item
        return {}
    }
  }
})
