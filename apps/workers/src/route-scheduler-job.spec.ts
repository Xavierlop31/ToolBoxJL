import { calcularPedidosSinAsignar } from "./route-scheduler-job";
import type { RouteApi, ShipmentApi } from "./agente-1/logistics-api-types";

function shipment(id: string): ShipmentApi {
  return { id, order_id: `order-${id}`, vehiculo_id: null, tipo: "entrega", estado_envio: "pendiente_asignacion" };
}

function ruta(paradas: string[]): RouteApi {
  return { id: `r-${paradas.join("-")}`, vehiculo_id: "v1", fecha: "2026-08-26", paradas };
}

describe("calcularPedidosSinAsignar", () => {
  it("devuelve vacío cuando todos los pedidos consultados terminaron en alguna ruta", () => {
    const pedidos = [shipment("s1"), shipment("s2")];
    const rutas = [ruta(["s1", "s2"])];

    expect(calcularPedidosSinAsignar(pedidos, rutas)).toEqual([]);
  });

  it("devuelve los shipment_id que no aparecen en ninguna ruta publicada", () => {
    const pedidos = [shipment("s1"), shipment("s2"), shipment("s3")];
    const rutas = [ruta(["s1"]), ruta(["s3"])];

    expect(calcularPedidosSinAsignar(pedidos, rutas)).toEqual(["s2"]);
  });

  it("devuelve todos los pedidos cuando no se publicó ninguna ruta", () => {
    const pedidos = [shipment("s1"), shipment("s2")];

    expect(calcularPedidosSinAsignar(pedidos, [])).toEqual(["s1", "s2"]);
  });

  it("devuelve vacío cuando no había pedidos pendientes", () => {
    expect(calcularPedidosSinAsignar([], [ruta(["s1"])])).toEqual([]);
  });
});
