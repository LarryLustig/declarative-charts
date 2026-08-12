import { defineConfig, type Plugin } from 'vite'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * The example pages, built as a static site.
 *
 * Every example page loads the library with
 * `<script type="module" src="../src/index.ts">`, which only resolves under the
 * dev server. From a plain clone or a file host they render nothing — four
 * pages once pointed at `dist/` instead, which is gitignored, and were blank on
 * a fresh checkout. Running them through Vite compiles the TypeScript and
 * rewrites the reference, so what is published is the same pages the examples
 * tests already check.
 *
 * Every `.html` under `examples/` is an entry point, discovered rather than
 * listed: a page added without a corresponding line in a config would be a page
 * that silently never ships.
 *
 * `base: './'` emits relative asset paths, so the output works at a GitHub
 * Pages project URL, at a domain root, or from a subdirectory, without the
 * config having to know which.
 *
 * Output goes to `site/`, not `dist/` — `dist/` is the published package, and
 * `emptyOutDir` here would delete it.
 */
const examples = readdirSync(resolve(__dirname, 'examples'))
  .filter(f => f.endsWith('.html'))

/**
 * Copy `examples.js` verbatim.
 *
 * The pages load it with a classic `<script src="examples.js">`, which Vite
 * leaves alone — it rewrites module scripts and stylesheets, not these — so the
 * built pages 404'd on it and lost their navigation. Copying keeps the source
 * pages byte-identical between the dev server and the built site, which is the
 * property the example tests depend on.
 */
function copyExamplesScript(): Plugin {
  return {
    name: 'copy-examples-script',
    apply: 'build',
    closeBundle() {
      const out = resolve(__dirname, 'site', 'examples')
      mkdirSync(out, { recursive: true })
      copyFileSync(
        resolve(__dirname, 'examples', 'examples.js'),
        resolve(out, 'examples.js')
      )

      // README images are served from here. The README references them by
      // absolute URL so they also render on npmjs.com, where relative paths do
      // not resolve — which means Pages has to carry them.
      const img = resolve(__dirname, 'docs', 'img')
      if (existsSync(img)) {
        const dest = resolve(__dirname, 'site', 'img')
        mkdirSync(dest, { recursive: true })
        for (const f of readdirSync(img)) copyFileSync(resolve(img, f), resolve(dest, f))
      }
    }
  }
}

/**
 * Fail the build if the library was tree-shaken out of it.
 *
 * This is not hypothetical. `package.json` declared
 * `"sideEffects": ["*.js", "*.cjs"]` — correct for the published package, which
 * contains no TypeScript — and Rollup consults that field when building from
 * `src/` too. Concluding the `.ts` files were side-effect-free, it dropped every
 * `customElements.define`, and every page built successfully into a
 * 711-byte polyfill and 37 pages of inert markup.
 *
 * Nothing complained. The pages were valid HTML with unupgraded custom elements,
 * which render as nothing at all. That is the same failure the package smoke
 * test exists to catch, arriving by a route the smoke test cannot see because it
 * checks the published artifacts rather than a build from source.
 */
function assertLibraryBundled(): Plugin {
  return {
    name: 'assert-library-bundled',
    apply: 'build',
    closeBundle() {
      const assets = resolve(__dirname, 'site', 'assets')
      const js = readdirSync(assets).filter(f => f.endsWith('.js'))
      const registers = js.some(f =>
        readFileSync(resolve(assets, f), 'utf8').includes('customElements.define')
      )

      if (!registers) {
        throw new Error(
          'site build: no customElements.define in any emitted chunk — the library was ' +
          'tree-shaken away. Check that package.json `sideEffects` still lists "*.ts".'
        )
      }
    }
  }
}

export default defineConfig({
  base: './',
  plugins: [copyExamplesScript(), assertLibraryBundled()],
  build: {
    outDir: 'site',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ...Object.fromEntries(
          examples.map(f => [`examples/${f.replace(/\.html$/, '')}`, resolve(__dirname, 'examples', f)])
        )
      }
    }
  }
})
