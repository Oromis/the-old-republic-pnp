import ObjectUtils from '../../util/ObjectUtils.js'

export function migrateEffects(item, updateData) {
  const effects = item.data && item.data.effects
  if (effects != null && Array.isArray(effects)) {
    updateData['data.effects'] = effects.map(effect => {
      if (typeof effect.value !== 'object') {
        const bonus = +effect.value
        const result = ObjectUtils.cloneDeep(effect)

        let valueWritten = false
        if (item.type === 'training') {
          const skill = game.items.entities.find(entity => entity.key === effect.key && (entity.type || '').indexOf('skill') !== -1)
          if (skill != null) {
            result.value = { xp: skill.actorDataSet.xpTable.getUpgradeCost({
              category: skill.xpCategory,
              from: 5,
              to: 5 + bonus,
            }) }
            if (!skill.isBasicSkill) {
              result.value.activationPaid = true
            }
            valueWritten = true
          }
        }

        if (!valueWritten) {
          result.value = { bonus }
        }
        return result
      } else {
        return effect
      }
    })
  }
}
