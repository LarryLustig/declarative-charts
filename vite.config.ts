import { defineConfig } from 'vite'

/**
 * Primary library build — for consumers with a bundler.
 *
 * Lit is externalized and declared a peer dependency. Bundling it here would
 * give any consumer who already uses Lit two copies of `ReactiveElement` in one
 * page: doubled payload, `instanceof` checks failing across the boundary, and
 * Lit's own duplicate-version warnings.
 *
 * The no-build story is served by a separate self-contained artifact — see
 * vite.config.standalone.ts.
 */
export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es'],
      fileName: () => 'declarative-charts.js'
    },
    rollupOptions: {
      // Regexes, not plain strings: Rollup's `external` matches exact module IDs,
      // so 'lit' alone would miss 'lit/decorators.js' and friends.
      external: [/^lit($|\/)/, /^@lit\//, /^lit-html($|\/)/]
    }
  }
})
