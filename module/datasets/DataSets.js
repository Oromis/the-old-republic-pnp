import HumanoidAttributes from './HumanoidAttributes.js'
import HumanoidMetrics from './HumanoidMetrics.js'

export default Object.freeze({
  fromActorType(type) {
    // TODO return different data sets for droids, ships, ...
    return {
      attributes: HumanoidAttributes,
      metrics: HumanoidMetrics,
    }
  }
})
