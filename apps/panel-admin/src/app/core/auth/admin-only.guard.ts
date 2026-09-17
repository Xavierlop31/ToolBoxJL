import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';

import { RoleService } from './role.service';

/**
 * Defensa en profundidad (Issue #184-ter) sobre las 5 rutas que
 * `AdminShellComponent` ya oculta del sidenav para el rol `gerente`
 * (Almacén/Rutas/Envíos/Alta Vehículo/Usuarios) — sin este guard, un
 * gerente podría llegar igual escribiendo la URL directo. Espera
 * `RoleService.loaded` antes de decidir (mismo motivo que `adminGuard` de
 * `apps/shell` espera `sessionLoaded`: evita un falso redirect mientras
 * `getSession()` todavía está en vuelo).
 */
export const adminOnlyGuard: CanActivateFn = () => {
  const roleService = inject(RoleService);
  const router = inject(Router);

  return toObservable(roleService.loaded).pipe(
    filter((loaded) => loaded),
    take(1),
    map(() => (roleService.userRole() === 'gerente' ? router.createUrlTree(['/admin/dashboard-kpis']) : true)),
  );
};
