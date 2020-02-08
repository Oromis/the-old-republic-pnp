import ObjectUtils from '../util/ObjectUtils.js'
import XpTable from './XpTable.js'

function skillXp({ category, points, isBasic = false }) {
  return { xp: XpTable.getUpgradeCost({ category, to: points }) }
}

const list = [
  {
    key: 'mens',
    name: 'Mensch',
    gp: 0,
    weight: 25,
    mods: {},
  },
  {
    key: 'brgn',
    name: 'Baragwin',
    gp: 6,
    weight: 2,
    mods: {
      kl: 10,
      kk: 5,
      sc: -10,
      waf: skillXp({ category: 'C', to: 10 }),
    },
  },
  {
    key: 'btnr',
    name: 'Bothaner',
    gp: 1,
    weight: 8,
    mods: {
      ge: 10,
      ko: -10,
      wge: skillXp({ category: 'C', to: 10 }),
    },
  },
  {
    key: 'crnr',
    name: 'Cereaner',
    gp: 11,
    weight: 6,
    mods: {
      ge: -10,
      in: 10,
      kl: 10,
      InI: 2,
    },
  },
  {
    key: 'dros',
    name: 'Duros',
    gp: 3,
    weight: 5,
    mods: {
      ge: 10,
      kl: 10,
      ko: -10,
      kk: -10,
      mec: skillXp({ category: 'C', to: 5 }),
      pil: skillXp({ category: 'D', to: 5 }),
    },
  },
  {
    key: 'gmrr',
    name: 'Gamorreaner',
    gp: 0,
    weight: 4,
    mods: {
      ch: -10,
      ge: -10,
      kl: -20,
      ko: 10,
      kk: 10,
      har: skillXp({ category: 'D', to: 10 }),
      lkl: skillXp({ category: 'E', to: 10 }),
      sta: skillXp({ category: 'D', to: 5 }),
    },
  },
  {
    key: 'htte',
    name: 'Hutte',
    gp: 0,
    weight: 1,
    mods: {
      ch: -10,
      ge: -30,
      kl: 10,
      ko: 10,
      sc: -10,
      wk: 20,
      LeP: 50,
      r_armor: 3,
    },
  },
  {
    key: 'itho',
    name: 'Ithorianer',
    gp: 3,
    weight: 2,
    mods: {
      ch: 5,
      ge: -15,
      kl: 10,
      sc: -10,
      wk: 10,
      üle: skillXp({ category: 'B', to: 15 }),
    },
  },
  {
    key: 'keld',
    name: 'Kel\'Dor',
    gp: 17,
    weight: 7,
    mods: {
      ge: 10,
      kl: 10,
      ko: -10,
      kk: 5,
      ath: skillXp({ category: 'D', to: 5 }),
    },
  },
  {
    key: 'monc',
    name: 'Mon Calamari',
    gp: 3,
    weight: 3,
    mods: {
      kl: 10,
      kk: -10,
      sba: skillXp({ category: 'C', to: 10 }),
    },
  },
  {
    key: 'rodi',
    name: 'Rodianer',
    gp: 2,
    weight: 8,
    mods: {
      ch: -10,
      ge: 10,
      kl: -5,
      kk: -5,
      sc: 5,
      sle: skillXp({ category: 'D', to: 10 }),
      har: skillXp({ category: 'D', to: 10 }),
      sin: skillXp({ category: 'D', to: 10 }),
    },
  },
  {
    key: 'sull',
    name: 'Sullustaner',
    gp: 7,
    weight: 3,
    mods: {
      ge: 10,
      ko: -10,
      sin: skillXp({ category: 'D', to: 10 }),
      pil: skillXp({ category: 'D', to: 5 }),
    },
  },
  {
    key: 'tran',
    name: 'Trandoshaner',
    gp: 3,
    weight: 5,
    mods: {
      ge: -10,
      kk: 10,
      r_armor: 1,
    },
  },
  {
    key: 'togr',
    name: 'Togruta',
    gp: 2,
    weight: 8,
    mods: {
      nav: skillXp({ category: 'C', to: 10 }),
      ens: skillXp({ category: 'B', to: 10 }),
    },
  },
  {
    key: 'toyd',
    name: 'Toydarianer',
    gp: 7,
    weight: 2,
    mods: {
      ch: 5,
      kl: 10,
      ko: -10,
      kk: -10,
      wk: 10,
      r_mac: 0.75,
    },
  },
  {
    key: 'twil',
    name: 'Twi\'lek',
    gp: 3,
    weight: 8,
    mods: {
      ch: 10,
      wk: -10,
      r_poison: 0.5,
    },
  },
  {
    key: 'verp',
    name: 'Verpine',
    gp: 18,
    weight: 2,
    mods: {
      kl: 10,
      r_armor: 1,
      mec: skillXp({ category: 'C', to: 15 }),
      waf: skillXp({ category: 'C', to: 15 }),
    },
  },
  {
    key: 'wook',
    name: 'Wookie',
    gp: 0,
    weight: 5,
    mods: {
      ch: -10,
      ge: -10,
      kl: -10,
      kk: 20,
      ens: skillXp({ category: 'B', to: 20 }),
    },
  },
  {
    key: 'zabr',
    name: 'Zabrak',
    gp: 22,
    weight: 5,
    mods: {
      kk: 10,
      wk: 10,
      ath: skillXp({ category: 'D', to: 10 }),
      har: skillXp({ category: 'D', to: 10 }),
    },
  },
]

const map = ObjectUtils.asObject(list, 'key')

export default Object.freeze({ list, map, default: 'mens' })
