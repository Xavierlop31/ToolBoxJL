import { InMemoryRevenueRepository } from './in-memory-revenue.repository';

describe('InMemoryRevenueRepository', () => {
  let repo: InMemoryRevenueRepository;

  beforeEach(() => {
    repo = new InMemoryRevenueRepository();
  });

  it('suma solo los pagos capturados, separados por tipo', async () => {
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'capturado',
      monto: 100000,
      createdAt: new Date('2026-01-10'),
    });
    repo.registrarPago({
      tipo: 'pago_alquiler',
      estado: 'capturado',
      monto: 50000,
      createdAt: new Date('2026-01-10'),
    });
    repo.registrarPago({
      tipo: 'cobro_mora',
      estado: 'capturado',
      monto: 20000,
      createdAt: new Date('2026-01-10'),
    });

    const resultado = await repo.sumarPorTipo(null);

    expect(resultado.ventasDirectas.valor).toBe(100000);
    expect(resultado.tarifasAlquiler.valor).toBe(50000);
    expect(resultado.cobrosMora.valor).toBe(20000);
  });

  it('ignora pagos que no están en estado capturado', async () => {
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'pendiente',
      monto: 100000,
      createdAt: new Date('2026-01-10'),
    });

    const resultado = await repo.sumarPorTipo(null);

    expect(resultado.ventasDirectas.valor).toBe(0);
  });

  it('filtra por rango de fechas cuando se provee', async () => {
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'capturado',
      monto: 100000,
      createdAt: new Date('2026-01-01'),
    });
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'capturado',
      monto: 200000,
      createdAt: new Date('2026-02-01'),
    });

    const resultado = await repo.sumarPorTipo({
      desde: new Date('2026-01-01'),
      hasta: new Date('2026-01-31'),
    });

    expect(resultado.ventasDirectas.valor).toBe(100000);
  });

  it('no filtra por fecha cuando el rango es null', async () => {
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'capturado',
      monto: 100000,
      createdAt: new Date('2020-01-01'),
    });

    const resultado = await repo.sumarPorTipo(null);

    expect(resultado.ventasDirectas.valor).toBe(100000);
  });

  it('limpiar() borra todos los pagos registrados previamente', async () => {
    repo.registrarPago({
      tipo: 'pago_venta',
      estado: 'capturado',
      monto: 100000,
      createdAt: new Date('2026-01-01'),
    });

    repo.limpiar();

    const resultado = await repo.sumarPorTipo(null);
    expect(resultado.ventasDirectas.valor).toBe(0);
  });
});
