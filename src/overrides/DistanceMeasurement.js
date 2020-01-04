export const measureDistance = function(p0, p1, {gridSpaces=true}={}) {
  if ( !gridSpaces ) {
    return BaseGrid.prototype.measureDistance.bind(this)(p0, p1, {gridSpaces})
  }
  const gs = canvas.dimensions.size
  const ray = new Ray(p0, p1)
  const nx = Math.abs(Math.ceil(ray.dx / gs))
  const ny = Math.abs(Math.ceil(ray.dy / gs))

  // Simple euclidian distance measurement
  return Math.sqrt(nx ** 2 + ny ** 2) * canvas.scene.data.gridDistance
}
