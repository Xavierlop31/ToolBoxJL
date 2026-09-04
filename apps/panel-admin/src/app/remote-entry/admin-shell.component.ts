import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

interface AdminNavItem {
  path: string;
  label: string;
  icon: string;
  /** Sufijo estable para `data-testid` (evita depender de `String.replace` en el template). */
  testId: string;
}

/**
 * Shell layout de TODO `apps/panel-admin` (Issue #184, fidelidad visual
 * contra el mockup Stitch "Gestión Inventario - Rediseño Admin") —
 * reemplaza el subnav horizontal de pestañas por un `SideNavBar` oscuro
 * fijo de 256px, igual que el mockup HTML/Tailwind que compartió el
 * Arquitecto (`bg-deep-navy`, ítem activo con `bg-primary-container`).
 *
 * Los 9 ítems cubren TODAS las secciones reales del remote — el mockup de
 * Stitch original solo mostraba 4-5 (más "Auditoría", que se omite acá por
 * no tener HU/endpoint que lo respalde todavía). "Almacén"/"Mantenimiento"/
 * "Rutas" reemplazan a las 3 pestañas que antes vivían dentro de
 * `/admin/inventario` (`InventoryPanelComponent`, ahora eliminado) — ver
 * `entry.routes.ts`.
 *
 * El `<h1>` del `TopAppBar` refleja la sección activa derivándola de la URL
 * (no hay Input/servicio adicional: es la forma más simple dado que este
 * shell YA es el único punto que conoce las 9 rutas). Las páginas que ya
 * existían de sprints previos (Dashboard, Ingresos, ROI, Envíos,
 * Utilización, Alta Vehículo) conservan también su propio `<h1>` interno
 * (fuera del alcance de este fix tocar esos 6 componentes) — la duplicación
 * visual resultante es un costo aceptado, documentado acá en vez de
 * preguntado, para no expandir el diff a componentes no mencionados en el
 * brief de la tarea.
 */
