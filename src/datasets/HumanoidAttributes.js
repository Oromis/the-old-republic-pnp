import Config from '../Config.js'
import ObjectUtils from '../util/ObjectUtils.js'
import {calcUpgradeCost} from '../CharacterFormulas.js'
import AttributePrototype from '../properties/AttributePrototype.js'
import Attribute from './Attribute.js'

class HumanoidAttribute extends Attribute {
  get upgradeCost() {
    return calcUpgradeCost(this._entity, this, { max: this._entity.xp.free })
  }

  get currentXpCategory() {
    return this.xpCategory || this.effectiveXpCategory
  }

  get effectiveXpCategory() {
    return this.entity.dataSet.xpTable.modifyCategory(
      this._staticData.xpCategory,
      this.entity.modifiers[this.key].xpCategoryBonus
    )
  }
}

class HumanoidAttributePrototype extends AttributePrototype {
  constructor(key, staticData) {
    super(key, {
      staticData: { xpCategory: Config.character.attributes.xpCategory, ...staticData },
      template: {
        xp: 0,
        gp: 0,
        gained: [],
        buff: 0,
      },
      PropertyClass: HumanoidAttribute,
    })
  }
}

const list = [
  new HumanoidAttributePrototype('ch', {
    label: 'Charisma',
    desc: 'Repräsentiert die persönliche Ausstrahlung, Redegewandtheit und Führungsqualitäten, die Fähigkeit, die eigene Stimme, Gestik und Mimik überzeugend einzusetzen; auch die Stärke der Verbindung zur Macht',
    encumberanceFactor: 2,
  }),
  new HumanoidAttributePrototype('ge', {
    label: 'Geschicklichkeit',
    desc: 'Allgemeine körperliche Beweglichkeit und Koordination, schnelle Reaktionen und Reflexe, eine gute Einschätzung der eigenen Armreichweite, Sprungkraft, geschmeidige und kontrollierte Bewegungen',
    encumberanceFactor: 15,
  }),
  new HumanoidAttributePrototype('in', {
    label: 'Intuition',
    desc: 'Die Fähigkeit, richtige Entscheidungen zu treffen, ohne lange zu überlegen. Schnelle Einschätzung von Personen und Situationen, gutes Einfühlvermögen.',
    encumberanceFactor: 2,
  }),
  new HumanoidAttributePrototype('kk', {
    label: 'Körperkraft',
    desc: 'Steht für das Vorhandensein von schierer Muskelkraft, vor allem aber die Fähigkeit, sie planvoll einzusetzen, zusammen mit der Konstitution auch ein Maß für die allgemeine Gesundheit',
    encumberanceFactor: 8,
  }),
  new HumanoidAttributePrototype('kl', {
    label: 'Klugheit',
    desc: 'Intelligenz und logisches Denkvermögen, die Fähigkeit, eine Situation Stück für Stück zu analysieren und daraus Schlüsse zu ziehen sowie das schnelle Erkennen von Zusammenhängen. Auch angesammeltes Wissen und gutes Gedächtnis',
    encumberanceFactor: 1.75,
  }),
  new HumanoidAttributePrototype('ko', {
    label: 'Konstitution',
    desc: 'Steht für die körperliche Verfassung, Ausdauer und Standfestigkeit. Auch beim Widerstand gegen Drogen und Gifte hilfreich',
    encumberanceFactor: 8,
  }),
  new HumanoidAttributePrototype('sc', {
    label: 'Schnelligkeit',
    desc: 'Die körperliche Bewegungsgeschwindigkeit und Reaktionszeit',
    encumberanceFactor: 15,
  }),
  new HumanoidAttributePrototype('wk', {
    label: 'Willenskraft',
    desc: 'Maß für die geistige Stärke und Widerstandsfähigkeit. Beeinflusst Konzentration und ist daher für Machtbenutzer wichtig',
    encumberanceFactor: 5,
  })
]

const map = ObjectUtils.asObject(list, 'key')
export default Object.freeze({ list, map })
