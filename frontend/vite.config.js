import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

// Production CSP: only bundled resources from the trusted origin.
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const injectCsp = {
  name: 'monovra-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
};

export default defineConfig({
  // Served at https://appassets.androidplatform.net/assets/web/ inside the APK.
  base: './',
  plugins: [tailwindcss(), injectCsp],
  build: {
    outDir: fileURLToPath(new URL('../android/app/src/main/assets/web', import.meta.url)),
    emptyOutDir: true,
    target: 'chrome111',
    cssTarget: 'chrome111',
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    reportCompressedSize: false,
  },
  server: {
    watch: { usePolling: true, interval: 300 }, // reliable inside Docker bind mounts
  },
});
