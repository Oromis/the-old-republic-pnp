import HumanoidAttributes from './HumanoidAttributes.js'
import HumanoidMetrics from './HumanoidMetrics.js'
import HumanoidActor from '../actor/HumanoidActor.js'
import ResistanceTypes from './ResistanceTypes.js'
import HumanoidSpecies from './HumanoidSpecies.js'
import XpTable from '../XpTable.js'
import Skill from '../item/Skill.js'
import SkillCategories from './SkillCategories.js'
import ForceSkill from '../item/ForceSkill.js'
import RangeTypes from '../RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import EffectModifiers from '../EffectModifiers.js'
import ForceDispositions from '../ForceDispositions.js'

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
          delegate: Skill,
          categories: SkillCategories,
        }

      case 'force-skill':
        return {
          delegates: [
            Skill,
            ForceSkill,
          ],
          categories: SkillCategories,
          rangeTypes: RangeTypes,
          durationTypes: DurationTypes,
          effectModifiers: EffectModifiers,
          dispositions: ForceDispositions,
        }

      default:
        // Regular inventory item
        return {}
    }
  }
})
