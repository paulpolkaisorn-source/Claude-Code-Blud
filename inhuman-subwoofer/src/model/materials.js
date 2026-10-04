// PBR materials tuned against the product photography.

import * as THREE from 'three';
import { carbonTextures, grainNormal, CARBON_TILE_MM } from './textures.js';

export function makeMaterials() {
  const carbon = carbonTextures();
  const rubberGrain = grainNormal(512, 11, 0.9, 1.6);
  const surroundGrain = grainNormal(512, 5, 1.1, 1.0);

  const m = {};

  // gloss-black powder coat used on the cast frame, gasket and spokes
  m.frameBlack = new THREE.MeshPhysicalMaterial({
    name: 'frame_gloss_black',
    color: 0x060606,
    roughness: 0.16,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.035,
    envMapIntensity: 1.0,
  });

  // satin black anodised fasteners
  m.screwBlack = new THREE.MeshPhysicalMaterial({
    name: 'screw_black_oxide',
    color: 0x111111,
    roughness: 0.32,
    metalness: 0.75,
  });

  // Mega-Roll surround: satin rubber with a faint sparkle
  m.surround = new THREE.MeshPhysicalMaterial({
    name: 'surround_rubber',
    color: 0x121212,
    roughness: 0.42,
    metalness: 0.0,
    normalMap: surroundGrain,
    normalScale: new THREE.Vector2(0.25, 0.25),
    sheen: 0.35,
    sheenRoughness: 0.6,
    sheenColor: new THREE.Color(0x8a8a8a),
  });

  // carbon fibre cone, clear coated
  const map = carbon.map.clone();
  const nmap = carbon.normalMap.clone();
  for (const t of [map, nmap]) { t.repeat.set(1 / CARBON_TILE_MM, 1 / CARBON_TILE_MM); t.needsUpdate = true; }
  m.carbon = new THREE.MeshPhysicalMaterial({
    name: 'carbon_fibre_clearcoat',
    map,
    normalMap: nmap,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.38,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    side: THREE.DoubleSide,
  });

  // back skin of the cone: same weave, seen in the shadow of the basket
  m.carbonBack = m.carbon.clone();
  m.carbonBack.name = 'carbon_fibre_back';
  m.carbonBack.side = THREE.FrontSide;
  m.carbonBack.color = new THREE.Color(0x3a3a3a);
  m.carbonBack.envMapIntensity = 0.6;

  // surround glue lip on the cone (glossy black adhesive) + stitching
  m.glueLip = new THREE.MeshPhysicalMaterial({
    name: 'surround_glue_lip',
    color: 0x0b0b0b,
    roughness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.08,
  });

  m.spider = new THREE.MeshPhysicalMaterial({
    name: 'spider_resin_cloth',
    color: 0x0e0e0e,
    roughness: 0.45,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide,
  });

  // mirror chrome (top plate, terminals, vent)
  m.chrome = new THREE.MeshPhysicalMaterial({
    name: 'chrome_polished',
    color: 0xf2f2f2,
    metalness: 1.0,
    roughness: 0.035,
  });

  // spun chrome back plate: anisotropic circular brushing
  m.spunChrome = new THREE.MeshPhysicalMaterial({
    name: 'chrome_spun',
    color: 0xefefef,
    metalness: 1.0,
    roughness: 0.14,
    anisotropy: 0.75,
  });

  // bead-blasted aluminium centre plate on the back
  m.satinAlu = new THREE.MeshPhysicalMaterial({
    name: 'aluminium_satin',
    color: 0xf4f4f4,
    metalness: 0.55,
    roughness: 0.42,
  });

  m.holeDark = new THREE.MeshStandardMaterial({
    name: 'hole_dark',
    color: 0x1a140c,
    metalness: 0.6,
    roughness: 0.6,
  });

  // moulded motor boot: dark grey rubber with fine grain
  m.boot = new THREE.MeshPhysicalMaterial({
    name: 'boot_rubber',
    color: 0x4e4e4e,
    roughness: 0.7,
    metalness: 0.0,
    normalMap: rubberGrain,
    normalScale: new THREE.Vector2(0.35, 0.35),
    sheen: 0.25,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x777777),
  });

  m.plasticBlack = new THREE.MeshPhysicalMaterial({
    name: 'terminal_housing',
    color: 0x0c0c0c,
    roughness: 0.3,
    clearcoat: 0.6,
  });

  m.nickel = new THREE.MeshPhysicalMaterial({
    name: 'terminal_nickel',
    color: 0xe6e3dd,
    metalness: 1.0,
    roughness: 0.12,
  });

  m.red = new THREE.MeshPhysicalMaterial({ name: 'polarity_red', color: 0xb3150f, roughness: 0.35, clearcoat: 0.6 });
  m.polarityBlack = new THREE.MeshPhysicalMaterial({ name: 'polarity_black', color: 0x151515, roughness: 0.35, clearcoat: 0.6 });

  m.voiceCoil = new THREE.MeshStandardMaterial({ name: 'former', color: 0x101010, roughness: 0.6 });

  return m;
}
