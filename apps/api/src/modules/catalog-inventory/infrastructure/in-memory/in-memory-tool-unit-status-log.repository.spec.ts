import { InMemoryToolUnitStatusLogRepository } from './in-memory-tool-unit-status-log.repository';

describe('InMemoryToolUnitStatusLogRepository', () => {
  let repo: InMemoryToolUnitStatusLogRepository;

  beforeEach(() => {
    repo = new InMemoryToolUnitStatusLogRepository();
  });

  it('crea una entrada de hoja de vida con los datos provistos', async () => {
    const entrada = await repo.crear({
      unidadId: 'unidad-1',
      estadoAnterior: 'Nuevo',
      estadoNuevo: 'Operativo',
      fotosUrls: ['https://example.com/foto1.jpg'],
      autorId: 'usuario-1',
    });

    expect(entrada.id).toBeDefined();
    expect(entrada.unidad_id).toBe('unidad-1');
    expect(entrada.estado_anterior).toBe('Nuevo');
    expect(entrada.estado_nuevo).toBe('Operativo');
    expect(entrada.fotos_urls).toEqual(['https://example.com/foto1.jpg']);
    expect(entrada.autor_id).toBe('usuario-1');
    expect(entrada.created_at).toBeDefined();
  });

  it('genera ids únicos para cada entrada creada', async () => {
    const primera = await repo.crear({
      unidadId: 'unidad-1',
      estadoAnterior: 'Nuevo',
      estadoNuevo: 'Operativo',
      fotosUrls: [],
      autorId: 'usuario-1',
    });
    const segunda = await repo.crear({
      unidadId: 'unidad-1',
      estadoAnterior: 'Operativo',
      estadoNuevo: 'En Mantenimiento',
      fotosUrls: [],
      autorId: 'usuario-1',
    });

    expect(primera.id).not.toBe(segunda.id);
  });

  it('listarPorUnidad devuelve solo las entradas de la unidad indicada', async () => {
    await repo.crear({
      unidadId: 'unidad-1',
      estadoAnterior: 'Nuevo',
      estadoNuevo: 'Operativo',
      fotosUrls: [],
      autorId: 'usuario-1',
    });
    await repo.crear({
      unidadId: 'unidad-2',
      estadoAnterior: 'Nuevo',
      estadoNuevo: 'Operativo',
      fotosUrls: [],
      autorId: 'usuario-1',
    });

    const entradas = await repo.listarPorUnidad('unidad-1');

    expect(entradas).toHaveLength(1);
    expect(entradas[0].unidad_id).toBe('unidad-1');
  });

  it('listarPorUnidad devuelve un arreglo vacío si no hay entradas para esa unidad', async () => {
    const entradas = await repo.listarPorUnidad('unidad-inexistente');

    expect(entradas).toEqual([]);
  });

  describe('contarTransicionesAMantenimiento', () => {
    // `crear()` sella `created_at = new Date().toISOString()` (reloj real,
    // no controlable) — mismo criterio que el resto de este archivo, así
    // que el rango de estos tests se arma alrededor de "ahora" en vez de
    // fijar una fecha exacta (Sprint 15, Issue #153).
    const rangoAmplio = {
      desde: new Date(Date.now() - 24 * 60 * 60 * 1000),
      hasta: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    const rangoFueraDeAlcance = {
      desde: new Date('2000-01-01T00:00:00.000Z'),
      hasta: new Date('2000-02-01T00:00:00.000Z'),
    };

    it('cuenta las transiciones a "En Mantenimiento" por unidad dentro del rango', async () => {
      await repo.crear({
        unidadId: 'unidad-1',
        estadoAnterior: 'Operativo',
        estadoNuevo: 'En Mantenimiento',
        fotosUrls: [],
        autorId: 'usuario-1',
      });
      await repo.crear({
        unidadId: 'unidad-1',
        estadoAnterior: 'Operativo',
        estadoNuevo: 'Operativo',
        fotosUrls: [],
        autorId: 'usuario-1',
      });
      await repo.crear({
        unidadId: 'unidad-1',
        estadoAnterior: 'Operativo',
        estadoNuevo: 'En Mantenimiento',
        fotosUrls: [],
        autorId: 'usuario-1',
      });
      await repo.crear({
        unidadId: 'unidad-2',
        estadoAnterior: 'Operativo',
        estadoNuevo: 'En Mantenimiento',
        fotosUrls: [],
        autorId: 'usuario-1',
      });

      const resultado = await repo.contarTransicionesAMantenimiento(rangoAmplio);

      expect(resultado).toEqual(
        expect.arrayContaining([
          { unidadId: 'unidad-1', cantidad: 2 },
          { unidadId: 'unidad-2', cantidad: 1 },
        ]),
      );
      expect(resultado).toHaveLength(2);
    });

    it('ignora transiciones fuera del rango de fechas', async () => {
      await repo.crear({
        unidadId: 'unidad-1',
        estadoAnterior: 'Operativo',
        estadoNuevo: 'En Mantenimiento',
        fotosUrls: [],
        autorId: 'usuario-1',
      });

      const resultado = await repo.contarTransicionesAMantenimiento(rangoFueraDeAlcance);

      expect(resultado).toEqual([]);
    });
  });
});
