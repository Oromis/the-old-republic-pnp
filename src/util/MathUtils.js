export function roundDecimal(val, places) {
  return Math.round(val * (10 ** places)) / (10 ** places)
}

export function clamp(val, { min = 0, max = 1 } = {}) {
  return Math.max(min, Math.min(val, max))
}

const globalClamp = clamp

export function lerp(val, { minX = 0, maxX = 1, minY = 0, maxY = 1, clamp = false } = {}) {
  const intermediate = (val - minX) / (maxX - minX)
  const interpolated = minY + (intermediate * (maxY - minY))
  if (clamp) {
    return globalClamp(interpolated, { min: minY, max: maxY })
  } else {
    return interpolated
  }
}

export function isInRange(low, val, high, { inclusive = true } = {}) {
  if (inclusive) {
    return val >= low && val <= high
  } else {
    return val > low && val < high
  }
}
