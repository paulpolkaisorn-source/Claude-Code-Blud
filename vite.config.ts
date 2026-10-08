import { defineConfig } from 'vite';
import { htmlInclude } from './build/plugins/html-include';

const GL_LIBS = /[\\/]node_modules[\\/](three|postprocessing)[\\/]/;
const MOTION_LIBS = /[\\/]node_modules[\\/](gsap|lenis)[\\/]/;

export default defineConfig({
  plugins: [htmlInclude()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (GL_LIBS.test(id)) return 'gl';
          if (MOTION_LIBS.test(id)) return 'motion';
          return undefined;
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
  },
  preview: {
    host: '127.0.0.1',
  },
});
