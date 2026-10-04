// All dimensions in inches. +Z is the direction the cone faces (towards the listener / camera in the
// front photo). Z = 0 is the front face of the mounting flange.
export const P = {
  R: 8.0, // flange outer radius
  flangeInner: 6.93,
  flangeT: 0.253,
  mountR: 7.58,
  mountHoleR: 0.06,
  plateR: 7.52,
  plateAnglesCW: [14, 59, 104, 149, 194, 239, 284, 329], // degrees clockwise from top (front view)

  // surround (rubber roll)
  roll: {
    pts: [
      [5.52, 0.1], [5.58, 0.182], [5.78, 0.352], [6.1, 0.517], [6.5, 0.605], [6.86, 0.552], [7.06, 0.382], [7.13, 0.182], [7.14, 0.02],
    ],
  },

  // cone + dust cap
  cone: { rTop: 5.52, zTop: 0.1, capR: 2.52, depth: 3.5, power: 1.75 },
  cap: { height: 1.0 },
  weave: { tile: 0.7, rotDeg: 38 },

  // basket
  basketPts: [
    [6.95, -0.3], [6.7, -0.929], [6.3, -1.837], [5.8, -2.815], [5.3, -3.794], [4.8, -4.632], [4.4, -5.191], [4, -5.541],
  ],
  spokeCount: 4,
  spokePhi0: 45, // deg, centre of first spoke (model angle)
  terminalPhi: 90, // deg, centre of the terminal bay

  // motor
  funnel: [
    [3.95, -5.541], [4.212, -5.695], [4.471, -5.926], [4.772, -6.247], [5.038, -6.569], [5.188, -6.761], [5.236, -6.826],
  ],
  band: { r: 5.382, z0: -6.826, z1: -10.329 },
  endCap: { r: 4.829, recess: 0.14, dome: 0.22, plateR: 1.85, boreR: 0.62 },

  // band lettering layout (angles around the band, degrees; u=0 at model +X, CCW seen from the front)
  bandLayout: { text: [45, 225], alien: 315, bee: 135, alienRot: 0, beeRot: 0.35 },
};
