// Valida la sintaxis de todos los archivos features/*.feature.
// Etapa 1 del gate de SDD (Plan de Implementación §1.1): validación de sintaxis.
// La etapa 2 (ejecución real de los escenarios contra step definitions con
// Cucumber/Playwright-BDD) se activa módulo a módulo a medida que exista
// código de aplicación — este script solo garantiza que los .feature nunca
// queden con Gherkin inválido en main.
import { readdirSync, readFileSync } from "node:fs";
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

const dir = "features";
const files = readdirSync(dir).filter((f) => f.endsWith(".feature"));

if (files.length === 0) {
  console.error(`No se encontraron archivos .feature en ${dir}/`);
  process.exit(1);
}

let errors = 0;
let totalScenarios = 0;

for (const file of files) {
  const uuidFn = IdGenerator.uuid();
  const builder = new AstBuilder(uuidFn);
  const matcher = new GherkinClassicTokenMatcher();
  const parser = new Parser(builder, matcher);
  try {
    const doc = parser.parse(readFileSync(`${dir}/${file}`, "utf8"));
    const scenarioCount = doc.feature.children.filter(
      (c) => c.scenario
    ).length;
    totalScenarios += scenarioCount;
    console.log(`OK  ${file} — ${scenarioCount} escenario(s) — ${doc.feature.name}`);
  } catch (e) {
    errors++;
    console.error(`ERROR ${file}: ${e.message}`);
  }
}

console.log(`\n${files.length} archivo(s), ${totalScenarios} escenario(s) totales.`);

if (errors > 0) {
  console.error(`\n${errors} archivo(s) con Gherkin inválido.`);
  process.exit(1);
}
