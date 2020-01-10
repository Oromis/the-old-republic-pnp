import ObjectUtils from '../util/ObjectUtils.js'
import RadialMenu from '../vendor/radial-menu-js/RadialMenu.js'

const menuItems = [
  {
    id   : 'walk',
    title: 'Walk',
    icon: '\uf554'
  },
  null,
  {
    id: 'weapon',
    title: 'Weapon...',
    icon: '\uf0fc',
  },
  null
]

export function installTokenInputHandler() {
  const original = Token.prototype._onMouseDown
  Token.prototype._onMouseDown = function onMouseDownOverride(...args) {
    const [event] = args
    if (ObjectUtils.try(event.data, 'button') === 1) {
      // Middle click
      const menu = new RadialMenu({
        parent: document.body,
        size: 300,
        closeOnClick: true,
        destroyOnClose: true,
        position: { x: event.data.originalEvent.clientX, y: event.data.originalEvent.clientY },
        menuItems,
        onClick     : function (item) {
          console.log('You have clicked:', item);
        }
      })
      menu.open()
      event.data.originalEvent.preventDefault()
      return false
    } else {
      return original.call(this, ...args)
    }
  }
}
