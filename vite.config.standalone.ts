import { defineConfig } from 'vite'

/**
 * Self-contained builds — for consumers with no bundler.
 *
 * Lit is deliberately inlined here. A CDN `<script type="module">` cannot resolve
 * a bare `import 'lit'` specifier, and a UMD global for Lit is impractical, so
 * these two artifacts carry their own copy:
 *
 *   declarative-charts.standalone.js   ESM  → `unpkg` / `jsdelivr` / the "./standalone" export
 *   declarative-charts.umd.cjs         UMD  → `main` / the "require" condition
 *
 * Runs after the primary build, so it must not clear dist/.
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: './src/index.ts',
      name: 'DeclarativeCharts',
      formats: ['es', 'umd'],
      fileName: (format) =>
        format === 'umd' ? 'declarative-charts.umd.cjs' : 'declarative-charts.standalone.js'
    },
    rollupOptions: {
      external: [],
      output: { globals: {} }
    }
  }
})
