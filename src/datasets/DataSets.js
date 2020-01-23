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
import { isObject } from '../util/ObjectUtils.js'
import ItemTypes from '../ItemTypes.js'
import PhysicalItem from '../item/PhysicalItem.js'
import Weapon from '../item/Weapon.js'
import RangedWeapon from '../item/RangedWeapon.js'
import DamageTypes from '../DamageTypes.js'
import SlotTypes from '../SlotTypes.js'
import ItemWithEffects from '../item/ItemWithEffects.js'
import WearableItem from '../item/WearableItem.js'
import Training from '../item/Training.js'
import CharacterDispositions from './CharacterDispositions.js'
import HumanoidSlots from './HumanoidSlots.js'
import EquippableItem from '../item/EquippableItem.js'
import OwnedWeapon from '../item/OwnedWeapon.js'
import OwnedEquippableItem from '../item/OwnedEquippableItem.js'
import OwnedRangedWeapon from '../item/OwnedRangedWeapon.js'
import OwnedMeleeWeapon from '../item/OwnedMeleeWeapon.js'
import InnateAbility from '../item/InnateAbility.js'
import SpecialAbility from '../item/SpecialAbility.js'
import CombatAction from '../item/CombatAction.js'
import ActiveEffect from '../item/ActiveEffect.js'

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
      itemTypes: ItemTypes,
      damageTypes: DamageTypes,
      slots: HumanoidSlots,
    }
  },

  fromItemType(type, { owned } = {}) {
    switch (type) {
      case 'skill':
        return {
          delegates: [Skill, owned && OwnedSkill].filter(isObject),
          actorTypes: ActorTypes,
        }

      case 'force-skill':
        return {
          delegates: [
            Skill,
            owned && OwnedSkill,
            ForceSkill,
            owned && OwnedForceSkill,
          ].filter(isObject),
          actorTypes: ActorTypes,
          rangeTypes: RangeTypes,
          durationTypes: DurationTypes,
          effectModifiers: EffectModifiers,
          dispositions: ForceDispositions,
        }

      case 'training':
        return {
          delegates: [
            Training,
            ItemWithEffects,
          ],
          characterDispositions: CharacterDispositions,
        }

      case 'innate-ability':
        return {
          delegates: [
            InnateAbility,
            ItemWithEffects,
          ],
        }

      case 'special-ability':
        return {
          delegates: [
            SpecialAbility,
            ItemWithEffects,
          ],
        }

      case 'combat-action':
        return {
          delegates: [
            CombatAction
          ]
        }

      case 'active-effect':
        return {
          delegates: [
            ActiveEffect,
          ]
        }

      default:
        // Regular inventory item
        const itemType = ItemTypes.map[type] || ItemTypes.map[ItemTypes.default]
        return {
          delegates: [
            PhysicalItem,
            itemType.isWeapon && Weapon,
            itemType.isWeapon && owned && OwnedWeapon,
            itemType.isRangedWeapon && RangedWeapon,
            itemType.isRangedWeapon && owned && OwnedRangedWeapon,
            itemType.isMeleeWeapon && owned && OwnedMeleeWeapon,
            itemType.isWearable && WearableItem,
            itemType.isEquippable && EquippableItem,
            itemType.isEquippable && owned && OwnedEquippableItem,
            itemType.hasEffects && ItemWithEffects,
          ].filter(isObject),
          itemTypes: ItemTypes,
          damageTypes: DamageTypes,
          slotTypes: SlotTypes,
        }
    }
  }
})
