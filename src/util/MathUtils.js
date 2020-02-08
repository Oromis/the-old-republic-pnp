export function roundDecimal(val, places) {
  return Math.round(val * (10 ** places)) / (10 ** places)
}

export function clamp(val, { min = 0, max = 1 } = {}) {
  return Math.max(min, Math.min(val, max))
}
