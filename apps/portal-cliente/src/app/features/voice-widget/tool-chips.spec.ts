import { VoiceAgentEvent } from '../../core/models/voice-agent.models';
import { buildToolChips } from './tool-chips';

function toolStatus(
  tool: string,
  status: 'running' | 'done',
  label = `Label de ${tool}`,
): VoiceAgentEvent {
  return { type: 'tool_status', tool, label, status };
}

describe('buildToolChips', () => {
  it('devuelve una lista vacía sin eventos', () => {
    expect(buildToolChips([])).toEqual([]);
  });

  it('ignora eventos greeting', () => {
    expect(buildToolChips([{ type: 'greeting', text: 'Hola' }])).toEqual([]);
  });

  it('agrega un chip running por cada evento tool_status/running', () => {
    const chips = buildToolChips([toolStatus('search_catalog', 'running', 'Buscando en catálogo…')]);

    expect(chips).toEqual([{ tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'running' }]);
  });

  it('marca el chip como done cuando llega el evento done de la misma tool', () => {
    const chips = buildToolChips([
      toolStatus('search_catalog', 'running', 'Buscando en catálogo…'),
      toolStatus('search_catalog', 'done', 'Buscando en catálogo…'),
    ]);

    expect(chips).toEqual([{ tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'done' }]);
  });

  it('mantiene chips independientes para varias tools en la misma respuesta', () => {
    const chips = buildToolChips([
      toolStatus('search_catalog', 'running', 'Buscando en catálogo…'),
      toolStatus('search_catalog', 'done', 'Buscando en catálogo…'),
      toolStatus('check_availability', 'running', 'Verificando disponibilidad…'),
      toolStatus('check_availability', 'done', 'Verificando disponibilidad…'),
    ]);

    expect(chips).toEqual([
      { tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'done' },
      { tool: 'check_availability', label: 'Verificando disponibilidad…', status: 'done' },
    ]);
  });

  it('crea un chip nuevo por cada invocación de la MISMA tool a lo largo de la sesión (no las pisa)', () => {
    const chips = buildToolChips([
      toolStatus('search_catalog', 'running', 'Buscando en catálogo…'),
      toolStatus('search_catalog', 'done', 'Buscando en catálogo…'),
      toolStatus('search_catalog', 'running', 'Buscando en catálogo…'),
    ]);

    expect(chips).toEqual([
      { tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'done' },
      { tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'running' },
    ]);
  });

  it('un chip sin su done correspondiente queda running (turno todavía en curso)', () => {
    const chips = buildToolChips([
      toolStatus('search_catalog', 'running', 'Buscando en catálogo…'),
      toolStatus('check_availability', 'running', 'Verificando disponibilidad…'),
      toolStatus('search_catalog', 'done', 'Buscando en catálogo…'),
    ]);

    expect(chips).toEqual([
      { tool: 'search_catalog', label: 'Buscando en catálogo…', status: 'done' },
      { tool: 'check_availability', label: 'Verificando disponibilidad…', status: 'running' },
    ]);
  });

  it('un evento done sin running previo de esa tool no rompe ni crea un chip fantasma', () => {
    const chips = buildToolChips([toolStatus('add_to_cart', 'done', 'Agregando al carrito…')]);

    expect(chips).toEqual([]);
  });
});
