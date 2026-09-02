import { RegistrarUnidadUseCase } from "./registrar-unidad.use-case";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";
import { InMemoryToolUnitRepository } from "../infrastructure/in-memory/in-memory-tool-unit.repository";
import { InMemoryToolModelRepository } from "../infrastructure/in-memory/in-memory-tool-model.repository";
import { QrCodeGeneratorService } from "../infrastructure/qr/qrcode-generator.service";

describe("RegistrarUnidadUseCase", () => {
  async function armar() {
    const unidades = new InMemoryToolUnitRepository();
    const modelos = new InMemoryToolModelRepository();
    const qr = new QrCodeGeneratorService();
    const useCase = new RegistrarUnidadUseCase(unidades, modelos, qr);
    const modelo = await modelos.crear({
      nombre: "Sierra Circular CS-200",
      marca: "Makita",
      categoria: "Sierras",
      tarifa_dia: 35000,
    });
    return { useCase, modelo };
  }

  it("Sprint 14 (HU-13.2): persiste fecha_adquisicion/costo_compra/ubicacion_bodega", async () => {
    const { useCase, modelo } = await armar();

    const unidad = await useCase.ejecutar({
      modelo_id: modelo.id,
      numero_serie: "SN-100",
      fecha_adquisicion: "2026-08-01",
      costo_compra: 850000,
      ubicacion_bodega: "Estante A3",
    });

    expect(unidad.fecha_adquisicion).toBe("2026-08-01");
    expect(unidad.costo_compra).toBe(850000);
    expect(unidad.ubicacion_bodega).toBe("Estante A3");
    expect(unidad.qr_code_url).toMatch(/^data:image\/png;base64,/);
  });

  it("acepta llamadores sin los 3 campos nuevos (compatibilidad con BDD de Sprint 1)", async () => {
    const { useCase, modelo } = await armar();

    const unidad = await useCase.ejecutar({
      modelo_id: modelo.id,
      numero_serie: "SN-101",
    });

    expect(unidad.fecha_adquisicion).toBeNull();
    expect(unidad.costo_compra).toBeNull();
    expect(unidad.ubicacion_bodega).toBeNull();
  });

  it("propaga ModeloNoEncontradoError si el modelo no existe", async () => {
    const { useCase } = await armar();

    await expect(
      useCase.ejecutar({ modelo_id: "no-existe", numero_serie: "SN-102" }),
    ).rejects.toThrow(ModeloNoEncontradoError);
  });
});
