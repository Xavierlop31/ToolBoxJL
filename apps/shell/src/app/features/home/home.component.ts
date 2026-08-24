import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

/**
 * Placeholder post-login. Ruta protegida por `authGuard` — representa el
 * "Entonces ... obtengo acceso a la plataforma" del escenario Gherkin.
 * Sprint 1 agrega los links a los remotes de portal-cliente (catálogo) y
 * pwa-logistica (escaneo QR) montados vía Native Federation
 * (`/catalogo`, `/logistica` — ver app.routes.ts). Sprint 2+ reemplaza
 * esto por el home real segmentado por rol.
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="home">
      <h1>ToolBox JL</h1>
      <p>Sesión iniciada correctamente. Tenés acceso a la plataforma.</p>
      <nav class="home-nav">
        <a routerLink="/catalogo">Catálogo (portal-cliente)</a>
        <a routerLink="/logistica">Escanear QR (pwa-logística)</a>
      </nav>
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
    .home-nav {
      display: flex;
      gap: 1rem;
    }
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);

  signOut(): void {
    void this.auth.signOut();
  }
}
