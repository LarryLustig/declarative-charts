import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    // Use projects for different test environments (Vitest 4+)
    projects: [
      {
        // Unit tests - pure functions, no DOM
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        // Component tests - DOM required
        extends: true,
        test: {
          name: 'component',
          environment: 'happy-dom',
          include: ['test/component/**/*.test.ts'],
          setupFiles: ['./test/component/setup.ts'],
          // Ensure Lit is properly handled
          deps: {
            optimizer: {
              web: {
                include: ['lit', 'lit-html', '@lit/reactive-element'],
              },
            },
          },
        },
      },
    ],
  },
});
