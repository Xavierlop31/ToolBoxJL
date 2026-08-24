import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Placeholder post-login. Ruta protegida por `authGuard` — representa el
 * "Entonces ... obtengo acceso a la plataforma" del escenario Gherkin.
 * Sprint 1+ reemplaza esto por el home real de cada remote
 * (portal-cliente/panel-admin/pwa-logistica).
 */
@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <main class="home">
      <h1>ToolBox JL</h1>
      <p>Sesión iniciada correctamente. Tenés acceso a la plataforma.</p>
      <button type="button" (click)="signOut()">Cerrar sesión</button>
    </main>
  `,
  styles: `
    .home {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      gap: 1rem;
      font-family: var(--tbjl-font-family, sans-serif);
    }
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  signOut(): void {
    void this.auth.signOut();
  }
}
