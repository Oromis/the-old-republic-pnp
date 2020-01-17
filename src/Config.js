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
  LeP: {
    xpCategory: 'H',
  },
  MaP: {
    xpCategory: 'G',
  },
  AuP: {
    xpCategory: 'E',
  },
}

export default Object.freeze({
  system,
  character,
  energy: {
    wrongModeEfficiency: 0.25,
  },
  combat: {
    criticalBonus: 50,
    defenseEffectivenessPenalty: {
      melee: 20,
      ranged: 10,
    }
  }
})
