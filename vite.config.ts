import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Zwei Build-Modi:
//  - default: statische SPA für GitHub Pages / Vercel (HTML + JS + CSS getrennt)
//  - standalone (--mode standalone): EINE self-contained index.html, alles inline.
//    Diese Datei läuft per Doppelklick über file:// – komplett offline, ohne Server.
// (Test-Konfiguration liegt in vitest.config.ts.)
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone'
  return {
    base: './',
    plugins: standalone ? [viteSingleFile()] : [],
    build: {
      target: 'es2022',
      outDir: standalone ? 'dist-standalone' : 'dist',
      assetsInlineLimit: 4096,
      // Modulepreload-Polyfill abschalten: Es ist der einzige fetch()-Aufruf im
      // Bundle (lädt nur App-eigene lokale Chunks). Ohne ihn enthält das gebaute
      // Bundle KEIN einziges Netzwerk-Primitiv – die Privacy-Story ist damit
      // architektonisch garantiert, nicht nur versprochen.
      modulePreload: { polyfill: false },
    },
  }
})
