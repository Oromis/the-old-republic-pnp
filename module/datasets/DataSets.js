import HumanoidAttributes from './HumanoidAttributes.js'
import HumanoidMetrics from './HumanoidMetrics.js'
import HumanoidActor from '../actor/HumanoidActor.js'
import ResistanceTypes from './ResistanceTypes.js'
import HumanoidSpecies from './HumanoidSpecies.js'
import XpTable from './XpTable.js'
import Skill from '../item/Skill.js'
import SkillCategories from './SkillCategories.js'
import ForceSkill from '../item/ForceSkill.js'
import RangeTypes from './RangeTypes.js'
import DurationTypes from './DurationTypes.js'
import EffectModifiers from './EffectModifiers.js'
import ForceDispositions from './ForceDispositions.js'
import ActorTypes from './ActorTypes.js'
import OwnedSkill from '../item/OwnedSkill.js'
import OwnedForceSkill from '../item/OwnedForceSkill.js'
import { validObjectsFilter } from '../util/ObjectUtils.js'
import ItemTypes from '../ItemTypes.js'
import PhysicalItem from '../item/PhysicalItem.js'
import Weapon from '../item/Weapon.js'
import RangedWeapon from '../item/RangedWeapon.js'
import DamageTypes from '../DamageTypes.js'
import SlotTypes from '../SlotTypes.js'
import ItemWithEffects from '../item/ItemWithEffects.js'
import Wearable from '../item/Wearable.js'

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
      skillCategories: SkillCategories,
    }
  },

  fromItemType(type, { owned } = {}) {
    switch (type) {
      case 'skill':
        return {
          delegates: [Skill, owned && OwnedSkill].filter(validObjectsFilter),
          actorTypes: ActorTypes,
        }

      case 'force-skill':
        return {
          delegates: [
            Skill,
            owned && OwnedSkill,
            ForceSkill,
            owned && OwnedForceSkill,
          ].filter(validObjectsFilter),
          actorTypes: ActorTypes,
          rangeTypes: RangeTypes,
          durationTypes: DurationTypes,
          effectModifiers: EffectModifiers,
          dispositions: ForceDispositions,
        }

      case 'training':
        return {
          delegates: [
            ItemWithEffects,
          ],
        }

      default:
        // Regular inventory item
        const itemType = ItemTypes.map[type] || ItemTypes.map[ItemTypes.default]
        return {
          delegates: [
            PhysicalItem,
            itemType.isWeapon && Weapon,
            itemType.isRangedWeapon && RangedWeapon,
            itemType.isWearable && Wearable,
            itemType.hasEffects && ItemWithEffects,
          ].filter(validObjectsFilter),
          itemTypes: ItemTypes,
          damageTypes: DamageTypes,
          slotTypes: SlotTypes,
        }
    }
  }
})
