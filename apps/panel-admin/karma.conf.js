// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
//
// Copia explícita del template por defecto de Angular CLI
// (@schematics/angular/config/files/karma.conf.js.template) con un único
// cambio: agrega el reporter `lcovonly` para que `ng test --code-coverage`
// también genere `coverage/panel-admin/lcov.info` — SonarCloud (proyecto
// Xavierlop31_ToolBoxJL) lo necesita para reportar coverage de este remote
// (Issue #89). El builder por defecto de Angular (`@angular-devkit/build-
// angular:karma`) solo emite `html` + `text-summary`, nunca `lcov`.

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma'),
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
      dir: require('path').join(__dirname, './coverage/panel-admin'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }, { type: 'lcovonly' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
