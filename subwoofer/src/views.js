// Camera presets for the viewer. The three oblique presets reproduce the cameras fitted to the reference
// photos (tools/fit4.mjs); `roll` is applied to the model so orbit controls keep working.
export const VIEWS = [
  { id: 'front', label: 'Front', pose: {"yaw": 0, "pitch": 0, "roll": 0, "dist": 68.4, "fov": 17.8, "spin": 0, "target": [0, 0, -3.5]} },
  { id: 'p4', label: 'Front ¾', pose: {"yaw": -43.7, "pitch": -3.1, "roll": -13.3, "dist": 39.2, "fov": 33.3, "spin": 350, "target": [0, 0, -3.5]} },
  { id: 'p1', label: 'Rear ¾', pose: {"yaw": 129.7, "pitch": 1.6, "roll": -52.2, "dist": 39.5, "fov": 33.3, "spin": 95, "target": [0, 0, -3.5]} },
  { id: 'p2', label: 'Rear ¾ II', pose: {"yaw": -130.4, "pitch": 6.6, "roll": 37.1, "dist": 42.0, "fov": 33.3, "spin": 352, "target": [0, 0, -3.5]} },
  { id: 'cone', label: 'Cone', pose: {"yaw": -43.7, "pitch": -3.1, "roll": -13.3, "dist": 26.0, "fov": 33.3, "spin": 350, "target": [0, 0, -1.2]} },
];
