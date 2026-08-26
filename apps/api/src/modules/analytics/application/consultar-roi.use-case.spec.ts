import { randomUUID } from "node:crypto";
import { InMemoryRoiRepository } from "../infrastructure/in-memory/in-memory-roi.repository";
import { ConsultarRoiUseCase } from "./consultar-roi.use-case";

describe("ConsultarRoiUseCase", () => {
  let repo: InMemoryRoiRepository;
  let useCase: ConsultarRoiUseCase;

  beforeEach(() => {
    repo = new InMemoryRoiRepository();
    useCase = new ConsultarRoiUseCase(repo);
  });

  it("calcula (Ingresos Acumulados - Costo de Compra) / Costo de Compra x 100 por modelo", async () => {
    const modeloId = randomUUID();
    repo.sembrar({ modeloId, costoCompra: 1_000_000, ingresosAcumulados: 1_500_000 });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([{ modelo_id: modeloId, roi_pct: 50 }]);
  });

  it("admite ROI negativo cuando los ingresos acumulados no cubren el costo de compra", async () => {
    const modeloId = randomUUID();
    repo.sembrar({ modeloId, costoCompra: 1_000_000, ingresosAcumulados: 200_000 });

    const resultado = await useCase.ejecutar();

    expect(resultado[0].roi_pct).toBe(-80);
  });

  it("filtra por modelo_id cuando se pasa", async () => {
    const modeloA = randomUUID();
    const modeloB = randomUUID();
    repo.sembrar({ modeloId: modeloA, costoCompra: 1_000_000, ingresosAcumulados: 2_000_000 });
    repo.sembrar({ modeloId: modeloB, costoCompra: 500_000, ingresosAcumulados: 100_000 });

    const resultado = await useCase.ejecutar(modeloA);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].modelo_id).toBe(modeloA);
  });

  it("excluye modelos sin costo_compra cargado (GAP documentado: no se puede calcular ROI sin dividir por un dato inexistente)", async () => {
    const modeloId = randomUUID();
    repo.sembrar({ modeloId, costoCompra: null, ingresosAcumulados: 500_000 });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([]);
  });

  it("excluye modelos con costo_compra en 0", async () => {
    const modeloId = randomUUID();
    repo.sembrar({ modeloId, costoCompra: 0, ingresosAcumulados: 500_000 });

    const resultado = await useCase.ejecutar();

    expect(resultado).toEqual([]);
  });
});
