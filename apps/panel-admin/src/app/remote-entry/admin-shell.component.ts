import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

/**
 * Shell layout para el Panel de Administración (remotes montados vía Native Federation).
 * Provee la barra de navegación interna (Subnav / Tabs) para alternar rápidamente
 * entre el Dashboard Gerencial (Sprint 15, HU-15.1), Analítica de Ingresos, ROI, Envíos,
 * Utilización, Alta de Vehículos y Gestión de Inventario QR (Sprint 14, HU-13.1 a HU-13.4).
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <!-- Sub-Navigation Header -->
      <nav class="admin-subnav" aria-label="Subnavegación Panel Gerencial">
        <div class="admin-subnav-container">
          <div class="subnav-title">
            <span class="material-symbols-outlined subnav-icon">analytics</span>
            <span>Panel Gerencial</span>
          </div>

          <div class="subnav-tabs">
            <a routerLink="/admin/dashboard-kpis" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">space_dashboard</span>
              <span>Dashboard Gerencial</span>
            </a>
            <a routerLink="/admin/ingresos" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">payments</span>
              <span>Ingresos & KPIs</span>
            </a>
            <a routerLink="/admin/roi" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">trending_up</span>
              <span>ROI Herramientas</span>
            </a>
            <a routerLink="/admin/envios" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">local_shipping</span>
              <span>Envíos en Vivo</span>
            </a>
            <a routerLink="/admin/utilizacion-productividad" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">monitoring</span>
              <span>Utilización & Flota</span>
            </a>
            <a routerLink="/admin/vehiculos/nuevo" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">directions_car</span>
              <span>Alta Vehículo</span>
            </a>
            <a routerLink="/admin/inventario" routerLinkActive="active" class="subnav-tab">
              <span class="material-symbols-outlined">qr_code_2</span>
              <span>Inventario QR</span>
            </a>
          </div>
        </div>
      </nav>

      <!-- Sub-Route Content -->
      <main class="admin-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: `
    .admin-layout {
      min-height: calc(100vh - 64px);
      background-color: var(--tbjl-color-background, #f5faff);
      font-family: var(--tbjl-font-family, sans-serif);
    }
    .admin-subnav {
      background: #ffffff;
      border-bottom: 1px solid var(--tbjl-color-border, #dce3ea);
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      position: sticky;
      top: 64px;
      z-index: 40;
    }
    .admin-subnav-container {
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
      color: var(--tbjl-color-primary-500, #141cdb);
    }
    .subnav-tabs {
      display: flex;
      gap: 6px;
      overflow-x: auto;
    }
    .subnav-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
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
        color: var(--tbjl-color-primary-500, #141cdb);
      }

      &.active {
        background: var(--tbjl-color-primary-500, #141cdb);
        color: #ffffff;

        .material-symbols-outlined {
          color: #ffffff;
        }
      }
    }
    .admin-content {
      max-width: 1440px;
      margin: 0 auto;
      padding: 24px;
    }
  `,
})
export class AdminShellComponent {}
