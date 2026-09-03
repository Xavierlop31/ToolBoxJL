import { randomUUID } from "node:crypto";
import { ForbiddenException } from "@nestjs/common";
import type { UsuarioAutenticado } from "@toolboxjl/shared-types";
import { InMemoryOrderRepository } from "../infrastructure/in-memory/in-memory-order.repository";
import { OrdenNoEncontradaError } from "../domain/errors/orden-no-encontrada.error";
import { ObtenerOrdenUseCase } from "./obtener-orden.use-case";

describe("ObtenerOrdenUseCase", () => {
  let ordenes: InMemoryOrderRepository;
  let useCase: ObtenerOrdenUseCase;

  beforeEach(() => {
    ordenes = new InMemoryOrderRepository();
    useCase = new ObtenerOrdenUseCase(ordenes);
  });

  function usuario(overrides: Partial<UsuarioAutenticado> = {}): UsuarioAutenticado {
    return { id: "cliente-1", rol: "cliente", ...overrides } as UsuarioAutenticado;
  }

  async function crearOrdenDeCliente(clienteId: string) {
    return ordenes.crear({
      clienteId,
      tipo: "alquiler",
      fechaInicio: "2026-09-01",
      fechaFin: "2026-09-05",
      returnMode: "en_sede",
      direccionEntrega: "Calle 1",
      zonaId: randomUUID(),
      items: [{ unidadId: randomUUID(), tarifaAplicada: 40_000 }],
    });
  }

  it("devuelve la orden cuando el cliente dueño la solicita", async () => {
    const orden = await crearOrdenDeCliente("cliente-1");

    const resultado = await useCase.ejecutar(orden.id, usuario({ id: "cliente-1", rol: "cliente" }));

    expect(resultado.id).toBe(orden.id);
  });

  it.each(["admin", "gerente", "almacenista", "repartidor"] as const)(
    "permite que el rol de staff '%s' vea la orden de cualquier cliente",
    async (rol) => {
      const orden = await crearOrdenDeCliente("cliente-1");

      const resultado = await useCase.ejecutar(orden.id, usuario({ id: "staff-1", rol }));

      expect(resultado.id).toBe(orden.id);
    },
  );

  it("lanza ForbiddenException si un cliente intenta ver la orden de otro cliente", async () => {
    const orden = await crearOrdenDeCliente("cliente-1");

    await expect(
      useCase.ejecutar(orden.id, usuario({ id: "cliente-2", rol: "cliente" })),
    ).rejects.toThrow(ForbiddenException);
  });

  it("lanza OrdenNoEncontradaError si el id no corresponde a ninguna orden", async () => {
    await expect(useCase.ejecutar(randomUUID(), usuario())).rejects.toThrow(OrdenNoEncontradaError);
  });
});
