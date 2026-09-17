import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';

import { adminOnlyGuard } from './admin-only.guard';
import { RoleService } from './role.service';
import { Rol } from '../models/users.models';

/** Mismo motivo que `apps/shell/src/app/core/auth/auth.guard.spec.ts`: normaliza el resultado del guard a una Promise para testearlo con `await`. */
function resolveGuardResult(result: unknown) {
  return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
}

describe('adminOnlyGuard', () => {
  function runGuard(rol: Rol) {
    const roleServiceStub = {
      userRole: () => rol,
      loaded: signal(true),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RoleService, useValue: roleServiceStub }],
    });

    return resolveGuardResult(
      TestBed.runInInjectionContext(() => adminOnlyGuard({} as never, { url: '/admin/almacen' } as never)),
    );
  }

  it('permite acceso si el rol es admin', async () => {
    const result = await runGuard('admin');
    expect(result).toBeTrue();
  });

  it('redirige a /admin/dashboard-kpis si el rol es gerente', async () => {
    const result = await runGuard('gerente');
    expect(result).not.toBeTrue();
  });
});
