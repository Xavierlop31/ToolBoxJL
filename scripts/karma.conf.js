// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
//
// *** ARCHIVO ÚNICO COMPARTIDO POR LAS 4 APPS ANGULAR ***
// (shell/angular.json, portal-cliente/angular.json, panel-admin/angular.json
// y pwa-logistica/angular.json apuntan las cuatro a este mismo archivo vía
// `"test": { "options": { "karmaConfig": "../../scripts/karma.conf.js" } }`
// — misma ruta relativa desde cada una, mismo profundidad apps/<app>/).
//
// Nace de un hallazgo real de SonarQube (Issue #89, Sprint 11): antes había
// una copia casi idéntica de este archivo en cada app (el template por
// defecto de Angular CLI + el reporter `lcovonly` para coverage), y el
// Quality Gate de "new code" rechazó el PR por duplicación (60.4% de líneas
// nuevas duplicadas, umbral 3%). Agregar `**/karma.conf.js` a
// `sonar.cpd.exclusions` en sonar-project.properties NO alcanzó: SonarCloud
// sigue en modo "Automatic Analysis" para PRs (el scan CI-based de ci.yml
// solo corre en push a main/dev) y ese modo no respeta las exclusiones de
// CPD del archivo de propiedades del repo — confirmado empíricamente, el
// hallazgo de duplicación seguía idéntico después de agregar la exclusión.
// La solución real es no tener el duplicado, no suprimirlo: un solo archivo,
// sin copias.
//
// El nombre de la app (para el directorio de coverage) y la resolución de
// plugins de Karma se derivan de `process.cwd()`, NO de `__dirname` (que acá
// siempre sería `scripts/`, sin importar qué app está corriendo). Esto
// funciona porque `ng test` siempre corre con el cwd puesto en la raíz de la
// app (así invoca pnpm cualquier script de package.json: `apps/<app>/
// package.json` → cwd = `apps/<app>/` — mismo criterio ya usado por
// `prebuild` en cada package.json, que llama a
// `../../scripts/generate-frontend-config.mjs <app>` con una ruta relativa
// desde ese mismo cwd). `karma-jasmine`/etc. son devDependencies de cada app
// Angular, no de la raíz del workspace — bajo pnpm (sin hoisting por
// defecto) un require() normal desde este archivo (que vive en scripts/) no
// las resolvería; `require.resolve(nombre, { paths: [process.cwd()] })`
// fuerza la búsqueda a empezar en el cwd de la app en vez de en la ubicación
// física de este archivo.

const path = require("node:path");

const appDir = process.cwd();
const appName = path.basename(appDir);

function requerirDesdeApp(nombrePaquete) {
  return require(require.resolve(nombrePaquete, { paths: [appDir] }));
}

module.exports = function karmaConfig(config) {
  config.set({
    basePath: "",
    frameworks: ["jasmine", "@angular-devkit/build-angular"],
    plugins: [
      requerirDesdeApp("karma-jasmine"),
      requerirDesdeApp("karma-chrome-launcher"),
      requerirDesdeApp("karma-jasmine-html-reporter"),
      requerirDesdeApp("karma-coverage"),
      requerirDesdeApp("@angular-devkit/build-angular/plugins/karma"),
    ],
    client: {
      jasmine: {
        // you can add configuration options for Jasmine here
        // the possible options are listed at https://jasmine.github.io/api/edge/Configuration.html
        // for example, you can disable the random execution with `random: false`
        // or set a specific seed with `seed: 4321`
      },
    },
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: path.join(appDir, "coverage", appName),
      subdir: ".",
      reporters: [{ type: "html" }, { type: "text-summary" }, { type: "lcovonly" }],
    },
    reporters: ["progress", "kjhtml"],
    browsers: ["Chrome"],
    restartOnFileChange: true,
  });
};
