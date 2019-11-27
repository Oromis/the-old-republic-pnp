const list = [
  { key: 'melee', label: 'Nahkampf' },
  { key: 'ranged', label: 'Fernkampf' },
  { key: 'physical', label: 'Körperlich' },
  { key: 'crafting', label: 'Handwerk' },
  { key: 'social', label: 'Sozial' },
]

export default Object.freeze({
  list,
  map: list.reduce((acc, cur) => {
    acc[cur.key] = cur
    return acc
  }, {})
})
