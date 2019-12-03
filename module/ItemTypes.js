const list = [
  { key: 'melee-weapon', label: 'Nahkampf' },
  { key: 'ranged-weapon', label: 'Fernkampf' },
  { key: 'wearable', label: 'Anziehbar' },
  { key: 'consumable', label: 'Verbrauchsgegenstand' },
  { key: 'other', label: 'Sonstiges' },
]

export default Object.freeze({
  list,
  map: list.reduce((acc, cur) => {
    acc[cur.key] = cur
    return acc
  }, {})
})
