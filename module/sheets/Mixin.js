export default class Mixin {
  constructor(parent) {
    this._parent = parent
    this._originalMethods = {}
  }

  interceptMethod(name, handler, { wrapSuper = false } = {}) {
    this._originalMethods[name] = this._parent[name]
    this._parent[name] = (...args) => {
      if (wrapSuper) {
        return handler.call(
          this,
          { args, callSuper: (...superArgs) => this._originalMethods[name].apply(this._parent, superArgs) }
        )
      } else {
        const result = handler.apply(this, args)
        if (typeof result !== 'undefined') {
          return result
        } else {
          return this._originalMethods[name].apply(this._parent, args)
        }
      }
    }
  }

  get parent() {
    return this._parent
  }
}
