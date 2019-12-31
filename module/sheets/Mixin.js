export default class Mixin {
  constructor(parent) {
    this._parent = parent
    this._originalMethods = {}
  }

  interceptMethod(name, handler, { wrapSuper = false } = {}) {
    this._originalMethods[name] = this._parent[name]
    const self = this
    this._parent[name] = function (...args) {
      const originalThis = this
      if (wrapSuper) {
        return handler.call(
          self,
          { args, originalThis, callSuper: (...superArgs) => self._originalMethods[name].apply(originalThis, superArgs) }
        )
      } else {
        const result = handler.apply(self, args)
        if (typeof result !== 'undefined') {
          return result
        } else {
          return self._originalMethods[name].apply(originalThis, args)
        }
      }
    }
  }

  get parent() {
    return this._parent
  }
}
