import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'
import {attrValue} from './Attributes.js'

const list = [
  {
    key: 'LeP',
    label: 'Lebenspunkte',
    desc: 'Repräsentiert den körperlichen Gesundheitszustand',
    xpCategory: Config.character.LeP.xpCategory,
    backgroundColor: '#ffaaaa',
    calcBaseValue(actor) {
      return Math.round((attrValue(actor, 'ko') * 2 + attrValue(actor, 'kk')) / 3)
    }
  },
  {
    key: 'AuP',
    label: 'Ausdauerpunkte',
    desc: 'Misst den körperlichen und geistigen Erschöpfungsgrad',
    xpCategory: Config.character.AuP.xpCategory,
    backgroundColor: '#aaffaa',
    calcBaseValue(actor) {
      return Math.round((attrValue(actor, 'ko') + attrValue(actor, 'kk') + attrValue(actor, 'wi')) * 0.66)
    }
  },
  {
    key: 'MaP',
    label: 'Machtpunkte',
    desc: 'Ein Maß für die Menge an Macht-Kräften, die zur Verfügung stehen',
    xpCategory: Config.character.MaP.xpCategory,
    backgroundColor: '#e3caff',
    calcBaseValue(actor) {
      return Math.round((attrValue(actor, 'ch') + attrValue(actor, 'in') + attrValue(actor, 'kl') + attrValue(actor, 'wk')) / 2)
    }
  },
  {
    key: 'EnP',
    label: 'Energiepunkte',
    desc: 'Steht für den Ladezustand der Akkus',
    backgroundColor: '#c7d6ff',
    calcBaseValue() {
      return 0 // Energy is only governed by equipment
    }
  },
]

// list.forEach(attr => {})

const map = ObjectUtils.asObject(list, 'key')

export default Object.freeze({ list, map })
