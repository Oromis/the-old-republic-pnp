export function formatMod(val) {
  return (+val) > 0 ? `+${val}` : val
}

export function formatEffectValue(value) {
  const parts = []
  if (value.bonus) {
    parts.push(formatMod(value.bonus))
  }
  if (value.xp) {
    parts.push(`${value.xp} XP`)
  }
  if (value.xpCategoryBonus) {
    parts.push(`Lernen ${Math.abs(value.xpCategoryBonus)} Kategorie${Math.abs(value.xpCategoryBonus) > 1 ? 'n' : ''} ` +
      `${value.xpCategoryBonus > 0 ? 'billiger' : 'teurer'}`)
  }
  return parts.join(', ')
}
