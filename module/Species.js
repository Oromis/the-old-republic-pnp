import ObjectUtils from './ObjectUtils.js'

const list = [
  {
    key: 'mens',
    name: 'Mensch',
    gp: 0,
    mods: {},
  },
  {
    key: 'brgn',
    name: 'Baragwin',
    gp: 6,
    mods: {
      kl: 10,
      kk: 5,
      sc: -10,
      waf: 10,
    },
  },
  {
    key: 'btnr',
    name: 'Bothaner',
    gp: 1,
    mods: {
      ge: 10,
      ko: -10,
      wge: 10,
    },
  },
  {
    key: 'crnr',
    name: 'Cereaner',
    gp: 11,
    mods: {
      ge: -10,
      in: 10,
      kl: 10,
      ini: 2,
    },
  },
  {
    key: 'dros',
    name: 'Duros',
    gp: 3,
    mods: {
      ge: 10,
      kl: 10,
      ko: -10,
      kk: -10,
      mec: 5,
      pil: 5,
    },
  },
  {
    key: 'gmrr',
    name: 'Gamorreaner',
    gp: 0,
    mods: {
      ch: -10,
      ge: -10,
      kl: -20,
      ko: 10,
      kk: 10,
      har: 10,
      lkl: 10,
      sta: 5,
    },
  },
  {
    key: 'htte',
    name: 'Hutte',
    gp: 0,
    mods: {
      ch: -10,
      ge: -30,
      kl: 10,
      ko: 10,
      sc: -10,
      wk: 20,
      lep: 50,
      rtg: 3,
    },
  },
  {
    key: 'itho',
    name: 'Ithorianer',
    gp: 3,
    mods: {
      ch: 5,
      ge: -15,
      kl: 10,
      sc: -10,
      wk: 10,
      üle: 15,
    },
  },
  {
    key: 'keld',
    name: 'Kel\'Dor',
    gp: 17,
    mods: {
      ge: 10,
      kl: 10,
      ko: -10,
      kk: 5,
      ath: 5,
    },
  },
  {
    key: 'monc',
    name: 'Mon Calamari',
    gp: 3,
    mods: {
      kl: 10,
      kk: -10,
      sba: 10,
    },
  },
  {
    key: 'rodi',
    name: 'Rodianer',
    gp: 2,
    mods: {
      ch: -10,
      ge: 10,
      kl: -5,
      kk: -5,
      sc: 5,
      sle: 10,
      har: 10,
      sin: 10,
    },
  },
  {
    key: 'sull',
    name: 'Sullustaner',
    gp: 7,
    mods: {
      ge: 10,
      ko: -10,
      sin: 10,
      pil: 5,
    },
  },
  {
    key: 'tran',
    name: 'Trandoshaner',
    gp: 3,
    mods: {
      ge: -10,
      kk: 10,
      rtg: 1,
    },
  },
  {
    key: 'togr',
    name: 'Togruta',
    gp: 2,
    mods: {
      nav: 10,
      ens: 10,
    },
  },
  {
    key: 'toyd',
    name: 'Toydarianer',
    gp: 7,
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
    mods: {
      ch: 10,
      wk: -10,
      r_gif: 0.5,
    },
  },
  {
    key: 'verp',
    name: 'Verpine',
    gp: 18,
    mods: {
      kl: 10,
      rtg: 1,
      mec: 15,
      waf: 15,
    },
  },
  {
    key: 'wook',
    name: 'Wookie',
    gp: 0,
    mods: {
      ch: -10,
      ge: -10,
      kl: -10,
      kk: 20,
      ens: 20,
    },
  },
  {
    key: 'zabr',
    name: 'Zabrak',
    gp: 22,
    mods: {
      kk: 10,
      wk: 10,
      ath: 10,
      har: 10,
    },
  },
]

const map = ObjectUtils.asObject(list, 'key')

export default Object.freeze({ list, map, default: 'mens' })
