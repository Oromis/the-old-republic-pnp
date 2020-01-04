import Mixin from './Mixin.js'
import ObjectUtils from '../util/ObjectUtils.js'

export default class SheetWithTabs extends Mixin {
  constructor(parent) {
    super(parent)

    this._tabGroups = {}

    this.interceptMethod('activateListeners', this.activateListeners)

    this.interceptMethod('getData', ({ args, callSuper }) => {
      const data = callSuper(...args)
      data.tabGroups = ObjectUtils.mapValues(this._tabGroups, group => {
        return {
          active: group.tabs.reduce((acc, tab) => {
            acc[tab] = group.active.indexOf(tab) !== -1
            return acc
          }, {})
        }
      })
      return data
    }, { wrapSuper: true })

    this.interceptMethod('_onResize', this._onResize)
  }

  activateListeners(html) {
    const groups = html.find('.tab-group')
    for (const group of groups) {
      const id = group.getAttribute('data-id')
      if (id == null) {
        throw new Error(`Please provide "data-id" on tab-group`)
      } else if (this._tabGroups[id] == null) {
        this._tabGroups[id] = {
          id,
          tabs: [],
          active: [],
        }
      } else {
        this._tabGroups[id].tabs = []
      }

      const minWidth = group.getAttribute('data-min-width')
      this._tabGroups[id].minWidth = minWidth == null || isNaN(minWidth) ? null : +minWidth

      for (const header of group.querySelectorAll('.tab-header')) {
        const headerId = header.getAttribute('data-id')
        if (headerId == null) {
          throw new Error(`Please provide "data-id" on tab-header`)
        }
        this._tabGroups[id].tabs.push(headerId)

        header.addEventListener('click', () => this.activateTab(this._tabGroups[id], headerId))
      }

      this._deriveActiveCount(this._tabGroups[id])
    }
  }

  activateTab(group, tabId) {
    const existingIndex = group.active.indexOf(tabId)
    if (existingIndex !== -1) {
      // The tab has been active before => remove it to make sure it isn't duplicated and push it to the front
      // of the list
      group.active.splice(existingIndex, 1)
    }
    group.active.unshift(tabId)

    this._deriveActiveCount(group)
  }

  _deriveActiveCount(tabGroup) {
    const groupElement = this.parent.form.querySelector(`.tab-group[data-id="${tabGroup.id}"]`)
    let maxActiveTabCount = 1
    if (tabGroup.minWidth != null) {
      const groupWidth = Math.min(groupElement.clientWidth, this.parent.position.width)
      maxActiveTabCount = Math.max(Math.floor(groupWidth / tabGroup.minWidth), 1)
    }
    const minActiveTabCount = maxActiveTabCount
    if (tabGroup.active.length > maxActiveTabCount) {
      // Too many open tabs, remove excessive ones
      tabGroup.active.splice(maxActiveTabCount, tabGroup.active.length - maxActiveTabCount)
    } else if (tabGroup.active.length < minActiveTabCount) {
      // Not enough open tabs => open new ones
      while (tabGroup.active.length < minActiveTabCount && tabGroup.active.length < tabGroup.tabs.length) {
        for (const tab of tabGroup.tabs) {
          if (tabGroup.active.indexOf(tab) === -1) {
            tabGroup.active.push(tab)
            break
          }
        }
      }
    }

    this._syncActiveTabs(tabGroup)
  }

  _syncActiveTabs(group) {
    const groupElement = this.parent.form.querySelector(`.tab-group[data-id="${group.id}"]`)
    for (const tab of group.tabs) {
      const header = groupElement.querySelector(`.tab-header[data-id="${tab}"]`)
      const tabActive = group.active.indexOf(tab) !== -1
      if (header == null) {
        console.warn(`Missing Tab header for ID ${tab}`)
      } else {
        if (tabActive) {
          header.classList.add('active')
        } else {
          header.classList.remove('active')
        }
      }

      const content = this.parent.form.querySelector(`.tab-wrapper[data-id="${tab}"]`)
      if (content == null) {
        console.warn(`Missing Tab content for ID ${tab}`)
      } else {
        if (tabActive) {
          content.classList.remove('hidden')
        } else {
          content.classList.add('hidden')
        }
      }
    }
  }

  _onResize = () => {
    for (const group of Object.values(this._tabGroups)) {
      this._deriveActiveCount(group)
    }
  }
}
