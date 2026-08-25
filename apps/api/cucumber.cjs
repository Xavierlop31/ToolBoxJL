// Config de Cucumber (BDD, punto 5 del prompt del Tech Lead — Sprint 1).
//
// Corre `features/01_catalogo_inventario.feature` y `features/02_cotizacion_alquiler_venta.feature`
// contra los step definitions de apps/api/test/bdd.
module.exports = {
  default: {
    paths: [
      "../../features/01_catalogo_inventario.feature",
      "../../features/02_cotizacion_alquiler_venta.feature",
      "../../features/03_pagos_garantia.feature"
    ],
    require: ["test/bdd/support/**/*.ts", "test/bdd/step-definitions/**/*.ts"],
    requireModule: ["ts-node/register"],
    format: ["progress"],
  },
};
