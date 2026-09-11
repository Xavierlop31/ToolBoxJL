import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

import { UsersService } from '../../core/users/users.service';
import { AdminUser, ROLES_HUMANOS, Rol } from '../../core/models/users.models';

const PAGE_SIZE = 20;

/** Fila con el borrador de edición (rol/activo pendientes) — separado del último valor confirmado por el backend (`AdminUser`). */
interface UserRow extends AdminUser {
  pendingRol: Rol;
  pendingActivo: boolean;
}

function aFila(usuario: AdminUser): UserRow {
  return { ...usuario, pendingRol: usuario.rol, pendingActivo: usuario.activo };
}

/**
 * Página "Usuarios" (`/admin/usuarios`, Épica 16 — Gestión de Usuarios y
 * Roles, pedido directo del Arquitecto 2026-09-11, no viene del PRD
 * original) — `features/16_gestion_usuarios_roles.feature`.
 *
 * Solo rol admin: el backend rechaza con 403 a cualquier otro rol
 * (`@Roles("admin")`, `AdminUsersController`) — este componente no duplica
 * esa verificación del lado del cliente, confía en que un 403 real llegue
 * acá y lo muestra como el mismo tipo de error que cualquier otra falla de
 * carga (mismo criterio que el resto de `panel-admin`, que tampoco tiene
 * hoy un servicio de sesión/rol propio para condicionar UI por rol).
 *
 * Guardado por fila (no auto-guardado al cambiar el `<select>`/checkbox):
 * cambiar el rol o el estado de un usuario es una acción sensible, un botón
 * "Guardar" explícito por fila evita un cambio accidental de un solo clic.
 */
@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.scss',
})
export class UsersManagementComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);
  private readonly destroy$ = new Subject<void>();

  readonly roles = ROLES_HUMANOS;
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly rolControl = new FormControl<Rol | ''>('', { nonNullable: true });
  readonly activoControl = new FormControl<'' | 'true' | 'false'>('', { nonNullable: true });

  readonly loading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly rows = signal<UserRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;

  /** `id` de la fila con un guardado en curso — deshabilita sus controles. */
  readonly savingRowId = signal<string | null>(null);
  readonly rowErrors = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.load();

    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page.set(1);
        this.load();
      });

    this.rolControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.page.set(1);
      this.load();
    });

    this.activoControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.page.set(1);
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.usersService
      .listUsers({
        q: this.searchControl.value || undefined,
        rol: this.rolControl.value || undefined,
        activo: this.activoControl.value === '' ? undefined : this.activoControl.value === 'true',
        page: this.page(),
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          this.rows.set(result.items.map(aFila));
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.errorMessage.set('No pudimos cargar la lista de usuarios.');
          this.loading.set(false);
        },
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.total() / this.pageSize));
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.page.set(page);
    this.load();
  }

  onRolChange(row: UserRow, event: Event): void {
    const rol = (event.target as HTMLSelectElement).value as Rol;
    this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, pendingRol: rol } : r)));
  }

  onActivoChange(row: UserRow, event: Event): void {
    const activo = (event.target as HTMLInputElement).checked;
    this.rows.update((rows) => rows.map((r) => (r.id === row.id ? { ...r, pendingActivo: activo } : r)));
  }

  hayCambiosPendientes(row: UserRow): boolean {
    return row.pendingRol !== row.rol || row.pendingActivo !== row.activo;
  }

  guardar(row: UserRow): void {
    this.savingRowId.set(row.id);
    this.rowErrors.update((errores) =>
      Object.fromEntries(Object.entries(errores).filter(([id]) => id !== row.id)),
    );

    this.usersService
      .updateUser(row.id, { rol: row.pendingRol, activo: row.pendingActivo })
      .subscribe({
        next: (actualizado) => {
          this.rows.update((rows) => rows.map((r) => (r.id === row.id ? aFila(actualizado) : r)));
          this.savingRowId.set(null);
        },
        error: (err) => {
          this.rowErrors.update((errores) => ({
            ...errores,
            [row.id]: err?.error?.message || 'No pudimos guardar los cambios de este usuario.',
          }));
          this.savingRowId.set(null);
        },
      });
  }
}
