import { randomUUID } from "node:crypto";
import { NotFoundException } from "@nestjs/common";
import type { ToolModel } from "@toolboxjl/shared-types";
import { CatalogController } from "./catalog.controller";
import { ModeloNoEncontradoError } from "../domain/errors/modelo-no-encontrado.error";

function crearMockUseCase() {
  return { ejecutar: jest.fn() };
}

function modeloFake(overrides: Partial<ToolModel> = {}): ToolModel {
  return {
    id: randomUUID(),
    nombre: "Taladro",
    marca: "Bosch",
    categoria: "Taladros",
    tarifa_dia: 10_000,
    ...overrides,
  } as ToolModel;
}

describe("CatalogController", () => {
  let buscarCatalogo: ReturnType<typeof crearMockUseCase>;
  let obtenerModeloPorId: ReturnType<typeof crearMockUseCase>;
  let controller: CatalogController;

  beforeEach(() => {
    buscarCatalogo = crearMockUseCase();
    obtenerModeloPorId = crearMockUseCase();
    controller = new CatalogController(buscarCatalogo as never, obtenerModeloPorId as never);
  });

  describe("search", () => {
    it("devuelve los items del use case y setea X-Total-Count si viene un total", async () => {
      const items = [modeloFake(), modeloFake()];
      buscarCatalogo.ejecutar.mockResolvedValue({ items, total: 2 });
      const setHeader = jest.fn();
      const res = { setHeader } as never;

      const resultado = await controller.search({} as never, res);

      expect(resultado).toBe(items);
      expect(setHeader).toHaveBeenCalledWith("X-Total-Count", "2");
    });

    it("no setea X-Total-Count si el use case no devuelve total", async () => {
      const items = [modeloFake()];
      buscarCatalogo.ejecutar.mockResolvedValue({ items });
      const setHeader = jest.fn();
      const res = { setHeader } as never;

      const resultado = await controller.search({} as never, res);

      expect(resultado).toBe(items);
      expect(setHeader).not.toHaveBeenCalled();
    });
  });

  describe("porId", () => {
    it("devuelve el modelo del use case", async () => {
      const modelo = modeloFake();
      obtenerModeloPorId.ejecutar.mockResolvedValue(modelo);

      const resultado = await controller.porId(modelo.id);

      expect(resultado).toBe(modelo);
    });

    it("mapea ModeloNoEncontradoError a NotFoundException", async () => {
      obtenerModeloPorId.ejecutar.mockRejectedValue(new ModeloNoEncontradoError(randomUUID()));

      await expect(controller.porId(randomUUID())).rejects.toThrow(NotFoundException);
    });

    it("propaga errores no mapeados sin transformarlos", async () => {
      obtenerModeloPorId.ejecutar.mockRejectedValue(new Error("boom"));

      await expect(controller.porId(randomUUID())).rejects.toThrow("boom");
    });
  });
});
