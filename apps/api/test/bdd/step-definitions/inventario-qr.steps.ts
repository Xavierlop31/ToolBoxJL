import { Given, Then, When } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { ToolboxWorld } from "../support/world";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Step definitions de `features/13_gestion_inventario_qr.feature` (Sprint 14,
 * Fase 3, Épica 13, Issues #147-#150). De los 9 escenarios del archivo, SOLO
 * se conectan acá los 3 que tienen lógica de backend real y verificable
 * desde un `TestingModule` (sin HTTP/JWT, mismo criterio que el resto de los
 * step-definitions de este repo — ver la nota de cabecera de
 * `carrito-multi-item.steps.ts` para el precedente):
 *
 * - `@HU-13.2` "Registro exitoso y generación de QR imprimible": el ÚNICO de
 *   los 2 escenarios `@HU-13.2` con una aserción explícita de backend ("el
 *   sistema registra la unidad en 'POST /inventory/units'", "genera un
 *   código QR..."). El otro ("Apertura del formulario de registro desde el
 *   panel") es "se abre un modal" — puro layout, sin nada que este
 *   `TestingModule` pueda verificar.
 * - `@HU-13.3` "Asignación de una unidad a mantenimiento" y "Retorno a
 *   estado operativo o baja definitiva": ambos ejercitan directamente
 *   `ActualizarEstadoUnidadUseCase` con los 6 campos nuevos de la orden de
 *   taller/baja (Sprint 14) y sus efectos de dominio reales (transición de
 *   estado, exclusión de `ConsultarDisponibilidadUseCase`, entrada en la
 *   hoja de vida). El tercer escenario `@HU-13.3` ("Visualización de la
 *   pestaña de mantenimiento") es "Cuando hago clic en la pestaña...
 *   Entonces visualizo la lista" — navegación de UI; `GET
 *   /inventory/maintenance` (`ListarMantenimientoUseCase`) ya tiene su
 *   propia cobertura de Jest (`listar-mantenimiento.use-case.spec.ts`), no
 *   hace falta duplicarla acá disfrazada de un escenario que no la describe
 *   en esos términos.
 *
 * `@HU-13.1` (tarjetas de KPIs, filtros de tabla) y `@HU-13.4` (rutas del
 * día) quedan FUERA a propósito: sus 4 escenarios están redactados en
 * términos 100% de UI del panel admin ("accedo a /logistica/inventario",
 * "la tabla filtra instantáneamente", "visualizo la lista de repartidores
 * con...") — ningún escenario referencia un endpoint ni un efecto de
 * dominio verificable sin renderizar la tabla/las tarjetas real de
 * `apps/panel-admin`. `GET /inventory/units`/`GET /inventory/metrics`/`GET
 * /logistics/routes-today` tienen su propia cobertura de Jest
 * (`listar-unidades.use-case.spec.ts`, `obtener-metricas-inventario.use-case.spec.ts`,
 * `rutas-hoy.use-case.spec.ts`) — mismo criterio que el resto de los
 * endpoints "de tabla/dashboard" de sprints anteriores (ver
 * `12_catalogo_avanzado_carrito.feature`, escenarios de paginación).
 *
 * Por las mismas 2 razones (paréntesis y barras `/` dentro del texto del
 * Gherkin, caracteres especiales de Cucumber Expressions), varios steps de
 * abajo se registran con un RegExp literal en vez de un Cucumber Expression
 * — mismo recurso que ya usa `agente-conserje-voz.steps.ts` para `POST
 * /cart/add-item`.
 */

// ============================================================================
// HU-13.2 — Registro exitoso y generación de QR imprimible
// ============================================================================

Given(
  /^que completo los campos obligatorios: Modelo de Herramienta, Número de Serie del Fabricante, Fecha de Adquisición, Costo de Compra y Ubicación en Bodega \(Estante\/Fila\)$/,
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "almacenista";
    this.ultimoModelo = await this.registrarModelo.ejecutar({
      nombre: "Rotomartillo RH-40",
      marca: "Bosch",
      categoria: "Rotomartillos",
      tarifa_dia: 40000,
    });
    // El formulario se "completa" acá pero no se envía hasta el When
    // (clic en "Guardar y Generar QR") — mismo criterio que un formulario
    // real del panel admin.
    this.formularioRegistroUnidad = {
      modelo_id: this.ultimoModelo.id,
      numero_serie: "TBJL-DEM-0089",
      fecha_adquisicion: "2026-08-15",
      costo_compra: 1200000,
      ubicacion_bodega: "Estante A3",
    };
  },
);

When('hago clic en "Guardar y Generar QR"', async function (this: ToolboxWorld) {
  this.ultimaUnidad = await this.registrarUnidad.ejecutar(this.formularioRegistroUnidad!);
});

Then(
  /^el sistema registra la unidad en "POST \/inventory\/units"$/,
  function (this: ToolboxWorld) {
    assert.ok(this.ultimaUnidad, "se esperaba que la unidad se hubiera registrado");
    assert.match(this.ultimaUnidad!.id, UUID_REGEX);
    assert.equal(this.ultimaUnidad!.numero_serie, "TBJL-DEM-0089");
    assert.equal(this.ultimaUnidad!.fecha_adquisicion, "2026-08-15");
    assert.equal(this.ultimaUnidad!.costo_compra, 1200000);
    assert.equal(this.ultimaUnidad!.ubicacion_bodega, "Estante A3");
  },
);

Then(
  /^genera un código QR vectorial con el UUID y código de serie \(ej: "TBJL-DEM-0089"\)$/,
  function (this: ToolboxWorld) {
    const unidad = this.ultimaUnidad!;
    assert.match(unidad.qr_code_url, /^data:image\/png;base64,/);
    // "código de serie" del ejemplo del PRD == numero_serie que ingresó el
    // almacenista — ver openapi.yaml, descripción de POST /inventory/units,
    // sobre por qué no se genera un identificador propio adicional.
    assert.equal(unidad.numero_serie, "TBJL-DEM-0089");
  },
);

Then(
  "muestra una vista previa lista para imprimir en impresora térmica de etiquetas con el logo de ToolBox JL.",
  function (this: ToolboxWorld) {
    // El diseño imprimible de la etiqueta (logo, layout) es responsabilidad
    // del frontend (panel-admin) — desde acá se verifica la precondición de
    // datos que esa vista previa necesita: un QR imprimible real y el
    // serial legible que va junto a él en la etiqueta.
    const unidad = this.ultimaUnidad!;
    assert.ok(unidad.qr_code_url.length > "data:image/png;base64,".length);
    assert.ok(unidad.numero_serie.length > 0);
  },
);

// ============================================================================
// HU-13.3 — Asignación de una unidad a mantenimiento
// ============================================================================

Given("que selecciono una herramienta de la lista", async function (this: ToolboxWorld) {
  this.usuarioActualId = randomUUID();
  this.rolActual = "almacenista";
  const modelo = await this.registrarModelo.ejecutar({
    nombre: "Taladro Percutor XR-500",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 45000,
  });
  this.ultimaUnidad = await this.registrarUnidad.ejecutar({
    modelo_id: modelo.id,
    numero_serie: `SN-TALLER-${randomUUID().slice(0, 8)}`,
  });
});

When(
  /^registro la orden de taller indicando: Tipo \(Preventivo \/ Correctivo\), Falla reportada, Técnico asignado, Costo estimado y Fecha prevista de finalización$/,
  async function (this: ToolboxWorld) {
    const entrada = await this.actualizarEstado.ejecutar(
      this.ultimaUnidad!.id,
      "En Mantenimiento",
      [],
      this.usuarioActualId,
      {
        tipoMantenimiento: "Preventivo",
        fallaReportada: "Ruido anormal al operar",
        tecnicoAsignado: "Juan Pérez",
        costoEstimado: 60000,
        fechaPrevistaFin: "2026-09-20",
      },
    );
    this.ultimosLogs = [entrada];
  },
);

Then('el estado de la unidad cambia a "En Mantenimiento"', async function (this: ToolboxWorld) {
  const actualizada = await this.obtenerUnidad.ejecutar(this.ultimaUnidad!.id);
  assert.equal(actualizada.estado, "En Mantenimiento");
});

Then(
  "la unidad deja de estar disponible para alquiler en el catálogo público",
  async function (this: ToolboxWorld) {
    // Única unidad de este modelo creada en el escenario: si
    // ConsultarDisponibilidadUseCase (RF-1.4) la excluye correctamente por
    // estar "En Mantenimiento", unidades_disponibles debe quedar en 0.
    const disponibilidad = await this.consultarDisponibilidad.ejecutar(
      this.ultimaUnidad!.modelo_id,
      "2026-09-01",
      "2026-09-30",
    );
    assert.equal(disponibilidad.unidades_disponibles, 0);
  },
);

Then("el evento se añade a la hoja de vida de la unidad.", function (this: ToolboxWorld) {
  assert.equal(this.ultimosLogs.length, 1);
  const [entrada] = this.ultimosLogs;
  assert.equal(entrada.unidad_id, this.ultimaUnidad!.id);
  assert.equal(entrada.estado_nuevo, "En Mantenimiento");
  assert.equal(entrada.tipo_mantenimiento, "Preventivo");
  assert.equal(entrada.falla_reportada, "Ruido anormal al operar");
  assert.equal(entrada.tecnico_asignado, "Juan Pérez");
  assert.equal(entrada.costo_estimado, 60000);
  assert.equal(entrada.fecha_prevista_fin, "2026-09-20");
});

// ============================================================================
// HU-13.3 — Retorno a estado operativo o baja definitiva
//
// El escenario narra 2 transiciones ALTERNATIVAS sobre la misma acción ("o")
// en vez de un Scenario Outline con Examples — mismo caso que el step de
// RF-1.3 en `catalogo-inventario.steps.ts` ("a uno de {string}, ... o
// {string}"): se ejercitan AMBAS transiciones en el mismo When, sobre 2
// unidades independientes (una por transición), para cubrir de verdad "o"
// en vez de un único valor hardcodeado.
// ============================================================================

Given(
  "que una herramienta ha finalizado su reparación o presenta daño irreparable",
  async function (this: ToolboxWorld) {
    this.usuarioActualId = randomUUID();
    this.rolActual = "almacenista";
    const modelo = await this.registrarModelo.ejecutar({
      nombre: "Compresor de Aire CA-50",
      marca: "DeWalt",
      categoria: "Compresores",
      tarifa_dia: 30000,
    });

    this.unidadAReintegrar = await this.registrarUnidad.ejecutar({
      modelo_id: modelo.id,
      numero_serie: `SN-REINTEGRO-${randomUUID().slice(0, 8)}`,
    });
    await this.actualizarEstado.ejecutar(
      this.unidadAReintegrar.id,
      "En Mantenimiento",
      [],
      this.usuarioActualId,
    );

    this.unidadADarDeBaja = await this.registrarUnidad.ejecutar({
      modelo_id: modelo.id,
      numero_serie: `SN-BAJA-${randomUUID().slice(0, 8)}`,
    });
    await this.actualizarEstado.ejecutar(
      this.unidadADarDeBaja.id,
      "En Mantenimiento",
      [],
      this.usuarioActualId,
    );
  },
);

When(
  /^el técnico marca "Reintegrar a Servicio" \(con checklist superado\) o "Declarar Baja Definitiva" \(con acta de descarte\)$/,
  async function (this: ToolboxWorld) {
    // "Reintegrar a Servicio" — sin datos de taller/baja (no aplican).
    await this.actualizarEstado.ejecutar(
      this.unidadAReintegrar!.id,
      "Operativo",
      [],
      this.usuarioActualId,
    );
    // "Declarar Baja Definitiva" — con motivo_baja (acta de descarte).
    this.entradaBaja = await this.actualizarEstado.ejecutar(
      this.unidadADarDeBaja!.id,
      "Dado de Baja",
      [],
      this.usuarioActualId,
      { motivoBaja: "Daño irreparable en el motor — acta de descarte adjunta" },
    );
  },
);

Then(
  'el sistema actualiza el estado a "Operativo" o "Dado de Baja" respectivamente.',
  async function (this: ToolboxWorld) {
    const reintegrada = await this.obtenerUnidad.ejecutar(this.unidadAReintegrar!.id);
    const dadaDeBaja = await this.obtenerUnidad.ejecutar(this.unidadADarDeBaja!.id);

    assert.equal(reintegrada.estado, "Operativo");
    assert.equal(dadaDeBaja.estado, "Dado de Baja");
    assert.equal(
      this.entradaBaja?.motivo_baja,
      "Daño irreparable en el motor — acta de descarte adjunta",
    );
  },
);
