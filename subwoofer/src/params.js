// All dimensions in inches. +Z is the direction the cone faces (towards the listener / camera in the
// front photo). Z = 0 is the front face of the mounting flange.
export const P = {
  R: 8.0, // flange outer radius
  flangeInner: 6.5,
  flangeT: 0.45,
  mountR: 7.58,
  mountHoleR: 0.06,
  plateR: 7.52,
  plateAnglesCW: [14, 59, 104, 149, 194, 239, 284, 329], // degrees clockwise from top (front view)

  // surround (rubber roll)
  roll: {
    pts: [
      [5.52, 0.1], [5.55, 0.5], [5.7, 0.95], [6.0, 1.3], [6.45, 1.5], [6.85, 1.4], [7.05, 1.0], [7.12, 0.5], [7.14, 0.02],
    ],
  },

  // cone + dust cap
  cone: { rTop: 5.52, zTop: 0.1, capR: 2.18, depth: 3.5, power: 1.75 },
  cap: { height: 1.0 },
  weave: { tile: 0.7, rotDeg: 38 },

  // basket
  basketPts: [
    [6.95, -0.45], [6.7, -1.0], [6.3, -1.796], [5.8, -2.748], [5.3, -3.7], [4.8, -4.516], [4.4, -5.06], [4.0, -5.4],
  ],
  motorTwist: 35, // deg, clocking of the basket/motor relative to the cone logo and flange plates
  spokeCount: 4,
  spokePhi0: 45, // deg, centre of first spoke (model angle)
  terminalPhi: 180, // deg, centre of the terminal bay

  // motor
  funnel: [
    [3.95, -5.4], [4.221, -5.582], [4.489, -5.856], [4.8, -6.236], [5.076, -6.616], [5.23, -6.844], [5.281, -6.92],
  ],
  band: { r: 5.494, z0: -6.92, z1: -10.8 },
  endCap: { r: 4.98, recess: 0.3, dome: 0.62, plateR: 2.2, boreR: 0.72 },

  // band lettering layout (angles around the band, degrees; u=0 at model +X, CCW seen from the front).
  // Measured from the photos: items sit on a ~45 degree pitch: text, bee, text, alien, text, bee, text, alien.
  // The terminal bay (terminalPhi) sits just after the first bee.
  bandLayout: { text: [120, 210, 300, 30], bee: [165, 345], alien: [255, 75], alienRot: 0, beeRot: 0.35 },
};
