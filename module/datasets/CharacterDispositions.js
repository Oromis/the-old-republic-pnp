import ObjectUtils from '../util/ObjectUtils.js'

const list = [
    { key: 'military', label: 'Militärisch' },
    { key: 'civil', label: 'Zivil' },
    { key: 'criminal', label: 'Kriminell' },
]

export default Object.freeze({
    list,
    map: ObjectUtils.asObject(list, 'key'),
})
