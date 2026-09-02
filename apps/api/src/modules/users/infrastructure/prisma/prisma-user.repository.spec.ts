import type { User as PrismaUser } from "@prisma/client";
import { PrismaUserRepository } from "./prisma-user.repository";
import type { PrismaService } from "../../../catalog-inventory/infrastructure/prisma/prisma.service";

function fakeUser(overrides: Partial<PrismaUser> = {}): PrismaUser {
  return {
    id: "usuario-1",
    email: "ana@toolboxjl.test",
    fullName: "Ana Cliente",
    telefono: "+573001234567",
    rol: "cliente",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  } as PrismaUser;
}

describe("PrismaUserRepository", () => {
  let prisma: { user: Record<string, jest.Mock> };
  let repo: PrismaUserRepository;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn() } };
    repo = new PrismaUserRepository(prisma as unknown as PrismaService);
  });

  it("buscarPorId devuelve null si no existe", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    expect(await repo.buscarPorId("no-existe")).toBeNull();
  });

  it("buscarPorId mapea full_name -> nombre y devuelve el usuario", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(fakeUser());

    const resultado = await repo.buscarPorId("usuario-1");

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "usuario-1" } });
    expect(resultado).toEqual({
      id: "usuario-1",
      nombre: "Ana Cliente",
      email: "ana@toolboxjl.test",
      telefono: "+573001234567",
      rol: "cliente",
    });
  });

  it("buscarPorId devuelve nombre vacío cuando full_name es null (fila de public.users sin sincronizar aún)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(fakeUser({ fullName: null }));

    const resultado = await repo.buscarPorId("usuario-1");

    expect(resultado?.nombre).toBe("");
  });
});
