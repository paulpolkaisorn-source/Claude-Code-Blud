// Every piece of on-screen text lives here. Edit copy without touching animation code.
// Product names and feature names checked against amd.com (see README for notes).

export const content = {
  title: {
    ryzen: "RYZEN",
    radeon: "RADEON",
    tagline: "The processor and the graphics, built by one team.",
  },
  ryzenDeepDive: {
    heading: "Inside Ryzen",
    cores: { title: "Zen 5 cores" },
    cache: {
      title: "3D V-Cache",
      sub: "Extra L3 cache stacked with the compute die",
    },
    socket: { title: "AM5 socket" },
    io: { title: "DDR5 memory and PCIe 5.0" },
  },
  ryzenInUse: {
    panels: ["Play", "Create", "Build"] as const,
  },
  radeonDeepDive: {
    computeUnits: "Compute units",
    rayTracing: "Ray tracing",
    upscaling: "FSR Upscaling",
    upscaleIn: "Lower-resolution render",
    upscaleOut: "Upscaled output",
    archKicker: "Architecture",
    arch: "RDNA 4",
  },
  betterTogether: {
    cpu: "Ryzen",
    gpu: "Radeon",
    lanes: "PCIe",
    counterLabel: "FRAME",
    sam: {
      title: "Smart Access Memory",
      sub: "Built on PCIe Resizable BAR, for Ryzen and Radeon working together.",
    },
  },
  endCard: {
    ryzen: "AMD RYZEN",
    radeon: "AMD RADEON",
  },
};
