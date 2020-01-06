export function formatMod(val) {
  return val > 0 ? `+${val}` : val
}

export function formatEffectValue(value) {
  const parts = []
  if (value.bonus) {
    parts.push(formatMod(value.bonus))
  }
  if (value.xp) {
    parts.push(`${value.xp} XP`)
  }
  return parts.join(', ')
}
