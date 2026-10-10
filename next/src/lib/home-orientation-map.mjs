/**
 * One north-up local equirectangular projection for the coastline and towns.
 * Longitude is corrected at the crop's mid-latitude; x and y then share the
 * same scale. Never stretch one axis independently to fit the layout.
 */
export const orientationFrame = Object.freeze({
  width: 400,
  height: 340,
  west: 144.61,
  east: 145.25,
  south: -38.55,
  north: -38.08,
});

const { width, height, west, east, south, north } = orientationFrame;
const longitudeScale = Math.cos(((north + south) / 2) * Math.PI / 180);
// Cover the frame and clip the small north/south excess. Containing the crop
// would expose artificial vertical land edges inside an aqua inset.
const scale = Math.max(width / ((east - west) * longitudeScale), height / (north - south));
const insetX = (width - (east - west) * longitudeScale * scale) / 2;
const insetY = (height - (north - south) * scale) / 2;

/** @param {{lat: number, lng: number}} point */
export function projectOrientationPoint(point) {
  return {
    x: insetX + (point.lng - west) * longitudeScale * scale,
    y: insetY + (north - point.lat) * scale,
  };
}

/** @param {number[][]} ring A closed [longitude, latitude] coastline ring. */
export function orientationLandPath(ring) {
  return ring.map(([lng, lat], index) => {
    const { x, y } = projectOrientationPoint({ lat, lng });
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ') + ' Z';
}
