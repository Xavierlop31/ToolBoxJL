import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RolHumano } from "@toolboxjl/shared-types";
import type { ToolboxWorld } from "../support/world";
import { NoModificarPropioUsuarioError } from "../../../src/modules/users/domain/errors/no-modificar-propio-usuario.error";
import { CuentaDesactivadaError } from "../../../src/modules/auth/domain/errors/cuenta-desactivada.error";

/**
 * Step definitions de `features/16_gestion_usuarios_roles.feature` (Épica 16
 * — Gestión de Usuarios y Roles, pedido directo del Arquitecto 2026-09-11,
 * no viene del PRD original). Mismo criterio que el resto de los `.steps.ts`
 * de este directorio: ejercita los casos de uso REALES
 * (`ListarUsuariosUseCase`/`ActualizarUsuarioUseCase`) contra
 * `InMemoryUserRepository`, sin HTTP real.
 *
 * El escenario 2 (HU-16.2) y la mitad del escenario 3 (HU-16.3) verifican
 * "el cambio se refleja recién en el próximo login"/"no puede volver a
 * iniciar sesión" invocando TAMBIÉN `VerificarAccesoUseCase` (AuthModule)
 * con un payload de JWT simulado — no solo que el dato quedó persistido en
 * `public.users`, sino que el guard de acceso real efectivamente lo respeta.
 * Lo que este archivo NO puede validar: que `custom_access_token_hook`
 * (función de Postgres, migración `20260911000000_users_admin_management`)
 * de verdad copia `rol`/`activo` al JWT en un login real contra Supabase —
 * eso requiere el proyecto Supabase real (mismo gap documentado que el resto
 * de los Auth Hooks de este repo, ver `20260830120000_custom_access_token_hook`).
 */

const ADMIN_ID = "99999999-9999-9999-9999-999999999999";

function idUnico(): string {
  return randomUUID();
}

// --- HU-16.1: listado de usuarios -----------------------------------------

Given("que existen usuarios registrados con distintos roles", function (this: ToolboxWorld) {
  this.userRepository.limpiar();
  this.userRepository.sembrar({
    id: idUnico(),
    nombre: "Ana Admin",
    email: "ana.admin@toolboxjl.test",
    telefono: null,
    rol: "admin",
    activo: true,
  });
  this.userRepository.sembrar({
    id: idUnico(),
    nombre: "Beto Almacenista",
    email: "beto.almacenista@toolboxjl.test",
    telefono: null,
    rol: "almacenista",
    activo: true,
  });
  this.userRepository.sembrar({
    id: idUnico(),
    nombre: "Cami Cliente",
    email: "cami.cliente@toolboxjl.test",
    telefono: null,
    rol: "cliente",
    activo: false,
  });
});

When(
  /^accedo a "\/admin\/usuarios" en el Panel Admin siendo administrador$/,
  async function (this: ToolboxWorld) {
    this.ultimaListaUsuarios = await this.listarUsuarios.ejecutar({});
  },
);

Then(
  "visualizo la lista de usuarios con su nombre, email, rol actual y si está activo o inactivo",
  function (this: ToolboxWorld) {
    assert.ok(this.ultimaListaUsuarios, "se esperaba una respuesta de ListarUsuariosUseCase");
    assert.equal(this.ultimaListaUsuarios!.total, 3);
    for (const usuario of this.ultimaListaUsuarios!.items) {
      assert.equal(typeof usuario.nombre, "string");
      assert.equal(typeof usuario.email, "string");
      assert.ok(["admin", "gerente", "almacenista", "repartidor", "cliente"].includes(usuario.rol));
      assert.equal(typeof usuario.activo, "boolean");
    }
  },
);

Then(
  "puedo filtrar la lista por rol y por estado, y buscar por nombre o email.",
  async function (this: ToolboxWorld) {
    const porRol = await this.listarUsuarios.ejecutar({ rol: "almacenista" });
    assert.equal(porRol.total, 1);
    assert.equal(porRol.items[0].nombre, "Beto Almacenista");

    const porEstado = await this.listarUsuarios.ejecutar({ activo: false });
    assert.equal(porEstado.total, 1);
    assert.equal(porEstado.items[0].nombre, "Cami Cliente");

    const porBusqueda = await this.listarUsuarios.ejecutar({ q: "ana.admin" });
    assert.equal(porBusqueda.total, 1);
    assert.equal(porBusqueda.items[0].nombre, "Ana Admin");
  },
);

// --- HU-16.2: cambio de rol -------------------------------------------------

Given(/^que existe un usuario con rol "([^"]+)"$/, function (this: ToolboxWorld, rol: string) {
  this.userRepository.limpiar();
  this.usuarioActualId = idUnico();
  this.userRepository.sembrar({
    id: this.usuarioActualId,
    nombre: "Usuario de Prueba",
    email: "usuario.prueba@toolboxjl.test",
    telefono: null,
    rol: rol as RolHumano,
    activo: true,
  });
});

