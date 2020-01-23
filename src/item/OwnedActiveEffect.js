export default {
  beforeConstruct() {
    this.handleEvent = function handleEvent(type) {
      console.log('ActiveEffect: ', type)
    }
  }
}
