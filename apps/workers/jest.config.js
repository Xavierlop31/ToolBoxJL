/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: String.raw`.*\.spec\.ts$`,
  moduleFileExtensions: ["js", "json", "ts"],
  collectCoverageFrom: ["**/*.(t|j)s", "!**/*.spec.ts"],
  coverageDirectory: "../coverage",
};
