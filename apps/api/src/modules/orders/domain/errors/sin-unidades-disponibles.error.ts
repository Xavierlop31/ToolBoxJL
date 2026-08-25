export class SinUnidadesDisponiblesError extends Error {
  constructor(modeloId: string) {
    super(`No hay unidades físicas disponibles para el modelo "${modeloId}" en las fechas solicitadas.`);
    this.name = "SinUnidadesDisponiblesError";
  }
}
