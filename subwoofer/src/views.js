// Camera presets for the viewer. These are generated from the photo fit (tools/fit2.mjs) and then
// rounded; `photo` presets reproduce the camera of each reference picture.
export const VIEWS = [
  { id: 'front', label: 'Front', pose: { yaw: 0, pitch: 0, roll: 0, dist: 62, fov: 20, spin: 0, target: [0, 0, -3.5] } },
  { id: 'front34', label: 'Front ¾', pose: { yaw: -42, pitch: 13, roll: 0, dist: 66, fov: 19, spin: 0, target: [0, 0, -3.5] } },
  { id: 'rear34a', label: 'Rear ¾', pose: { yaw: 150, pitch: 28, roll: 0, dist: 62, fov: 19, spin: 0, target: [0, 0, -3.5] } },
  { id: 'rear34b', label: 'Rear ¾ II', pose: { yaw: -150, pitch: 28, roll: 0, dist: 66, fov: 19, spin: 0, target: [0, 0, -3.5] } },
];
