import { ESTADOS_UNIDAD, esEstadoUnidadValido } from './estado-unidad';

describe('estado-unidad', () => {
  it('define los 5 estados de la hoja de vida de una unidad', () => {
    expect(ESTADOS_UNIDAD).toEqual([
      'Nuevo',
      'Excelente',
      'Operativo',
      'En Mantenimiento',
      'Dado de Baja',
    ]);
  });

  describe('esEstadoUnidadValido', () => {
    ESTADOS_UNIDAD.forEach((estado) => {
      it(`acepta el estado válido "${estado}"`, () => {
        expect(esEstadoUnidadValido(estado)).toBe(true);
      });
    });

    it('rechaza un string que no es un estado conocido', () => {
      expect(esEstadoUnidadValido('Inexistente')).toBe(false);
    });

    it('rechaza valores que no son string', () => {
      expect(esEstadoUnidadValido(null)).toBe(false);
      expect(esEstadoUnidadValido(undefined)).toBe(false);
      expect(esEstadoUnidadValido(42)).toBe(false);
      expect(esEstadoUnidadValido({})).toBe(false);
    });
  });
});
