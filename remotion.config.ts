import { Config } from "@remotion/cli/config";

// Lossless intermediate frames: neon gradients band badly through JPEG.
Config.setVideoImageFormat("png");
// No GPU required: SwiftShader via ANGLE renders the WebGL scenes on CPU.
// On a machine with a real GPU, switch this to "angle" for a large speedup.
Config.setChromiumOpenGlRenderer("swangle");
Config.setOverwriteOutput(true);
Config.setEntryPoint("src/index.ts");
