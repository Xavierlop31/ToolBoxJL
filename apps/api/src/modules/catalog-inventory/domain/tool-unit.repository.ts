import type { EstadoUnidad, ToolUnit } from "@toolboxjl/shared-types";

/**
 * Forma de `ToolUnit` tal como la persiste el repositorio — sin
 * `qr_code_url`, porque el QR no se guarda en base de datos: se genera
 * on-demand (ver infrastructure/qr) cada vez que la API arma una respuesta.
 * Es responsabilidad de la capa de aplicación (use case) enriquecer esta
 * forma con `qr_code_url` antes de devolverla como `ToolUnit` completo.
 */
export type UnidadPersistida = Omit<ToolUnit, "qr_code_url">;

export interface NuevaUnidadInput {
  modeloId: string;
  numeroSerie: string;
}

/**
 * Puerto de repositorio para `ToolUnit` — dos implementaciones en
 * infrastructure/ (Prisma real / in-memory para BDD), igual criterio que
 * `ToolModelRepository`.
 */
export interface ToolUnitRepository {
  crear(input: NuevaUnidadInput): Promise<UnidadPersistida>;
  buscarPorId(id: string): Promise<UnidadPersistida | null>;
  actualizarEstado(
    id: string,
    estadoNuevo: EstadoUnidad,
  ): Promise<UnidadPersistida>;
  /** Todas las unidades de un modelo — usado por RF-1.4 (check-availability). */
  listarPorModelo(modeloId: string): Promise<UnidadPersistida[]>;
}