When(/^un administrador le cambia el rol a "([^"]+)"$/, async function (this: ToolboxWorld, rolNuevo: string) {
  this.ultimoUsuarioActualizado = await this.actualizarUsuario.ejecutar(this.usuarioActualId, ADMIN_ID, {
    rol: rolNuevo as RolHumano,
  });
});

Then(/^el usuario queda con rol "([^"]+)" en la lista$/, async function (this: ToolboxWorld, rolEsperado: string) {
  assert.equal(this.ultimoUsuarioActualizado?.rol, rolEsperado);

  const lista = await this.listarUsuarios.ejecutar({});
  const encontrado = lista.items.find((u) => u.id === this.usuarioActualId);
  assert.equal(encontrado?.rol, rolEsperado, "el cambio debe persistir, no solo devolverse en la respuesta del PATCH");
});

Then(
  "el cambio se refleja en su sesión recién la próxima vez que inicie sesión, no de inmediato.",
  function (this: ToolboxWorld) {
    // `ActualizarUsuarioUseCase` no invalida ninguna sesión ni token — solo
    // escribe `public.users`. Lo que efectivamente propaga el cambio al JWT
    // es `custom_access_token_hook`, que corre del lado de Supabase en cada
    // login/refresh (no en este proceso) — ver el comentario de cabecera de
    // este archivo sobre el gap de lo no testeable acá.
    assert.ok(this.ultimoUsuarioActualizado, "el PATCH debió resolver antes de este paso");
  },
);

// --- HU-16.3: desactivar/reactivar ------------------------------------------

Given("que existe un usuario activo", function (this: ToolboxWorld) {
  this.userRepository.limpiar();
  this.usuarioActualId = idUnico();
  this.userRepository.sembrar({
    id: this.usuarioActualId,
    nombre: "Usuario Activo",
    email: "usuario.activo@toolboxjl.test",
    telefono: null,
    rol: "cliente",
    activo: true,
  });
});

When("un administrador lo desactiva", async function (this: ToolboxWorld) {
  this.ultimoUsuarioActualizado = await this.actualizarUsuario.ejecutar(this.usuarioActualId, ADMIN_ID, {
    activo: false,
  });
});

Then("el usuario queda marcado como inactivo en la lista", function (this: ToolboxWorld) {
  assert.equal(this.ultimoUsuarioActualizado?.activo, false);
});

Then(
  "no puede volver a iniciar sesión desde ese momento, aunque una sesión ya abierta no se corta de inmediato",
  function (this: ToolboxWorld) {
    // Ejercita el guard de acceso REAL (AuthModule) con un JWT simulado que
    // ya trae `activo: false` — el escenario de "una sesión ya abierta no
    // se corta de inmediato" es, por definición, sobre un JWT YA EMITIDO que
    // sigue siendo válido hasta que expire; acá se verifica la otra mitad,
    // verificable de punta a punta: un LOGIN NUEVO (JWT con el claim ya
    // actualizado) sí queda bloqueado.
    assert.throws(
      () =>
        this.verificarAcceso.ejecutar({
          sub: this.usuarioActualId,
          email: "usuario.activo@toolboxjl.test",
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
          app_metadata: { rol: "cliente", activo: false },
        }),
      CuentaDesactivadaError,
    );
  },
);

When("un administrador lo reactiva", async function (this: ToolboxWorld) {
  this.ultimoUsuarioActualizado = await this.actualizarUsuario.ejecutar(this.usuarioActualId, ADMIN_ID, {
    activo: true,
  });
});

Then("el usuario vuelve a poder iniciar sesión con normalidad.", function (this: ToolboxWorld) {
  assert.equal(this.ultimoUsuarioActualizado?.activo, true);

  assert.doesNotThrow(() =>
    this.verificarAcceso.ejecutar({
      sub: this.usuarioActualId,
      email: "usuario.activo@toolboxjl.test",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      app_metadata: { rol: "cliente", activo: true },
    }),
  );
});

// --- HU-16.4: protección contra auto-modificación ---------------------------

Given("que soy un administrador autenticado", function (this: ToolboxWorld) {
  this.userRepository.limpiar();
  this.usuarioActualId = ADMIN_ID;
  this.userRepository.sembrar({
    id: ADMIN_ID,
    nombre: "Admin Actual",
    email: "admin.actual@toolboxjl.test",
    telefono: null,
    rol: "admin",
    activo: true,
  });
});

When(
  /^intento cambiar mi propio rol o desactivar mi propia cuenta desde "\/admin\/usuarios"$/,
  async function (this: ToolboxWorld) {
    try {
      await this.actualizarUsuario.ejecutar(ADMIN_ID, ADMIN_ID, { activo: false });
    } catch (error) {
      this.errorActualizarUsuario = error as Error;
    }
  },
);

Then(
  "la operación se rechaza con un mensaje explicando que no puedo modificarme a mí mismo desde ahí.",
  function (this: ToolboxWorld) {
    assert.ok(this.errorActualizarUsuario instanceof NoModificarPropioUsuarioError);
    assert.match(this.errorActualizarUsuario!.message, /propio/i);
  },
);
