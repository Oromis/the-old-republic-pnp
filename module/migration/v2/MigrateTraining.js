import {resolveEffectLabel} from "../../SheetUtils.js"

export function migrateTraining(item, updateData) {
  const mods = item.data.mods
  if (mods != null) {
    const newEffects = []
    for (const key of Object.keys(mods)) {
      newEffects.push({
        key,
        label: resolveEffectLabel(key),
        value: mods[key],
      })
    }
    updateData['data.effects'] = [...(updateData['data.effects'] || []), ...newEffects]
    updateData['data.-=mods'] = null
  }

  const baseTraining = item.data.baseTraining
  if(baseTraining != null) {
    let baseTrainingUpdate = {}
    migrateTraining(baseTraining, baseTrainingUpdate)
    if ( !isObjectEmpty(baseTrainingUpdate) ) {
      updateData['data.baseTraining'] = mergeObject(baseTraining, baseTrainingUpdate, {enforceTypes: false, inplace: false})
    }
  }
}
