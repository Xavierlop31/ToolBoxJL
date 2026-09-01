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
});
