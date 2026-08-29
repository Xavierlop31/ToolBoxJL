import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Shell layout para PWA Logística (remotes montados vía Native Federation).
 * Provee la barra de navegación operativa para que almacenistas y repartidores
 * puedan alternar entre Escaneo QR, Hoja de Vida / Inventario y Mi Ruta del Día.
 */
@Component({
  selector: 'app-logistica-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="logistica-layout">
      <!-- Operational Subnav -->
      <nav class="logistica-subnav" aria-label="Navegación Operativa Logística">
        <div class="logistica-subnav-container">
          <div class="subnav-title">
            <span class="material-symbols-outlined subnav-icon">inventory_2</span>
            <span>Logística & Inventario</span>
          </div>

          <div class="subnav-tabs">
            <a routerLink="/logistica/escanear" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">qr_code_scanner</span>
              <span>Escanear QR</span>
            </a>
            <a routerLink="/logistica/mi-ruta" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">route</span>
              <span>Mi Ruta de Hoy</span>
            </a>
          </div>
        </div>
      </nav>

      <!-- Content Area -->
      <main class="logistica-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: `
    .logistica-layout {
      min-height: calc(100vh - 64px);
      background-color: var(--tbjl-color-background, #f5faff);
      font-family: var(--tbjl-font-family, sans-serif);
    }
    .logistica-subnav {
      background: #ffffff;
      border-bottom: 1px solid var(--tbjl-color-border, #dce3ea);
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      position: sticky;
      top: 64px;
      z-index: 40;
    }
    .logistica-subnav-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 54px;
    }
    .subnav-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 800;
      color: var(--tbjl-color-primary-700, #0b0e3d);
      letter-spacing: 0.02em;
    }
    .subnav-icon {
      font-size: 20px;
      color: var(--tbjl-color-secondary-500, #e70012);
    }
    .subnav-tabs {
      display: flex;
      gap: 8px;
      overflow-x: auto;
    }
    .subnav-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 700;
      color: var(--tbjl-color-neutral-700, #454556);
      text-decoration: none;
      border-radius: 6px;
      transition: all 0.2s ease;
      white-space: nowrap;

      .material-symbols-outlined {
        font-size: 18px;
      }

      &:hover {
        background: var(--tbjl-color-neutral-100, #eef4fb);
        color: var(--tbjl-color-secondary-500, #e70012);
      }

      &.active {
        background: var(--tbjl-color-secondary-500, #e70012);
        color: #ffffff;

        .material-symbols-outlined {
          color: #ffffff;
        }
      }
    }
    .logistica-content {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
    }
  `,
})
export class LogisticaShellComponent {}
