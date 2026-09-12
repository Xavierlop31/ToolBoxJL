import { Injectable } from "@nestjs/common";
import type {
  CambiosUsuario,
  FiltroListarUsuarios,
  UserRepository,
  UsuarioBasico,
} from "../../domain/user.repository";

/**
 * Implementación en memoria de `UserRepository` — usada SOLO por los tests
 * unitarios y los steps de Cucumber. `sembrar`/`limpiar` (no forman parte de
 * la interfaz de dominio) — mismo criterio que `InMemoryRoiRepository`
 * (analytics): más angosto que reconstruir un flujo de signup completo solo
 * para tener un `UsuarioBasico` con el que probar un nombre de repartidor/
 * cliente.
 */
@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private readonly usuarios = new Map<string, UsuarioBasico>();

  sembrar(usuario: UsuarioBasico): void {
    this.usuarios.set(usuario.id, usuario);
  }

  limpiar(): void {
    this.usuarios.clear();
  }

  async buscarPorId(id: string): Promise<UsuarioBasico | null> {
    return this.usuarios.get(id) ?? null;
  }

  async listar(filtro: FiltroListarUsuarios): Promise<{ items: UsuarioBasico[]; total: number }> {
    const q = filtro.q?.trim().toLowerCase();
    const todos = [...this.usuarios.values()]
      .filter((u) => !q || u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .filter((u) => filtro.rol === undefined || u.rol === filtro.rol)
      .filter((u) => filtro.activo === undefined || u.activo === filtro.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

    const inicio = (filtro.page - 1) * filtro.pageSize;
    return { items: todos.slice(inicio, inicio + filtro.pageSize), total: todos.length };
  }

  async actualizar(id: string, cambios: CambiosUsuario): Promise<UsuarioBasico | null> {
    const existente = this.usuarios.get(id);
    if (!existente) return null;

    const actualizado: UsuarioBasico = {
      ...existente,
      ...(cambios.rol !== undefined ? { rol: cambios.rol } : {}),
      ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
    };
    this.usuarios.set(id, actualizado);
    return actualizado;
  }
}
