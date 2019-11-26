const system = {
  title: 'Star Wars: The old Republic PnP',
}

const character = {
  initialGp: 500,
  gpToXpRate: 50,
  attributes: {
    xpCategory: 'H',
    gp: {
      min: 25,
      max: 65,
    }
  },
  healthPoints: {
    xpCategory: 'H',
  },
  forcePoints: {
    xpCategory: 'G',
  },
  staminaPoints: {
    xpCategory: 'E',
  },
}

export default Object.freeze({
  system,
  character,
})