@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-shell">
      <nav class="admin-sidenav" aria-label="Navegación del Panel de Administración">
        <div class="sidenav-brand">
          <div class="sidenav-avatar">
            <span class="material-symbols-outlined" aria-hidden="true">account_circle</span>
          </div>
          <div>
            <h2>Panel de Control</h2>
            <p>Administrador v4.2</p>
          </div>
        </div>

        <ul class="sidenav-items">
          @for (item of navItems; track item.path) {
            <li>
              <a
                [routerLink]="item.path"
                routerLinkActive="active"
                [attr.data-testid]="'sidenav-' + item.testId"
              >
                <span class="material-symbols-outlined" aria-hidden="true">{{ item.icon }}</span>
                <span>{{ item.label }}</span>
              </a>
            </li>
          }
        </ul>
      </nav>

      <main class="admin-main">
        <header class="admin-topbar">
          <h1>{{ activeTitle() }}</h1>
          <div class="topbar-actions">
            <input
              type="search"
              class="topbar-search"
              placeholder="Buscar unidad…"
              aria-label="Buscar unidad"
            />
            <button type="button" class="topbar-icon-btn" aria-label="Notificaciones">
              <span class="material-symbols-outlined" aria-hidden="true">notifications</span>
            </button>
          </div>
        </header>

        <div class="admin-content">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: `
    /*
     * Layout tipo mockup Stitch: "h-full overflow-hidden" en el shell + una
     * sola región con scroll interno (.admin-content) — NO usamos
     * position:sticky/fixed para el sidenav/topbar (a diferencia del subnav
     * viejo). Motivo (Issue #184, hallado vía Playwright-BDD): este shell
     * asume un navbar externo de 64px que solo existe cuando el remote corre
     * federado bajo apps/shell (.navbar de app.component.ts) — en el runner
     * standalone de e2e-bdd (apps/panel-admin/src/app/app.component.html,
     * solo <router-outlet>) ese navbar no existe. Con sticky/fixed, apenas la
     * página hacía cualquier scroll el topbar "saltaba" a top:64px y quedaba
     * flotando sobre el contenido, interceptando clics (repartidor-toggle en
     * "/rutas", HU-13.4). Con scroll contenido en .admin-content en vez de
     * en el documento, el header y el sidenav nunca se mueven — no hay nada
     * que puedan tapar.
     */
    .admin-shell {
      display: flex;
      height: calc(100vh - 64px);
      background-color: var(--tbjl-color-background, #f5faff);
      font-family: var(--tbjl-font-family, sans-serif);
      overflow: hidden;
    }

    /* --- SideNavBar oscuro (mockup Stitch: bg-deep-navy, w-64) --- */
    .admin-sidenav {
      display: none;

      @media (min-width: 768px) {
        display: flex;
        flex-direction: column;
        width: 256px;
        min-width: 256px;
        height: 100%;
        background: var(--tbjl-color-primary-700, #0b0e3d);
        padding: 16px 0;
        overflow-y: auto;
      }
    }

    .sidenav-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px 24px;
    }

    .sidenav-avatar {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: var(--tbjl-color-primary-500, #141cdb);
      flex-shrink: 0;

      .material-symbols-outlined {
        color: #ffffff;
        font-size: 22px;
      }
    }

    .sidenav-brand h2 {
      margin: 0;
      font-size: 14px;
      font-family: var(--tbjl-font-family-headings, 'Montserrat', sans-serif);
      font-weight: 700;
      color: #ffffff;
    }

    .sidenav-brand p {
      margin: 2px 0 0;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.65);
    }

    .sidenav-items {
      list-style: none;
      margin: 0;
      padding: 0 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;

      a {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: var(--tbjl-radius-md, 0.5rem);
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.75);
        text-decoration: none;
        transition: background-color 0.15s ease, color 0.15s ease;

        .material-symbols-outlined {
          font-size: 20px;
        }

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        &.active {
          background: var(--tbjl-color-primary-500, #141cdb);
          color: #ffffff;
          font-weight: 700;
        }
      }
    }

    /* --- Área principal + TopAppBar --- */
    .admin-main {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      height: 100%;
      overflow: hidden;
    }

    .admin-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      height: 64px;
      flex-shrink: 0;
      padding: 0 24px;
      background: var(--tbjl-color-card, #ffffff);
      border-bottom: 1px solid var(--tbjl-color-border, #dce3ea);
    }

    .admin-topbar h1 {
      margin: 0;
      font-size: 20px;
      font-family: var(--tbjl-font-family-headings, 'Montserrat', sans-serif);
      font-weight: 800;
      color: var(--tbjl-color-neutral-900, #161c21);
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .topbar-search {
      padding: 8px 14px 8px 14px;
      border: 1px solid var(--tbjl-color-border, #dce3ea);
      border-radius: var(--tbjl-radius-md, 0.5rem);
      background: var(--tbjl-color-neutral-100, #eef4fb);
      font-size: 13px;
      min-width: 220px;

      &:focus {
        outline: none;
        border-color: var(--tbjl-color-primary-500, #141cdb);
      }
    }

    .topbar-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border-radius: 999px;
      border: 1px solid var(--tbjl-color-border, #dce3ea);
      background: #ffffff;
      color: var(--tbjl-color-neutral-700, #454556);
      cursor: pointer;

      &:hover {
        background: var(--tbjl-color-neutral-100, #eef4fb);
      }
    }

    .admin-content {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    .admin-content > * {
      max-width: 1600px;
      margin: 0 auto;
    }
  `,
})
export class AdminShellComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  /** 9 ítems del sidenav, mismo orden que confirmó el Arquitecto (Issue #184). */
  readonly navItems: AdminNavItem[] = [
    { path: '/admin/dashboard-kpis', label: 'Dashboard', icon: 'space_dashboard', testId: 'dashboard' },
    { path: '/admin/almacen', label: 'Almacén', icon: 'warehouse', testId: 'almacen' },
    { path: '/admin/mantenimiento', label: 'Mantenimiento', icon: 'build', testId: 'mantenimiento' },
    { path: '/admin/rutas', label: 'Rutas', icon: 'route', testId: 'rutas' },
    { path: '/admin/ingresos', label: 'Ingresos', icon: 'payments', testId: 'ingresos' },
    { path: '/admin/roi', label: 'ROI', icon: 'trending_up', testId: 'roi' },
    { path: '/admin/envios', label: 'Envíos', icon: 'local_shipping', testId: 'envios' },
    {
      path: '/admin/utilizacion-productividad',
      label: 'Utilización',
      icon: 'monitoring',
      testId: 'utilizacion',
    },
    {
      path: '/admin/vehiculos/nuevo',
      label: 'Alta Vehículo',
      icon: 'directions_car',
      testId: 'alta-vehiculo',
    },
  ];

  readonly activeTitle = signal('Panel de Control');

  ngOnInit(): void {
    this.updateTitle(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => this.updateTitle(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateTitle(url: string): void {
    const normalizedUrl = url.split('?')[0];

    // `item.path` es absoluto ("/admin/almacen") porque este shell se monta
    // bajo `/admin` vía Native Federation (apps/shell) — pero también se
    // sirve standalone sin ese prefijo (`apps/panel-admin` en dev/e2e-bdd,
    // ver app.routes.ts), así que compara contra ambas formas.
    const match = this.navItems.find(
      (item) =>
        normalizedUrl.startsWith(item.path) ||
        normalizedUrl.startsWith(item.path.replace(/^\/admin/, '')),
    );
    this.activeTitle.set(match ? match.label : 'Panel de Control');
  }
}
