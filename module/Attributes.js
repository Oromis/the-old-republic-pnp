import Config from './Config.js'
import ObjectUtils from './ObjectUtils.js'

const list = [
  {
    key: 'ch',
    label: 'Charisma',
    desc: 'Repräsentiert die persönliche Ausstrahlung, Redegewandtheit und Führungsqualitäten, die Fähigkeit, die eigene Stimme, Gestik und Mimik überzeugend einzusetzen; auch die Stärke der Verbindung zur Macht',
  },
  {
    key: 'ge',
    label: 'Geschicklichkeit',
    desc: 'Allgemeine körperliche Beweglichkeit und Koordination, schnelle Reaktionen und Reflexe, eine gute Einschätzung der eigenen Armreichweite, Sprungkraft, geschmeidige und kontrollierte Bewegungen',
  },
  {
    key: 'in',
    label: 'Intuition',
    desc: 'Die Fähigkeit, richtige Entscheidungen zu treffen, ohne lange zu überlegen. Schnelle Einschätzung von Personen und Situationen, gutes Einfühlvermögen.',
  },
  {
    key: 'kk',
    label: 'Körperkraft',
    desc: 'Steht für das Vorhandensein von schierer Muskelkraft, vor allem aber die Fähigkeit, sie planvoll einzusetzen, zusammen mit der Konstitution auch ein Maß für die allgemeine Gesundheit',
  },
  {
    key: 'kl',
    label: 'Klugheit',
    desc: 'Intelligenz und logisches Denkvermögen, die Fähigkeit, eine Situation Stück für Stück zu analysieren und daraus Schlüsse zu ziehen sowie das schnelle Erkennen von Zusammenhängen. Auch angesammeltes Wissen und gutes Gedächtnis',
  },
  {
    key: 'ko',
    label: 'Konstitution',
    desc: 'Steht für die körperliche Verfassung, Ausdauer und Standfestigkeit. Auch beim Wiederstand gegen Drogen und Gifte hilfreich',
  },
  {
    key: 'sc',
    label: 'Schnelligkeit',
    desc: 'Die körperliche Bewegungsgeschwindigkeit und Reaktionszeit',
  },
  {
    key: 'wk',
    label: 'Willenskraft',
    desc: 'Maß für die geistige Stärke und Wiederstandsfähigkeit. Beeinflusst Konzentration und ist daher für Machtbenutzer wichtig',
  }
]

list.forEach(attr => {
  attr.xpCategory = Config.character.attributes.xpCategory
  attr.xp = 0
  attr.gp = 0
  attr.gained = []
  attr.buff = 0
})

const map = ObjectUtils.asObject(list, 'key')

export default Object.freeze({ list, map })
