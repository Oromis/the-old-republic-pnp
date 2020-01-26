export default {
  async addEffect(token, effect) {
    if (token.data.effects == null || !token.data.effects.includes(effect)) {
      return token.toggleEffect(effect)
    }
  },

  async removeEffect(token, effect) {
    if (token.data.effects != null && token.data.effects.includes(effect)) {
      return token.toggleEffect(effect)
    }
  },
}
