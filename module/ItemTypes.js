const list = [
  { key: 'melee-weapon', label: 'Nahkampf', isWeapon: true, isMeleeWeapon: true, isEquippable: true, hasEffects: true },
  { key: 'ranged-weapon', label: 'Fernkampf', isWeapon: true, isRangedWeapon: true, isEquippable: true, hasEffects: true },
  { key: 'wearable', label: 'Anziehbar', isEquippable: true, hasEffects: true, isWearable: true },
  { key: 'consumable', label: 'Verbrauchsgegenstand', hasEffects: true },
  { key: 'other', label: 'Sonstiges' },
]

export default Object.freeze({
  list,
  map: list.reduce((acc, cur) => {
    acc[cur.key] = cur
    return acc
  }, {})
})
