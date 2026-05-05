// ─── Vitest Config ────────────────────────────────────────────────────────────
//
// ESM-first (type:module) + NodeNext resolution.
// pool:forks garante isolamento correto em modo ESM sem --experimental-vm-modules.
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    // vitest usa o tsconfig padrão do projeto; o tsconfig.test.json com
    // module:ESNext + moduleResolution:bundler elimina a necessidade de
    // extensões .js nos imports de testes e permite resolução correta em ESM.
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    coverage: {
      provider: 'v8',
      include: ['src/application/use-cases/**'],
      reporter: ['text', 'lcov'],
    },
  },
})
