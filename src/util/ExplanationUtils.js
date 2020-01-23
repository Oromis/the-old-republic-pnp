export default Object.freeze({
  add(explanation, { label, value }) {
    if (typeof value === 'number' && value !== 0) {
      explanation.total += value
      explanation.components.push({ label, value })
    }
  },

  join(explanation, other) {
    explanation.total += other.total
    explanation.components.push(...other.components)
  }
})
