import Config from '../Config.js'
import ObjectUtils from '../util/ObjectUtils.js'
import MetricPrototype from '../properties/MetricPrototype.js'

const LeP = new MetricPrototype('LeP', {
  label: 'Lebenspunkte',
  desc: 'Repräsentiert den körperlichen Gesundheitszustand',
  backgroundColor: '#ffaaaa',
  regen: {
    day() { return this.calcBaseValue({ target: 'max' }) / 4 },
  },
  calcBaseValue(actor) {
    return Math.round(
      actor.attrValue('ko', { prop: 'permanentValue' }) * 2 +
      actor.attrValue('kk', { prop: 'permanentValue' })
    )
  }
})
const AuP = new MetricPrototype('AuP', {
  label: 'Ausdauerpunkte',
  desc: 'Misst den körperlichen und geistigen Erschöpfungsgrad',
  xpCategory: Config.character.AuP.xpCategory,
  backgroundColor: '#aaffaa',
  regen: {
    day: 'missing',
    turn: 1,
  },
  calcBaseValue(actor) {
    return Math.round(
      actor.attrValue('ko', { prop: 'permanentValue' }) +
      actor.attrValue('kk', { prop: 'permanentValue' }) +
      actor.attrValue('wk', { prop: 'permanentValue' })
    )
  }
})

const list = [LeP, AuP]
export default Object.freeze({ list, map: ObjectUtils.asObject(list, 'key') })
