import { Injectable } from "@nestjs/common";
import type { UserRepository, UsuarioBasico } from "../../domain/user.repository";

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
}
