/**
 * Agente 1 — Programador Inteligente de Rutas (Sprint 7, Issue #22 / HU-8.1,
 * TRD §4.1). Lógica de dominio PURA (sin red, sin Prisma, sin
 * `@anthropic-ai/sdk`) que agrupa pedidos por zona geográfica ("densidad
 * geográfica", TRD §4.1) y los asigna a vehículos respetando su capacidad de
 * peso/volumen (bin-packing tipo first-fit decreasing). Testeada
 * exhaustivamente en `route-scheduler.spec.ts` sin pagar ninguna llamada a
 * la API de Anthropic.
 *
 * Esta función NO es la que corre en producción — en producción, la
 * ESTRATEGIA que implementa acá (agrupar por zona, bin-packing por
 * capacidad, dejar sin asignar lo que no entra) se le describe a Claude en
 * el system prompt de `agente-1/tools.ts`, y es Claude quien razona sobre
 * los datos reales vía tool calling (`agente-1/route-scheduler-agent.ts`).
 * Esta implementación pura sirve como (a) referencia ejecutable de la
 * estrategia para validarla barato y rápido en CI sin LLM, y (b) contrato
 * de datos (`PedidoPendiente`/`VehiculoDisponible`) de lo que el algoritmo
 * necesita para funcionar de verdad.
 *
 * *** GAP DE CONTRATO DOCUMENTADO (no inventado, no silenciado) ***: el
 * schema `Shipment` de `openapi.yaml`/`packages/shared-types`
 * (`GET /logistics/pending-orders`, la ÚNICA fuente de pedidos que el
 * Agente 1 tiene permitido consultar — TRD §4.1) expone hoy únicamente
 * `{id, order_id, vehiculo_id, tipo, estado_envio}` — SIN `zona_id` ni
 * peso/volumen. Esos datos sí existen en el dominio (`Order.zona_id`/
 * `direccion_entrega`, `ToolModel.peso_kg`/`volumen_m3`), pero no viajan en
 * la respuesta de este endpoint (confirmado leyendo
 * `apps/api/src/modules/logistics/interface/logistics.controller.ts` y
 * `packages/shared-types/src/shipment.ts`). Sin ellos, ni este algoritmo ni
 * Claude (que ve la misma respuesta JSON vía `tool_result`) pueden
 * clusterizar por zona ni respetar capacidad de verdad — `PedidoPendiente`
 * de abajo modela los campos que el algoritmo NECESITA. Reportado como
 * bloqueo real al Tech Lead (no resuelto acá): Backend/Arquitecto tienen que
 * decidir cómo se enriquece `Shipment`/`GET /logistics/pending-orders` (o se
 * agrega otro endpoint) antes de que esto funcione contra datos reales.
 * Mientras tanto, un pedido con `zonaId`/`pesoKg`/`volumenM3` desconocidos
 * cae en `sinAsignar` con motivo "datos insuficientes" en vez de asignarse a
 * ciegas — ver `agente-1/logistics-api-client.ts` para el mismo criterio
 * aplicado al lado de `GET /fleet/vehicles` (que directamente no existe
 * todavía en el contrato).
 */

export interface PedidoPendiente {
  shipmentId: string;
  orderId: string;
  tipo: "entrega" | "recogida";
  /** `null` cuando el dato no está disponible (ver gap de contrato de arriba). */
  zonaId: string | null;
  pesoKg: number | null;
  volumenM3: number | null;
}

export interface VehiculoDisponible {
  id: string;
  capacidadKg: number;
  capacidadM3: number;
  /** Zonas que este vehículo puede servir (`Vehicle.zonas`, openapi.yaml). */
  zonas: string[];
}

export interface RutaPropuesta {
  vehiculoId: string;
  /** shipmentId, en el orden de visita dentro de la ruta. */
  paradas: string[];
}

export interface PedidoSinAsignar {
  shipmentId: string;
  motivo: string;
}

export interface PlanificacionResultado {
  rutas: RutaPropuesta[];
  sinAsignar: PedidoSinAsignar[];
}

