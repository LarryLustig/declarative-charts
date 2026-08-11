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
    // Minification is delegated to build/minify-standalone.mjs, which pins
    // `legalComments: 'inline'`.
    //
    // Vite 8 began minifying ES library output itself and strips legal comments
    // while doing it, so Lit — inlined into these artifacts — lost all ten of
    // its BSD-3-Clause headers. Redistributing the code without the notice is a
    // licence breach, not a size win, and the top-level `esbuild` option does
    // not reach the build minifier. Turning Vite's pass off leaves exactly one
    // place that minifies and exactly one place that decides about licences.
    minify: false,
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
