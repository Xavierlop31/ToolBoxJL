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
    <div class="shell-layout">
      <!-- Top Navigation Bar (Stitch Brand Blue) -->
      <header class="navbar">
        <div class="navbar-container">
          <div class="brand-group">
            <div class="brand-logo">
              <span class="material-symbols-outlined logo-icon">construction</span>
              <span class="logo-text">ToolBox <strong>JL</strong></span>
            </div>
            <nav class="nav-links">
              <a routerLink="/catalogo" routerLinkActive="active" class="nav-link">
                <span class="material-symbols-outlined nav-icon">storefront</span>
                Portal Clientes
              </a>
              @if (auth.isLogistica()) {
                <a routerLink="/logistica" routerLinkActive="active" class="nav-link">
                  <span class="material-symbols-outlined nav-icon">local_shipping</span>
                  Logística & PWA
                </a>
              }
              @if (auth.isAdminOrGerente()) {
                <a routerLink="/admin" routerLinkActive="active" class="nav-link">
                  <span class="material-symbols-outlined nav-icon">dashboard</span>
                  Panel Gerencial
                </a>
              }
            </nav>
          </div>
          <div class="user-group">
            <span class="user-badge">{{ auth.userRoleDisplay() }}</span>
            <button type="button" class="btn-logout" (click)="signOut()" title="Cerrar sesión">
              <span class="material-symbols-outlined">logout</span>
              <span>Salir</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Dashboard Grid -->
      <main class="home-main">
        <div class="hero-banner card-industrial">
          <span class="hero-tag">Sistema Integral de Herramientas</span>
          <h1 class="hero-title">Potencia Sin Pausas</h1>
          <p class="hero-subtitle">
            Alquiler, venta, trazabilidad QR unitaria y logística optimizada por IA.
          </p>
        </div>

        <div class="modules-grid">
          <!-- Card Portal Clientes -->
          <div class="module-card card-industrial">
            <div class="card-header">
              <span class="material-symbols-outlined module-icon">storefront</span>
              <span class="module-badge badge-blue">B2C / B2B</span>
            </div>
            <h3>Portal Cliente</h3>
            <p>Catálogo interactivo con cotización en tiempo real, reserva de herramientas y asistente de voz.</p>
            <a routerLink="/catalogo" class="btn-module btn-blue">
              <span>Ingresar al Catálogo</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>

          <!-- Card PWA Logística -->
          @if (auth.isLogistica()) {
            <div class="module-card card-industrial">
              <div class="card-header">
                <span class="material-symbols-outlined module-icon text-red">qr_code_scanner</span>
                <span class="module-badge badge-red">Operativo</span>
              </div>
              <h3>PWA Logística</h3>
              <p>Escaneo QR por unidad física, ruta de entregas del día y checklist de inspección con fotos.</p>
              <a routerLink="/logistica" class="btn-module btn-red">
                <span>Abrir PWA Logística</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          }

          <!-- Card Panel Admin -->
          @if (auth.isAdminOrGerente()) {
            <div class="module-card card-industrial">
              <div class="card-header">
                <span class="material-symbols-outlined module-icon">analytics</span>
                <span class="module-badge badge-gray">Gerencial</span>
              </div>
              <h3>Panel Admin</h3>
              <p>Dashboards de ingresos, ROI por herramienta, utilización de flota y mapa de pedidos en vivo.</p>
              <a routerLink="/admin" class="btn-module btn-gray">
                <span>Ver KPIs & Flota</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          }
        </div>
      </main>
    </div>
  `,
  styles: `
    .shell-layout {
      min-height: 100vh;
      background-color: var(--tbjl-color-background, #f5faff);
      font-family: var(--tbjl-font-family, sans-serif);
    }
    .navbar {
      background-color: var(--tbjl-color-primary-500, #141cdb);
      color: #ffffff;
      height: 64px;
      display: flex;
      align-items: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: sticky;
      top: 0;
      z-index: 50;
    }
    .navbar-container {
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand-group {
      display: flex;
      align-items: center;
      gap: 32px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
      font-family: var(--tbjl-font-family-headings, 'Montserrat', sans-serif);
      color: #ffffff;
    }
    .logo-icon {
      font-size: 28px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .nav-link {
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.85);
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
    .nav-link:hover {
      background-color: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    .nav-link.active {
      background-color: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }
    .nav-icon {
      font-size: 18px;
    }
    .user-group {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .user-badge {
      background: rgba(255, 255, 255, 0.15);
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-logout {
      display: flex;
      align-items: center;
      gap: 6px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .btn-logout:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .home-main {
      max-width: 1440px;
      margin: 0 auto;
      padding: 32px 24px;
    }
    .hero-banner {
      padding: 40px;
      margin-bottom: 32px;
      background: linear-gradient(135deg, #ffffff 0%, #eef4fb 100%);
      border-left: 6px solid var(--tbjl-color-primary-500, #141cdb);
    }
    .hero-tag {
      display: inline-block;
      background-color: var(--tbjl-color-primary-500, #141cdb);
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 12px;
      letter-spacing: 0.05em;
    }
    .hero-title {
      font-size: 36px;
      font-weight: 900;
      font-style: italic;
      color: var(--tbjl-color-primary-700, #0b0e3d);
      margin: 0 0 12px 0;
    }
    .hero-subtitle {
      font-size: 18px;
      color: var(--tbjl-color-neutral-700, #454556);
      margin: 0;
    }
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 24px;
    }
    .module-card {
      padding: 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .module-icon {
      font-size: 32px;
      color: var(--tbjl-color-primary-500, #141cdb);
    }
    .module-icon.text-red {
      color: var(--tbjl-color-secondary-500, #e70012);
    }
    .module-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
    }
    .badge-blue {
      background: #e0e0ff;
      color: #141cdb;
    }
    .badge-red {
      background: #ffdad5;
      color: #bc000c;
    }
    .badge-gray {
      background: #e8eff5;
      color: #454556;
    }
    .module-card h3 {
      font-size: 22px;
      margin: 0 0 10px 0;
      font-weight: 700;
    }
    .module-card p {
      font-size: 14px;
      color: var(--tbjl-color-neutral-700, #454556);
      margin: 0 0 24px 0;
      line-height: 1.5;
    }
    .btn-module {
      display: flex;
      align-items: center;
      justify-content: space-between;
      text-decoration: none;
      padding: 12px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.2s ease;
    }
    .btn-blue {
      background: var(--tbjl-color-primary-500, #141cdb);
      color: #ffffff;
    }
    .btn-blue:hover {
      background: var(--tbjl-color-primary-600, #0003a8);
    }
    .btn-red {
      background: var(--tbjl-color-secondary-500, #e70012);
      color: #ffffff;
    }
    .btn-red:hover {
      background: var(--tbjl-color-secondary-600, #bc000c);
    }
    .btn-gray {
      background: var(--tbjl-color-neutral-900, #161c21);
      color: #ffffff;
    }
    .btn-gray:hover {
      background: #000000;
    }
  `,
})
export class HomeComponent {
  readonly auth = inject(AuthService);

  signOut(): void {
    void this.auth.signOut();
  }
}