/**
 * Agrupa `pedidos` por `zonaId` (densidad geográfica) y los asigna a los
 * vehículos de `vehiculos` que sirven esa zona mediante bin-packing
 * first-fit-decreasing (pedidos más pesados primero, para minimizar espacio
 * desperdiciado — heurística estándar de bin-packing). Nunca asigna un
 * pedido a un vehículo si eso excede su `capacidadKg`/`capacidadM3` — un
 * pedido que no entra en ningún vehículo de su zona queda en `sinAsignar`
 * con un motivo explícito ("Pendiente — requiere revisión manual", el texto
 * exacto que pide TRD §4.1 para el log del batch nocturno) en vez de
 * forzarlo en una ruta que excede capacidad.
 *
 * Determinístico: mismo input siempre produce el mismo output (zonas y
 * vehículos se procesan en orden estable), para que el resultado sea
 * reproducible entre corridas.
 */
export function planificarRutas(
  pedidos: PedidoPendiente[],
  vehiculos: VehiculoDisponible[],
): PlanificacionResultado {
  const sinAsignar: PedidoSinAsignar[] = [];
  const capacidadRestante = new Map<string, { kg: number; m3: number }>(
    vehiculos.map((v) => [v.id, { kg: v.capacidadKg, m3: v.capacidadM3 }]),
  );
  const paradasPorVehiculo = new Map<string, string[]>(vehiculos.map((v) => [v.id, []]));

  const pedidosValidos: PedidoPendiente[] = [];
  for (const pedido of pedidos) {
    if (pedido.zonaId === null || pedido.pesoKg === null || pedido.volumenM3 === null) {
      sinAsignar.push({
        shipmentId: pedido.shipmentId,
        motivo:
          "Pendiente — requiere revisión manual (zona, peso o volumen desconocidos para este pedido).",
      });
      continue;
    }
    pedidosValidos.push(pedido);
  }

  const pedidosPorZona = new Map<string, PedidoPendiente[]>();
  for (const pedido of pedidosValidos) {
    const zonaId = pedido.zonaId as string;
    const lista = pedidosPorZona.get(zonaId) ?? [];
    lista.push(pedido);
    pedidosPorZona.set(zonaId, lista);
  }

  const zonasOrdenadas = [...pedidosPorZona.keys()].sort();

  for (const zonaId of zonasOrdenadas) {
    const pedidosDeZona = [...pedidosPorZona.get(zonaId)!].sort(
      (a, b) => (b.pesoKg as number) - (a.pesoKg as number),
    );

    const vehiculosDeZona = vehiculos
      .filter((v) => v.zonas.includes(zonaId))
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const pedido of pedidosDeZona) {
      const pesoKg = pedido.pesoKg as number;
      const volumenM3 = pedido.volumenM3 as number;

      const vehiculoElegido = vehiculosDeZona.find((v) => {
        const restante = capacidadRestante.get(v.id)!;
        return restante.kg >= pesoKg && restante.m3 >= volumenM3;
      });

      if (!vehiculoElegido) {
        sinAsignar.push({
          shipmentId: pedido.shipmentId,
          motivo:
            vehiculosDeZona.length === 0
              ? `Pendiente — requiere revisión manual (ningún vehículo de la flota está asignado a la zona ${zonaId}).`
              : `Pendiente — requiere revisión manual (capacidad insuficiente en los vehículos de la zona ${zonaId}).`,
        });
        continue;
      }

      const restante = capacidadRestante.get(vehiculoElegido.id)!;
      restante.kg -= pesoKg;
      restante.m3 -= volumenM3;
      paradasPorVehiculo.get(vehiculoElegido.id)!.push(pedido.shipmentId);
    }
  }

  const rutas: RutaPropuesta[] = [...paradasPorVehiculo.entries()]
    .filter(([, paradas]) => paradas.length > 0)
    .map(([vehiculoId, paradas]) => ({ vehiculoId, paradas }));

  return { rutas, sinAsignar };
}
