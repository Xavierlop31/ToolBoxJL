import type { ToolModel as PrismaToolModel } from "@prisma/client";
import { PrismaToolModelRepository } from "./prisma-tool-model.repository";
import type { PrismaService } from "./prisma.service";

function fakeModel(overrides: Partial<PrismaToolModel> = {}): PrismaToolModel {
  return {
    id: "modelo-1",
    nombre: "Taladro Percutor",
    marca: "Bosch",
    categoria: "Taladros",
    potenciaW: 750,
    pesoKg: 2.5,
    volumenM3: 0.01,
    tarifaDia: 10_000,
    tarifaSemana: 60_000,
    costoCompra: 300_000,
    depositoPct: 0.2,
    interesMoraDia: 0.01,
    manualPdfUrl: null,
    disponibleParaVenta: true,
    ...overrides,
  } as PrismaToolModel;
}

describe("PrismaToolModelRepository", () => {
  let prisma: { toolModel: { create: jest.Mock; findUnique: jest.Mock; findMany: jest.Mock } };
  let repo: PrismaToolModelRepository;

  beforeEach(() => {
    prisma = {
      toolModel: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };
    repo = new PrismaToolModelRepository(prisma as unknown as PrismaService);
  });

  it("crear() mapea el input de dominio (snake_case) a las columnas de Prisma (camelCase) y devuelve el dominio", async () => {
    prisma.toolModel.create.mockResolvedValueOnce(fakeModel());

    const resultado = await repo.crear({
      nombre: "Taladro Percutor",
      marca: "Bosch",
      categoria: "Taladros",
      tarifa_dia: 10_000,
      tarifa_semana: 60_000,
      costo_compra: 300_000,
      deposito_pct: 0.2,
      peso_kg: 2.5,
    });

    expect(prisma.toolModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: "Taladro Percutor",
        marca: "Bosch",
        categoria: "Taladros",
        tarifaDia: 10_000,
        tarifaSemana: 60_000,
        costoCompra: 300_000,
        depositoPct: 0.2,
        pesoKg: 2.5,
        disponibleParaVenta: true,
      }),
    });
    expect(resultado.id).toBe("modelo-1");
    expect(resultado.tarifa_dia).toBe(10_000);
    expect(resultado.deposito_pct).toBe(0.2);
  });

  it("crear() respeta disponible_para_venta=false cuando se provee explícitamente", async () => {
    prisma.toolModel.create.mockResolvedValueOnce(fakeModel({ disponibleParaVenta: false }));

    await repo.crear({
      nombre: "Sierra",
      marca: "Dewalt",
      categoria: "Sierras",
      tarifa_dia: 5_000,
      disponible_para_venta: false,
    });

    expect(prisma.toolModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ disponibleParaVenta: false }),
    });
  });

  it("buscarPorId() devuelve el modelo mapeado al dominio si existe", async () => {
    prisma.toolModel.findUnique.mockResolvedValueOnce(fakeModel());

    const resultado = await repo.buscarPorId("modelo-1");

    expect(prisma.toolModel.findUnique).toHaveBeenCalledWith({ where: { id: "modelo-1" } });
    expect(resultado?.marca).toBe("Bosch");
  });

  it("buscarPorId() devuelve null si Prisma no encuentra el modelo", async () => {
    prisma.toolModel.findUnique.mockResolvedValueOnce(null);

    const resultado = await repo.buscarPorId("no-existe");

    expect(resultado).toBeNull();
  });

  it("buscar() sin filtros no agrega where de categoria ni OR de texto", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([fakeModel()]);

    const resultado = await repo.buscar({});

    expect(prisma.toolModel.findMany).toHaveBeenCalledWith({ where: {} });
    expect(resultado).toHaveLength(1);
  });

  it("buscar() con categoria y texto arma el where combinado", async () => {
    prisma.toolModel.findMany.mockResolvedValueOnce([]);

    await repo.buscar({ categoria: "Taladros", q: "bosch" });

    expect(prisma.toolModel.findMany).toHaveBeenCalledWith({
      where: {
        categoria: "Taladros",
        OR: [
          { nombre: { contains: "bosch", mode: "insensitive" } },
          { marca: { contains: "bosch", mode: "insensitive" } },
          { categoria: { contains: "bosch", mode: "insensitive" } },
        ],
      },
    });
  });
});
