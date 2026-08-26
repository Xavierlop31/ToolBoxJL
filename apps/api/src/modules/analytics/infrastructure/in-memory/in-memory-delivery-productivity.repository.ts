import { Injectable } from "@nestjs/common";
import type { EstadoEnvio, TipoEnvio } from "@toolboxjl/shared-types";
import type { RangoPeriodo } from "../../domain/revenue.repository";
import type {
  DeliveryProductivityRepository,
  ProductividadRepartidor,
} from "../../domain/delivery-productivity.repository";

/**
 * Parada sembrada directamente por tests/BDD — equivalente aplanado de
 * "una `Route` publicada para el vehículo de este repartidor en `fecha`,
 * con este `Shipment` (tipo/estado) entre sus paradas".
 */
export interface ParadaSembradaParaProductividad {
  repartidorId: string;
  tipo: TipoEnvio;
  estadoEnvio: EstadoEnvio;
  /** Fecha de la `Route` a la que pertenece la parada (`routes.fecha`). */
  fecha: Date;
}

function esExitosa(tipo: TipoEnvio, estado: EstadoEnvio): boolean {
  return (tipo === "entrega" && estado === "entregado") || (tipo === "recogida" && estado === "retornado");
}

@Injectable()
export class InMemoryDeliveryProductivityRepository implements DeliveryProductivityRepository {
  private readonly paradas: ParadaSembradaParaProductividad[] = [];

  sembrarParada(parada: ParadaSembradaParaProductividad): void {
    this.paradas.push(parada);
  }

  limpiar(): void {
    this.paradas.length = 0;
  }

  async listarPorRepartidor(mes: RangoPeriodo): Promise<ProductividadRepartidor[]> {
    const enRango = this.paradas.filter((p) => p.fecha >= mes.desde && p.fecha < mes.hasta);

    const porRepartidor = new Map<string, { entregasExitosas: number; rutaAsignada: number }>();
    for (const p of enRango) {
      const actual = porRepartidor.get(p.repartidorId) ?? { entregasExitosas: 0, rutaAsignada: 0 };
      actual.rutaAsignada += 1;
      if (esExitosa(p.tipo, p.estadoEnvio)) {
        actual.entregasExitosas += 1;
      }
      porRepartidor.set(p.repartidorId, actual);
    }

    return [...porRepartidor.entries()].map(([repartidorId, v]) => ({ repartidorId, ...v }));
  }
}
