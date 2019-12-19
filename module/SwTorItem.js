export default class SwTorItem extends Item {
  get isEquipped() {
    return Array.isArray(this.data.slots) && this.data.slots.length > 0
  }
}
