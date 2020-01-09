import Shortcuts, {CTRL} from './Shortcuts.js'

function syncSettingClass(name) {
  const value = game.settings.get('sw-tor', name)
  const baseName = `setting-${name}`
  const className = `${baseName}-${value}`
  const toRemove = []
  const element = document.body
  for (const clazz of element.classList) {
    if (clazz !== className && clazz.startsWith(baseName)) {
      toRemove.push(clazz)
    }
  }
  for (const clazz of toRemove) {
    element.classList.remove(clazz)
  }
  element.classList.add(className)
}

function toggleRulerVisible() {
  game.settings.set('sw-tor', 'rulerVisible', !game.settings.get('sw-tor', 'rulerVisible'))
  syncSettingClass('rulerVisible')
}

export function installGlobalShortcuts() {
  syncSettingClass('rulerVisible')

  Shortcuts.create(document.body)
    .add(CTRL, 'Y', toggleRulerVisible)
}
