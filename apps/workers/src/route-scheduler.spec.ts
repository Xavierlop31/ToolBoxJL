import { planificarRutas, type PedidoPendiente, type VehiculoDisponible } from "./route-scheduler";

function pedido(overrides: Partial<PedidoPendiente> & { shipmentId: string }): PedidoPendiente {
  return {
    orderId: `order-de-${overrides.shipmentId}`,
    tipo: "entrega",
    zonaId: "zona-1",
    pesoKg: 10,
    volumenM3: 0.1,
    ...overrides,
  };
}

function vehiculo(overrides: Partial<VehiculoDisponible> & { id: string }): VehiculoDisponible {
  return {
    capacidadKg: 100,
    capacidadM3: 1,
    zonas: ["zona-1"],
    ...overrides,
  };
}

describe("planificarRutas", () => {
  it("asigna todos los pedidos de una zona a un único vehículo cuando entran por capacidad", () => {
    const pedidos = [
      pedido({ shipmentId: "s1", pesoKg: 20, volumenM3: 0.2 }),
      pedido({ shipmentId: "s2", pesoKg: 30, volumenM3: 0.3 }),
    ];
    const vehiculos = [vehiculo({ id: "v1" })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.sinAsignar).toEqual([]);
    expect(resultado.rutas).toHaveLength(1);
    expect(resultado.rutas[0].vehiculoId).toBe("v1");
    // First-fit-decreasing: el más pesado (s2, 30kg) va primero en la ruta.
    expect(resultado.rutas[0].paradas).toEqual(["s2", "s1"]);
  });

  it("reparte pedidos de la misma zona entre dos vehículos cuando uno solo no alcanza (bin-packing)", () => {
    const pedidos = [
      pedido({ shipmentId: "s1", pesoKg: 60, volumenM3: 0.1 }),
      pedido({ shipmentId: "s2", pesoKg: 60, volumenM3: 0.1 }),
    ];
    const vehiculos = [
      vehiculo({ id: "v1", capacidadKg: 60 }),
      vehiculo({ id: "v2", capacidadKg: 60 }),
    ];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.sinAsignar).toEqual([]);
    expect(resultado.rutas).toHaveLength(2);
    const paradasTotal = resultado.rutas.flatMap((r) => r.paradas).sort();
    expect(paradasTotal).toEqual(["s1", "s2"]);
    // v1 (orden determinístico por id) recibe el primero que entra.
    expect(resultado.rutas.find((r) => r.vehiculoId === "v1")?.paradas).toEqual(["s1"]);
    expect(resultado.rutas.find((r) => r.vehiculoId === "v2")?.paradas).toEqual(["s2"]);
  });

  it("deja un pedido sin asignar con motivo de capacidad insuficiente cuando ningún vehículo de la zona tiene espacio", () => {
    const pedidos = [pedido({ shipmentId: "s1", pesoKg: 500, volumenM3: 0.1 })];
    const vehiculos = [vehiculo({ id: "v1", capacidadKg: 100 })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.rutas).toEqual([]);
    expect(resultado.sinAsignar).toHaveLength(1);
    expect(resultado.sinAsignar[0].shipmentId).toBe("s1");
    expect(resultado.sinAsignar[0].motivo).toContain("Pendiente — requiere revisión manual");
    expect(resultado.sinAsignar[0].motivo).toContain("capacidad insuficiente");
  });

  it("el límite de volumen (m3) también bloquea la asignación aunque el peso alcance", () => {
    const pedidos = [pedido({ shipmentId: "s1", pesoKg: 10, volumenM3: 5 })];
    const vehiculos = [vehiculo({ id: "v1", capacidadKg: 1000, capacidadM3: 1 })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.rutas).toEqual([]);
    expect(resultado.sinAsignar[0].motivo).toContain("capacidad insuficiente");
  });

  it("deja un pedido sin asignar con motivo distinto cuando ningún vehículo sirve su zona", () => {
    const pedidos = [pedido({ shipmentId: "s1", zonaId: "zona-sin-flota" })];
    const vehiculos = [vehiculo({ id: "v1", zonas: ["zona-1"] })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.rutas).toEqual([]);
    expect(resultado.sinAsignar[0].motivo).toContain("ningún vehículo de la flota está asignado a la zona");
  });

  it("deja sin asignar (datos insuficientes) un pedido sin zona, peso o volumen conocidos, sin asignarlo a ciegas", () => {
    const pedidos = [
      pedido({ shipmentId: "sin-zona", zonaId: null }),
      pedido({ shipmentId: "sin-peso", pesoKg: null }),
      pedido({ shipmentId: "sin-volumen", volumenM3: null }),
    ];
    const vehiculos = [vehiculo({ id: "v1", capacidadKg: 1000, capacidadM3: 100 })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.rutas).toEqual([]);
    expect(resultado.sinAsignar).toHaveLength(3);
    for (const item of resultado.sinAsignar) {
      expect(item.motivo).toContain("zona, peso o volumen desconocidos");
    }
  });

  it("un vehículo que sirve varias zonas puede recibir paradas de ambas en la misma ruta (orden por zona, luego por peso)", () => {
    const pedidos = [
      pedido({ shipmentId: "s-zona-a", zonaId: "zona-a", pesoKg: 10 }),
      pedido({ shipmentId: "s-zona-b", zonaId: "zona-b", pesoKg: 10 }),
    ];
    const vehiculos = [vehiculo({ id: "v1", zonas: ["zona-a", "zona-b"], capacidadKg: 1000 })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.sinAsignar).toEqual([]);
    expect(resultado.rutas).toHaveLength(1);
    // Zonas ordenadas alfabéticamente: "zona-a" antes que "zona-b".
    expect(resultado.rutas[0].paradas).toEqual(["s-zona-a", "s-zona-b"]);
  });

  it("procesa correctamente varias zonas y varios vehículos a la vez, sin cruzar capacidad entre vehículos", () => {
    const pedidos = [
      pedido({ shipmentId: "a1", zonaId: "zona-a", pesoKg: 40 }),
      pedido({ shipmentId: "a2", zonaId: "zona-a", pesoKg: 40 }),
      pedido({ shipmentId: "a3", zonaId: "zona-a", pesoKg: 40 }), // no entra en ningún vehículo de zona-a
      pedido({ shipmentId: "b1", zonaId: "zona-b", pesoKg: 90 }),
    ];
    const vehiculos = [
      vehiculo({ id: "va", zonas: ["zona-a"], capacidadKg: 80 }),
      vehiculo({ id: "vb", zonas: ["zona-b"], capacidadKg: 100 }),
    ];

    const resultado = planificarRutas(pedidos, vehiculos);

    const rutaA = resultado.rutas.find((r) => r.vehiculoId === "va");
    const rutaB = resultado.rutas.find((r) => r.vehiculoId === "vb");
    expect(rutaA?.paradas.sort()).toEqual(["a1", "a2"]);
    expect(rutaB?.paradas).toEqual(["b1"]);
    expect(resultado.sinAsignar.map((s) => s.shipmentId)).toEqual(["a3"]);
  });

  it("no produce rutas para vehículos sin ninguna parada asignada", () => {
    const pedidos = [pedido({ shipmentId: "s1" })];
    const vehiculos = [vehiculo({ id: "v1" }), vehiculo({ id: "v2" })];

    const resultado = planificarRutas(pedidos, vehiculos);

    expect(resultado.rutas).toHaveLength(1);
    expect(resultado.rutas.map((r) => r.vehiculoId)).toEqual(["v1"]);
  });

  it("con listas vacías no produce rutas ni pendientes", () => {
    expect(planificarRutas([], [])).toEqual({ rutas: [], sinAsignar: [] });
  });

  it("es determinístico: la misma entrada produce siempre la misma salida", () => {
    const pedidos = [
      pedido({ shipmentId: "s1", pesoKg: 15 }),
      pedido({ shipmentId: "s2", pesoKg: 25 }),
      pedido({ shipmentId: "s3", zonaId: "zona-2", pesoKg: 5 }),
    ];
    const vehiculos = [
      vehiculo({ id: "v1", zonas: ["zona-1"] }),
      vehiculo({ id: "v2", zonas: ["zona-2"] }),
    ];

    const primeraCorrida = planificarRutas(pedidos, vehiculos);
    const segundaCorrida = planificarRutas(pedidos, vehiculos);

    expect(segundaCorrida).toEqual(primeraCorrida);
  });
});
