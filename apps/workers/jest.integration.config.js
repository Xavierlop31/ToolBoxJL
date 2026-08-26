/**
 * Config de Jest separada para el test de integración que llama a la API
 * REAL de Anthropic (Agente 1, Sprint 7, Issue #22) — mismo criterio que
 * `apps/api/jest.integration.config.js` (WhatsApp Cloud API, Sprint 6).
 * Nunca corre como parte de `pnpm test`/`pnpm turbo run test` (ese pipeline
 * usa `jest.config.js`, con `rootDir: "src"` — este archivo no matchea nada
 * ahí). Se invoca explícito con
 * `pnpm --filter @toolboxjl/workers run test:integration:agente1`, en un
 * job de CI aparte que sí tiene `ANTHROPIC_API_KEY` real como `env:` — ver
 * .github/workflows/agente-1-ruteo-integration.yml.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test/integration",
  testRegex: String.raw`.*\.integration\.spec\.ts$`,
  moduleFileExtensions: ["js", "json", "ts"],
};
