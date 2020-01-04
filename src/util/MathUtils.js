export function roundDecimal(val, places) {
  return Math.round(val * (10 ** places)) / (10 ** places)
}

export default {
  roundDecimal,
}
