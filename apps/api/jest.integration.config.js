/**
 * Config de Jest separada para tests de integración que llaman a APIs
 * externas reales (hoy: WhatsApp Cloud API, ver test/integration/*). Nunca
 * corre como parte de `pnpm test`/`pnpm turbo run test` (ese pipeline usa
 * `jest.config.js`, con `rootDir: "src"` — este archivo directamente no
 * matchea nada ahí). Se invoca explícito con
 * `pnpm --filter @toolboxjl/api run test:integration:whatsapp`, en un job
 * de CI aparte que sí tiene los secrets reales de WhatsApp Cloud API como
 * `env:` — ver .github/workflows/whatsapp-otp-integration.yml.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test/integration",
  testRegex: String.raw`.*\.integration\.spec\.ts$`,
  setupFiles: ["reflect-metadata"],
  moduleFileExtensions: ["js", "json", "ts"],
};
