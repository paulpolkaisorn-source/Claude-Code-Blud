# Woofer Bounce Lab

Interactive 3D 18" subwoofer (Sundown InHuman 18 model) whose cone moves from a real-time driver simulation.

- **Frequency:** 1 – 1000 Hz (log slider, number box, quick presets)
- **Power / how hard:** 1 W – 20 kW
- **Enclosure:** free air, sealed 120 L, ported 170 L @ 32 Hz
- Cutaway view, live excursion scope, Xmax / bottoming-out indicators, optional sound

## Run

Browsers block ES modules and model files on `file://`, so serve the folder:

```
python3 -m http.server 8000
```

Open <http://localhost:8000>. Everything (three.js included) is vendored; no internet needed.

## Files

- `physics.js` – the driver model (pure JS, runs in Node too)
- `main.js` – scene, deforming surround/spider, controls, scope
- `assets/sundown-inhuman-18.glb` – the model
