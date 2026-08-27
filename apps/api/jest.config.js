/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: String.raw`.*\.spec\.ts$`,
  setupFiles: ["reflect-metadata"],
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["**/*.(t|j)s", "!**/*.spec.ts"],
  coverageDirectory: "../coverage",
  // `collectCoverage: true` (no un flag `--coverage` en el script "test") para
  // que SonarCloud reciba lcov.info tanto en local como en CI sin depender de
  // cómo se invoque jest — ver sonar-project.properties.
  collectCoverage: true,
  coverageReporters: ["lcov", "text-summary"],
};
