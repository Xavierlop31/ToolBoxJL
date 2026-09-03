import { ListarUnidadesUseCase } from "./listar-unidades.use-case";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../infrastructure/in-memory/in-memory-tool-model.repository";
import { InMemoryOrderRepository } from "../../orders/infrastructure/in-memory/in-memory-order.repository";
import { QrCodeGeneratorService } from "../infrastructure/qr/qrcode-generator.service";

/**
 * Cada `armarEscenario()` genera 3 códigos QR reales (`QrCodeGeneratorService`,
 * PNG real vía `qrcode`, no un mock) porque `expande modelo_nombre/...` abajo
 * verifica el formato real de `qr_code_url`. Bajo carga de CI (Turborepo
 * corriendo varios paquetes en paralelo) esa generación CPU-bound
 * ocasionalmente supera el timeout default de Jest (5000ms) — confirmado
 * flaky en Sprint 14 (PR #175) y Sprint 15 (PR #181): la cantidad de tests
 * que fallan varía entre corridas (1/2/3) y el mismo código ya pasó verde en
 * el CI scoped a nivel de PR. Timeout más alto acá en vez de mockear
 * `QrCodeGeneratorService` — mockearlo perdería la cobertura real de que
 * `qr_code_url` es un PNG válido, que es justamente lo que un test unitario
 * de este caso de uso debe verificar.
 */
jest.setTimeout(20000);

describe("ListarUnidadesUseCase", () => {
  async function armarEscenario() {
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const ordenes = new InMemoryOrderRepository();
    const qr = new QrCodeGeneratorService();
    const useCase = new ListarUnidadesUseCase(unidades, modelos, ordenes, qr);

    const modelo = await modelos.crear({
      nombre: "Taladro Percutor XR-500",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 45000,
    });

    const operativa = await unidades.crear({
      modeloId: modelo.id,
      numeroSerie: "SN-OPERATIVA-1",
    });
    const enMantenimiento = await unidades.crear({
      modeloId: modelo.id,
      numeroSerie: "SN-MANTENIMIENTO-1",
    });
    await unidades.actualizarEstado(enMantenimiento.id, "En Mantenimiento");
    const enAlquiler = await unidades.crear({
      modeloId: modelo.id,
      numeroSerie: "SN-ALQUILER-1",
    });

    // Orden confirmada con un ítem de la unidad "enAlquiler" — la marca como
    // "En Alquiler" en la visualización sin cambiar su ToolUnit.estado.
    const orden = await ordenes.crear({
      clienteId: "cliente-1",
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: "zona-1",
      items: [{ unidadId: enAlquiler.id, tarifaAplicada: 45000 }],
    });
    await ordenes.actualizarEstado(orden.id, "confirmada");

    return { useCase, modelo, operativa, enMantenimiento, enAlquiler };
  }

  it("expande modelo_nombre/modelo_categoria y calcula estado_visualizacion por fila", async () => {
    const { useCase, modelo, operativa, enMantenimiento, enAlquiler } = await armarEscenario();

    const resultado = await useCase.ejecutar({});

    expect(resultado.total).toBe(3);
    const porId = new Map(resultado.items.map((u) => [u.id, u]));

    expect(porId.get(operativa.id)?.estado_visualizacion).toBe("Operativo");
    expect(porId.get(enMantenimiento.id)?.estado_visualizacion).toBe("En Mantenimiento");
    expect(porId.get(enAlquiler.id)?.estado_visualizacion).toBe("En Alquiler");
    for (const item of resultado.items) {
      expect(item.modelo_nombre).toBe(modelo.nombre);
      expect(item.modelo_categoria).toBe(modelo.categoria);
      expect(item.qr_code_url).toMatch(/^data:image\/png;base64,/);
    }
  });

  it("filtra por estado de visualización", async () => {
    const { useCase, enAlquiler } = await armarEscenario();

    const resultado = await useCase.ejecutar({ estado: "En Alquiler" });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.items[0].id).toBe(enAlquiler.id);
    expect(resultado.total).toBe(1);
  });

  it("filtra por texto libre contra numero_serie, id (QR) y modelo_nombre", async () => {
    const { useCase, operativa } = await armarEscenario();

    const porSerial = await useCase.ejecutar({ q: "OPERATIVA-1" });
    expect(porSerial.items).toHaveLength(1);
    expect(porSerial.items[0].id).toBe(operativa.id);

    const porModelo = await useCase.ejecutar({ q: "taladro" });
    expect(porModelo.total).toBe(3);

    const porQr = await useCase.ejecutar({ q: operativa.id });
    expect(porQr.items).toHaveLength(1);
    expect(porQr.items[0].id).toBe(operativa.id);
  });

  it("pagina con default page=1/pageSize=20 cuando no se especifican", async () => {
    const { useCase } = await armarEscenario();

    const resultado = await useCase.ejecutar({});

    expect(resultado.page).toBe(1);
    expect(resultado.pageSize).toBe(20);
    expect(resultado.items).toHaveLength(3);
  });

  it("respeta page/pageSize provistos", async () => {
    const { useCase } = await armarEscenario();

    const resultado = await useCase.ejecutar({ page: 2, pageSize: 2 });

    expect(resultado.items).toHaveLength(1);
    expect(resultado.total).toBe(3);
    expect(resultado.page).toBe(2);
    expect(resultado.pageSize).toBe(2);
  });
});
