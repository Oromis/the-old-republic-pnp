import Attributes from './Attributes.js'
import ObjectUtils from './ObjectUtils.js'
import Config from './Config.js'

function calcGp(char) {
  return (char.gp.initial || Config.character.initialGp)
    - (char.xp.gp || 0)
    - Object.values(char.attributes).reduce((acc, cur) => acc + (cur.gp || 0), 0)
}

function calcFreeXp(char) {
  return calcTotalXp(char)
}

function calcTotalXp(char) {
  return char.xp.gp * Config.character.gpToXpRate + char.xp.gained
}

function calcAttributeValue(attribute) {
  const attr = attribute || {}
  return attr.gp || 0
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
    this._sheetTab = "attributes";
    this._dirty = false
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
    data.computed = {
      gp,
      freeXp: calcFreeXp(data.data),
      totalXp: calcTotalXp(data.data),
      xpFromGp: data.data.xp.gp * Config.character.gpToXpRate,
      attributes: Attributes.list.map(attr => {
        const attribute = data.data.attributes[attr.key]
        return { ...attribute, ...attr, value: calcAttributeValue(attribute) }
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

  // Disable the default unfocus functionality - It only submits the form when no other input receives
  // focus which isn't exactly handy for our use case here
  _onUnfocus = () => {}

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
    // Step 1: Collect the old values of all attributes
    const attributes = Attributes.list.reduce((acc, attr) => {
      const oldAttribute = this.actor.data.data.attributes[attr.key]
      acc[attr.key] = ObjectUtils.pick({ xp: 0, gp: 0, ...(oldAttribute || {}) }, ['xp', 'gp'])
      return acc
    }, {})
    // Step 2: Process changes
    for (const [key, result] of Object.entries(attributes)) {
      const oldVal = calcAttributeValue(result)
      let targetVal = Math.round(processDeltaValue(parsed.input.attributes[key].value, oldVal))
      if (oldVal !== targetVal) {
        // Attribute value changed => figure out in what way
        if (targetVal > oldVal) {
          // Pay with GP if possible
          const charGp = calcGp({ ...this.actorData, attributes })
          if (charGp > 0) {
            result.gp += Math.min(targetVal - oldVal, charGp)
          }
          let newVal = calcAttributeValue(result)
          if (targetVal > newVal) {
            // We didn't have enough GP => pay with XP
            // TODO
          }
          newVal = calcAttributeValue(result)
          if (targetVal > newVal) {
            // Still not enough point to pay for the change => show a warning
            ui.notifications.error(`Kann Attribut ${Attributes.map[key].label} auf maximal ${newVal} steigern: Fehlende GP / XP`)
          }
        } else {
          // Points reduced
          // TODO deduct XP
          const newVal = calcAttributeValue(result)
          if (targetVal < newVal) {
            // Not enough XP => deduct GP
            result.gp = Math.max(0, result.gp - (newVal - targetVal))
          }
        }
      }
    }

    formData = ObjectUtils.omitBy(formData, (val, key) => key.startsWith('data.attributes'))
    formData['data.attributes'] = attributes

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
