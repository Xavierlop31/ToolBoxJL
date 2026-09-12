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
    activo: true,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  } as PrismaUser;
}

describe("PrismaUserRepository", () => {
  let prisma: { user: Record<string, jest.Mock> };
  let repo: PrismaUserRepository;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    };
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
      activo: true,
    });
  });

  it("buscarPorId devuelve nombre vacío cuando full_name es null (fila de public.users sin sincronizar aún)", async () => {
    prisma.user.findUnique.mockResolvedValueOnce(fakeUser({ fullName: null }));

    const resultado = await repo.buscarPorId("usuario-1");

    expect(resultado?.nombre).toBe("");
  });

  describe("listar (Épica 16)", () => {
    it("arma el where con q/rol/activo y devuelve items + total", async () => {
      prisma.user.count.mockResolvedValueOnce(1);
      prisma.user.findMany.mockResolvedValueOnce([fakeUser()]);

      const resultado = await repo.listar({ q: "ana", rol: "cliente", activo: true, page: 1, pageSize: 20 });

      const whereEsperado = {
        OR: [
          { fullName: { contains: "ana", mode: "insensitive" } },
          { email: { contains: "ana", mode: "insensitive" } },
        ],
        rol: "cliente",
        activo: true,
      };
      expect(prisma.user.count).toHaveBeenCalledWith({ where: whereEsperado });
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: whereEsperado,
        orderBy: { fullName: "asc" },
        skip: 0,
        take: 20,
      });
      expect(resultado.total).toBe(1);
      expect(resultado.items[0].nombre).toBe("Ana Cliente");
    });

    it("sin filtros, arma un where vacío y calcula skip por página", async () => {
      prisma.user.count.mockResolvedValueOnce(0);
      prisma.user.findMany.mockResolvedValueOnce([]);

      await repo.listar({ page: 3, pageSize: 10 });

      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} });
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 20, take: 10 }),
      );
    });
  });

  describe("actualizar (Épica 16)", () => {
    it("pasa solo los campos presentes a Prisma", async () => {
      prisma.user.update.mockResolvedValueOnce(fakeUser({ activo: false }));

      const resultado = await repo.actualizar("usuario-1", { activo: false });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "usuario-1" },
        data: { activo: false },
      });
      expect(resultado?.activo).toBe(false);
    });

    it("devuelve null si Prisma lanza P2025 (registro no encontrado)", async () => {
      prisma.user.update.mockRejectedValueOnce({ code: "P2025" });

      expect(await repo.actualizar("no-existe", { rol: "admin" })).toBeNull();
    });

    it("propaga cualquier otro error de Prisma", async () => {
      prisma.user.update.mockRejectedValueOnce(new Error("conexión perdida"));

      await expect(repo.actualizar("usuario-1", { rol: "admin" })).rejects.toThrow("conexión perdida");
    });
  });
});
