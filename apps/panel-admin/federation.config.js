const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'panel-admin',

  exposes: {
    // Rutas de Admin/Gerente (alta de vehiculos + panel de envios en
    // tiempo real), expuestas al shell (ver
    // src/app/remote-entry/entry.routes.ts). El shell las monta con
    // loadRemoteModule({ remoteName: 'panel-admin', exposedModule: './Routes' }).
    './Routes': './src/app/remote-entry/entry.routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ]

  // Please read our FAQ about sharing libs:
  // https://shorturl.at/jmzH0

});
