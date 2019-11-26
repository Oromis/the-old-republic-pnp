import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'
import Config from './Config.js'
import XpTable from './XpTable.js'
import Species from './Species.js'

function calcGp(char) {
  return (char.gp.initial || Config.character.initialGp)
    - (char.xp.gp || 0)
    - ObjectUtils.try(Species.map[char.species], 'gp', { default: 0 })
    - Object.values(char.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
}

function calcFreeXp(char) {
  return calcTotalXp(char) -
    Attributes.list.reduce((acc, cur) => {
      return acc + ObjectUtils.try(char.attributes[cur.key], 'xp', { default: 0 })
    }, 0)
}

function calcTotalXp(char) {
  return char.xp.gp * Config.character.gpToXpRate + char.xp.gained
}

function calcAttributeBaseValue(actor, attribute) {
  const attr = attribute || {}
  return (attr.gp || 0) + calcAttributeMod(actor, attribute)
}

function calcAttributeMod(actor, attribute) {
  let speciesInfo = Species.map[(actor.species || Species.default)];
  return speciesInfo.mods[attribute.key] || 0
}

function calcAttributeValue(actor, attribute) {
  const attr = attribute || {}
  return calcAttributeBaseValue(actor, attribute) +
    ObjectUtils.try(attr, 'gained', { default: [] }).length +
    (attr.buff || 0)
}

function calcAttributeUpgradeCost(actor, attribute) {
  const baseVal = calcAttributeBaseValue(actor, attribute)
  const gainLog = ObjectUtils.try(attribute, 'gained', { default: [] })
  return XpTable.getUpgradeCost({
    category: ObjectUtils.try(attribute, 'xpCategory', { default: Config.character.attributes.xpCategory }),
    from: baseVal + gainLog.length,
    to: baseVal + gainLog.length + 1,
  })
}

function processDeltaValue(text, oldValue) {
  const matches = /\s*([+\-*/])\s*([+\-]?[\d.]+)/.exec(text)
  if (matches) {
    switch (matches[1]) {
      case '+':
        return oldValue + (+matches[2])
      case '-':
        return oldValue - (+matches[2])
      case '*':
        return oldValue * (+matches[2])
      case '/':
        return oldValue / (+matches[2])
    }
  }

  if (!isNaN(text)) {
    // Input is just a number => use it directly
    return +text
  }

  // If we get here then the format is invalid
  ui.notifications.error(`Ungültiger Wert: ${text}. Expected one of <Number>, +<Number>, -<Number>, *<Number>, /<Number>`)
  return oldValue
}

/**
 * Extend the basic ActorSheet with some very simple modifications
 */
export default class SwTorActorSheet extends ActorSheet {
  constructor(...args) {
    super(...args);

    /**
     * Keep track of the currently active sheet tab
     * @type {string}
     */
    this._sheetTab = "attributes"
  }

  /* -------------------------------------------- */

  /**
   * Extend and override the default options used by the 5e Actor Sheet
   * @returns {Object}
   */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["sw-tor", "sheet", "actor"],
  	  template: "systems/sw-tor/templates/actor-sheet.html",
      submitOnUnfocus: true,
      width: 754,
      height: 600
    });
  }

  /* -------------------------------------------- */

  /**
   * Prepare data for rendering the Actor sheet
   * The prepared data object contains both the actor data as well as additional sheet options
   */
  getData() {
    const data = super.getData()
    let gp = calcGp(data.data)
    const freeXp = calcFreeXp(data.data)
    data.computed = {
      gp,
      freeXp,
      totalXp: calcTotalXp(data.data),
      xpFromGp: data.data.xp.gp * Config.character.gpToXpRate,
      xpCategories: XpTable.getCategories(),
      speciesList: Species.list,
      speciesName: ObjectUtils.try(Species.map[data.data.species], 'name', { default: 'None' }),
      attributes: Attributes.list.map(generalAttr => {
        const charAttr = data.data.attributes[generalAttr.key]
        const attr = { ...generalAttr, ...charAttr,  }

        let upgradeCost = calcAttributeUpgradeCost(this.actorData, attr)
        if (upgradeCost > freeXp) {
          upgradeCost = null
        }
        const gainLog = ObjectUtils.try(charAttr, 'gained', { default: [] }).length
        return {
          ...attr,
          gained: {
            canDowngrade: gainLog > 0,
            value: gainLog,
            upgradeCost,
          },
          value: calcAttributeValue(this.actorData, attr),
          mod: calcAttributeMod(this.actorData, attr),
        }
      }),
      flags: {
        hasGp: gp > 0,
        canRefundXpToGp: data.data.xp.gp > 0
      }
    }
    return data
  }

  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html The prepared HTML object ready to be rendered into the DOM
   */
	activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    let tabs = html.find('.tabs');
    let initial = this._sheetTab;
    new Tabs(tabs, {
      initial: initial,
      callback: clicked => this._sheetTab = clicked.data("tab")
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    if (this.options.submitOnUnfocus) {
      // Enable auto-submit
      html.find('input')
        .on('change', this._onChangeInput)
        .on('focus', this._onFocusInput)
        .on('keypress', this._onEnter)
    }

    if (this._focusedKey != null) {
      html.find(`[data-key=${this._focusedKey}]`).focus().select()
    }

    html.find('.gp-to-xp').click(this._onGpToXp)
    html.find('.xp-to-gp').click(this._onXpToGp)
    html.find('button.set-value').click(this._onSetValueButton)
    html.find('button.change-attr-gained').click(this._onChangeAttrGained)

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Add or Remove Attribute
    html.find(".attributes").on("click", ".attribute-control", this._onClickAttributeControl.bind(this));
  }

  /* -------------------------------------------- */

  async _onClickAttributeControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const action = a.dataset.action;
    const attrs = this.object.data.data.attributes;
    const form = this.form;

    // Add new attribute
    if ( action === "create" ) {
      const nk = Object.keys(attrs).length + 1;
      let newKey = document.createElement("div");
      newKey.innerHTML = `<input type="text" name="data.attributes.attr${nk}.key" value="attr${nk}"/>`;
      newKey = newKey.children[0];
      form.appendChild(newKey);
      await this._onSubmit(event);
    }

    // Remove existing attribute
    else if ( action === "delete" ) {
      const li = a.closest(".attribute");
      li.parentElement.removeChild(li);
      await this._onSubmit(event);
    }
  }

  _onChangeInput = async e => {
    await this._onSubmit(e)
    this._focusedKey = null
  }

  _onFocusInput = e => {
    this._focusedKey = $(e.target).attr('data-key')
  }

  _onEnter = async e => {
    if (e.key === 'Enter') {
      await this._onSubmit(e)
    }
  }

  _onGpToXp = () => {
    const gp = calcGp(this.actor.data.data)
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': ObjectUtils.try(this.actor.data.data, 'xp', 'gp', { default: 0 }) + 1 })
    }
  }

  _onXpToGp = () => {
    const gp = ObjectUtils.try(this.actor.data.data, 'xp', 'gp', { default: 0 })
    if (gp > 0) {
      this.actor.update({ 'data.xp.gp': gp - 1 })
    }
  }

  _onSetValueButton = event => {
    let value = event.target.getAttribute('data-value')
    if (!isNaN(value)) {
      value = +value
    }
    this.actor.update({
      [event.target.getAttribute('data-field')]: value
    })
  }

  _onChangeAttrGained = event => {
    const action = event.target.getAttribute('data-action')
    const key = event.target.getAttribute('data-attr')
    const attribute = {
      ...Attributes.map[key],
      ...this.actorData.attributes[key],
    }
    const prevXp = ObjectUtils.try(attribute, 'xp', { default: 0 })
    const gainLog = ObjectUtils.try(attribute, 'gained', { default: [] })
    let newGainLog, newXp
    if (action === '+') {
      const xpCategory = ObjectUtils.try(attribute, 'xpCategory', { default: Config.character.attributes.xpCategory })
      newGainLog = [...gainLog, { xpCategory }]
      newXp = prevXp + calcAttributeUpgradeCost(this.actorData, attribute)
    } else {
      const baseVal = calcAttributeBaseValue(this.actorData, attribute)
      newGainLog = gainLog.slice(0, gainLog.length - 1)
      const removed = gainLog[gainLog.length - 1]
      newXp = prevXp - XpTable.getUpgradeCost({
        category: removed.xpCategory,
        from: baseVal + newGainLog.length,
        to: baseVal + gainLog.length
      })
    }
    this.actor.update({
      [`data.attributes.${key}.gained`]: newGainLog,
      [`data.attributes.${key}.xp`]: newXp,
      [`data.attributes.${key}.xpCategory`]: Attributes.map[key].xpCategory,  // Reset XP category after every change
    })
  }

  _processDeltaProperty(formData, path) {
    const input = formData[path]
    if (input != null) {
      const old = ObjectUtils.try(this.actor.data, ...path.split('.'))
      formData[path] = Math.round(processDeltaValue(input, old))
    }
  }

  /* -------------------------------------------- */

  /**
   * Implement the _updateObject method as required by the parent class spec
   * This defines how to update the subject of the form when the form is submitted
   * @private
   */
  _updateObject(event, formData) {
    // Handle the free-form attributes list
    const parsed = expandObject(formData)
    // const formAttrs = expandObject(formData).data.attributes || {};
    // const attributes = Object.values(formAttrs).reduce((obj, v) => {
    //   let k = v["key"].trim();
    //   if ( /[\s.]/.test(k) )  return ui.notifications.error("Attribute keys may not contain spaces or periods");
    //   delete v["key"];
    //   obj[k] = v;
    //   return obj;
    // }, {});
    //
    // // Remove attributes which are no longer used
    // for ( let k of Object.keys(this.object.data.data.attributes) ) {
    //   if ( !attributes.hasOwnProperty(k) ) attributes[`-=${k}`] = null;
    // }
    //
    // // Re-combine formData
    // formData = Object.entries(formData).filter(e => !e[0].startsWith("data.attributes")).reduce((obj, e) => {
    //   obj[e[0]] = e[1];
    //   return obj;
    // }, {_id: this.actor._id, "data.attributes": attributes});

    // Take care of attributes.
    Attributes.list.forEach(attr => {
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.gp`)
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.buff`)
      this._processDeltaProperty(formData, `data.attributes.${attr.key}.mod`)
    })

    if (parsed.input.totalXp != null) {
      const newVal = Math.round(processDeltaValue(parsed.input.totalXp, calcTotalXp(this.actorData)))
      formData['data.xp.gained'] = newVal -
        (ObjectUtils.try(this.actorData, 'xp', 'gp', { default: 0 }) * Config.character.gpToXpRate)
    }

    // Update the Actor
    return this.actor.update(formData);
  }

  get actorData() {
    return this.actor.data.data
  }
}
