import ObjectUtils from './util/ObjectUtils.js'

const skillPackName = 'sw-tor.skills'

let list = []
let map = {}

Hooks.once('ready', () => {
    let pack = game.packs.find(p => p.collection === skillPackName)
    pack.getContent().then(index => {
        list = index.map(skill => ({
            label: skill.data.name,
            ...skill.data.data
        }))
        map = ObjectUtils.asObject(list, 'key')
    })
})

function getMap() {
    return map
}

function getList() {
    return list
}

export default Object.freeze({ getMap, getList })
