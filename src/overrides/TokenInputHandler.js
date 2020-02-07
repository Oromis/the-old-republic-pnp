import ObjectUtils from '../util/ObjectUtils.js'
import RadialMenu from '../vendor/radial-menu-js/RadialMenu.js'
import ArrayUtils from '../util/ArrayUtils.js'

function getBaseMenuStructure() {
  return [null, null, null, null, null, null, null, null]
}

function fillWithOverflow({ menu, availableSlots, objects, generateItem, generateSubMenuItem, generateAvailableSlots }) {
  generateItem = ObjectUtils.asArray(generateItem)
  let parent = menu
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i]
    const items = generateItem.map(generator => generator(object)).filter(i => i != null)
    if (items.length > 0) {
      const last = i === objects.length - 1
      if ((last ? availableSlots.length : availableSlots.length - 1) < items.length) {
        // We need a new sub-menu
        const subMenuItem = generateSubMenuItem()
        parent[availableSlots[0]] = subMenuItem
        parent = subMenuItem.items
        availableSlots = generateAvailableSlots()
      }

      for (const item of items) {
        parent[availableSlots.shift()] = item
      }
    }
  }
}

function pullFrom(array, count) {
  const result = []
  for (let i = 0; i < count; ++i) {
    result.push(array.shift())
  }
  return result
}

function getMenuStructure(actor) {
  const result = getBaseMenuStructure()
  const forceSkills = actor.forceSkills.list

  if (forceSkills.length > 0) {
    result.push(null)
  }

  const rootSlots = result.map((a, i) => (2 + i) % result.length)

  // Skills
  {
    const index = rootSlots.shift()
    const skills = [...actor.skills.list]
    result[index] = {
      label: 'Skills ...',
      icon: '\uf192',
      items: [
        ...actor.dataSet.skillCategories.list.map(cat => ({
          label: `${cat.label} ...`,
          icon: cat.glyph,
          skills: ArrayUtils.removeBy(skills, skill => skill.category === cat.key),
        })),
        { label: 'Mächte ...', icon: '\uf669', skills: ArrayUtils.removeBy(skills, skill => skill.isForceSkill) },
        { label: 'Sonst. ...', icon: '\uf1ce', skills: skills },
      ]
        .filter(item => item.skills.length > 0)
        .map(item => {
          item.items = Array(8).fill(null)
          fillWithOverflow({
            menu: item.items,
            availableSlots: [0, 1, 2, 3, 4, 5, 6, 7],
            objects: item.skills,
            generateItem: [
              skill => ({
                label: skill.key.toUpperCase(),
                icon: { image: skill.img },
                subIcon: '\uf6cf',
                title: `${skill.name} würfeln`,
                action: ({ preventClose }) => {
                  skill.rollCheck()
                },
              })
            ],
            generateSubMenuItem: () => ({
              label: 'Mehr ...',
              icon: '\uf669',
              items: Array(8).fill(null),
            }),
            generateAvailableSlots: () => [0, 1, 2, 3, 4, 5, 6, 7],
          })
          return item
        }),
    }
  }

  // Handle force powers
  if (forceSkills.length > 0) {
    const index = rootSlots.shift()
    result[index] = {
      label: 'Mächte ...',
      icon: '\uf669',
      items: Array(8).fill(null),
    }

    fillWithOverflow({
      menu: result[index].items,
      availableSlots: [3, 4, 5, 6, 7, 0, 1, 2],
      objects: forceSkills,
      generateItem: [
        forceSkill => forceSkill.needsCheck ? ({
          label: forceSkill.shortName,
          icon: { image: forceSkill.img },
          subIcon: '\uf6cf',
          title: `${forceSkill.name} würfeln`,
          action: ({ preventClose }) => {
            forceSkill.rollCheck()
            preventClose()
          },
        }) : null,
        forceSkill => ({
          label: forceSkill.shortName,
          icon: { image: forceSkill.img },
          subIcon: '\uf04b',
          title: `${forceSkill.name} aktivieren`,
          action: () => forceSkill.apply(),
        })
      ],
      generateSubMenuItem: () => ({
        label: 'Mehr ...',
        icon: '\uf669',
        items: Array(8).fill(null),
      }),
      generateAvailableSlots: () => [2, 3, 4, 5, 6, 7, 0, 1],
    })
  }

  // Fill evasion / defensive rolls into the radial menu
  const availableDefensiveSlots = pullFrom(rootSlots, 3)
  if (actor.evasionCheck) {
    result[availableDefensiveSlots.shift()] = {
      label: 'Ausweichen',
      icon: { image: 'icons/svg/daze.svg' },
      action: () => actor.rollEvasion(),
    }
  }
  fillWithOverflow({
    menu: result,
    availableSlots: availableDefensiveSlots,
    objects: actor.equippedWeapons,
    generateItem: weapon => ({
      label: 'Parade',
      title: `Parade ${weapon.primaryEquippedSlot.label} (${weapon.name})`,
      icon: { image: weapon.img, scale: 1.5 },
      subIcon: '\uf3ed',
      action: () => weapon.rollParade(),
    }),
    generateSubMenuItem: () => ({
      label: 'Defensive ...',
      icon: { image: 'icons/svg/shield.svg' },
      items: Array(8).fill(null)
    }),
    generateAvailableSlots: () => [3, 4, 5, 6, 7, 0, 1, 2],
  })

  // Fill attack rolls into the radial menu
  fillWithOverflow({
    menu: result,
    availableSlots: [...rootSlots],
    objects: actor.equippedWeapons,
    generateItem: [
      weapon => ({
        label: 'Attacke',
        title: `Attacke ${weapon.primaryEquippedSlot.label} (${weapon.name})`,
        icon: { image: weapon.img, scale: 1.5 },
        subIcon: '\uf6cf',
        action: () => weapon.rollAttack(),
      }),
      weapon => ({
        label: 'Schaden',
        title: `Schaden ${weapon.primaryEquippedSlot.label} (${weapon.name})`,
        icon: { image: weapon.img, scale: 1.5 },
        subIcon: '\uf6d1',
        action: () => weapon.rollDamage(),
      })
    ],
    generateSubMenuItem: () => ({
      label: 'Offensive ...',
      icon: { image: 'icons/svg/sworg.svg' },
      items: Array(8).fill(null)
    }),
    generateAvailableSlots: () => [1, 0, 7, 6, 5, 4, 3, 2],
  })

  return result
}

let activeRadialMenu = null
function launchRadialMenu(event) {
  if (activeRadialMenu != null) {
    activeRadialMenu.close()
  }

  const menu = new RadialMenu({
    parent: document.body,
    size: 300,
    closeOnClick: true,
    destroyOnClose: true,
    position: { x: event.data.originalEvent.clientX, y: event.data.originalEvent.clientY },
    menuItems: getMenuStructure(event.target.actor),
    onClick: function (item, options) {
      if (typeof item.action === 'function') {
        item.action(options)
      }
    }
  })
  menu.open()
  activeRadialMenu = menu
}

export function installTokenInputHandler() {
  const original = Token.prototype._onMouseDown
  Token.prototype._onMouseDown = function onMouseDownOverride(...args) {
    const [event] = args
    if (ObjectUtils.try(event.data, 'button') === 1) {
      // Middle click
      launchRadialMenu(event)
      event.data.originalEvent.preventDefault()
      return false
    } else {
      return original.call(this, ...args)
    }
  }
}
