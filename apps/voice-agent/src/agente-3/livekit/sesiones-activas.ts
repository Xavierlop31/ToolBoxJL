/**
 * Registro en memoria de las salas a las que el Agente 3 ya está unido —
 * evita unirse dos veces a la misma sala si LiveKit entrega más de un
 * webhook `participant_joined` para el mismo cliente (reconexión de red,
 * republicación de pistas, etc.). Vive en `main.ts`, una única instancia por
 * proceso (el Agente 3 corre en un solo proceso, no hay múltiples réplicas
 * coordinándose entre sí en este sprint — gap documentado si algún día se
 * necesita escalar horizontalmente).
 */
export class SesionesActivas {
  private readonly salas = new Set<string>();

  estaActiva(roomName: string): boolean {
    return this.salas.has(roomName);
  }

  marcarActiva(roomName: string): void {
    this.salas.add(roomName);
  }

  marcarFinalizada(roomName: string): void {
    this.salas.delete(roomName);
  }

  get cantidadActivas(): number {
    return this.salas.size;
  }
}
