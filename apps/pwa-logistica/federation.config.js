const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'pwa-logistica',

  exposes: {
    // Rutas de escaneo QR + cambio de estado, expuestas al shell (ver
    // src/app/remote-entry/entry.routes.ts). El shell las monta con
    // loadRemoteModule({ remoteName: 'pwa-logistica', exposedModule: './Routes' }).
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
