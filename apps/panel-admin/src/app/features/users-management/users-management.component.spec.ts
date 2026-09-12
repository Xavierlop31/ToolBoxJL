import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { UsersManagementComponent } from './users-management.component';
import { UsersService } from '../../core/users/users.service';
import { AdminUser, ListUsersResult } from '../../core/models/users.models';

describe('UsersManagementComponent', () => {
  let fixture: ComponentFixture<UsersManagementComponent>;
  let component: UsersManagementComponent;
  let usersSpy: jasmine.SpyObj<UsersService>;

  const mockUser: AdminUser = {
    id: 'u1',
    nombre: 'Ana Cliente',
    email: 'ana@toolboxjl.test',
    telefono: null,
    rol: 'cliente',
    activo: true,
  };

  const mockResult: ListUsersResult = { items: [mockUser], total: 1, page: 1, pageSize: 20 };

  beforeEach(() => {
    usersSpy = jasmine.createSpyObj('UsersService', ['listUsers', 'updateUser']);
    usersSpy.listUsers.and.returnValue(of(mockResult));

    TestBed.configureTestingModule({
      imports: [UsersManagementComponent],
      providers: [{ provide: UsersService, useValue: usersSpy }],
    });

    fixture = TestBed.createComponent(UsersManagementComponent);
    component = fixture.componentInstance;
  });

  it('HU-16.1: carga la tabla al iniciar sin filtros', () => {
    fixture.detectChanges();

    expect(usersSpy.listUsers).toHaveBeenCalledWith({
      q: undefined,
      rol: undefined,
      activo: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(component.rows().map((r) => r.id)).toEqual(['u1']);
    expect(component.total()).toBe(1);
  });

  it('HU-16.1: filtra con debounce al escribir en el buscador', fakeAsync(() => {
    fixture.detectChanges();
    usersSpy.listUsers.calls.reset();

    component.searchControl.setValue('ana');
    tick(300);

    expect(usersSpy.listUsers).toHaveBeenCalledWith(
      jasmine.objectContaining({ q: 'ana', page: 1 }),
    );
  }));

  it('HU-16.1: filtra por rol y por estado', () => {
    fixture.detectChanges();
    usersSpy.listUsers.calls.reset();

    component.rolControl.setValue('admin');
    expect(usersSpy.listUsers).toHaveBeenCalledWith(jasmine.objectContaining({ rol: 'admin' }));

    usersSpy.listUsers.calls.reset();
    component.activoControl.setValue('false');
    expect(usersSpy.listUsers).toHaveBeenCalledWith(jasmine.objectContaining({ activo: false }));
  });

  it('renderiza cada fila con su nombre/email/rol/estado (HU-16.1)', () => {
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    const fila = nativeElement.querySelector('[data-testid="users-row"]')!;
    expect(fila.textContent).toContain('Ana Cliente');
    expect(fila.textContent).toContain('ana@toolboxjl.test');
    expect(nativeElement.querySelector<HTMLSelectElement>('[data-testid="rol-select-u1"]')!.value).toBe(
      'cliente',
    );
    expect(
      nativeElement.querySelector<HTMLInputElement>('[data-testid="activo-checkbox-u1"]')!.checked,
    ).toBe(true);
  });

  describe('guardar cambios por fila (HU-16.2/16.3)', () => {
    it('el botón "Guardar" arranca deshabilitado hasta que haya un cambio', () => {
      fixture.detectChanges();

      const boton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="btn-guardar-u1"]',
      )!;
      expect(boton.disabled).toBe(true);

      component.onRolChange(component.rows()[0], { target: { value: 'admin' } } as unknown as Event);
      fixture.detectChanges();
      expect(boton.disabled).toBe(false);
    });

    it('cambia el rol y llama a PATCH /admin/users/{id} al guardar', () => {
      fixture.detectChanges();
      usersSpy.updateUser.and.returnValue(of({ ...mockUser, rol: 'admin' }));

      component.onRolChange(component.rows()[0], { target: { value: 'admin' } } as unknown as Event);
      component.guardar(component.rows()[0]);

      expect(usersSpy.updateUser).toHaveBeenCalledWith('u1', { rol: 'admin', activo: true });
      expect(component.rows()[0].rol).toBe('admin');
      expect(component.savingRowId()).toBeNull();
    });

    it('desactiva un usuario', () => {
      fixture.detectChanges();
      usersSpy.updateUser.and.returnValue(of({ ...mockUser, activo: false }));

      component.onActivoChange(component.rows()[0], { target: { checked: false } } as unknown as Event);
      component.guardar(component.rows()[0]);

      expect(usersSpy.updateUser).toHaveBeenCalledWith('u1', { rol: 'cliente', activo: false });
      expect(component.rows()[0].activo).toBe(false);
    });

    it('muestra el error del backend si falla el guardado (ej. auto-modificación, HU-16.4)', () => {
      fixture.detectChanges();
      usersSpy.updateUser.and.returnValue(
        throwError(() => ({ error: { message: 'No podés cambiar tu propio rol o estado desde este panel.' } })),
      );

      component.onRolChange(component.rows()[0], { target: { value: 'admin' } } as unknown as Event);
      component.guardar(component.rows()[0]);
      fixture.detectChanges();

      expect(component.rowErrors()['u1']).toBe('No podés cambiar tu propio rol o estado desde este panel.');
      const nativeElement = fixture.nativeElement as HTMLElement;
      expect(nativeElement.querySelector('[data-testid="error-u1"]')!.textContent).toContain(
        'No podés cambiar tu propio rol',
      );
    });
  });

  it('HU-16.1: setea un mensaje de error si falla la carga', () => {
    usersSpy.listUsers.and.returnValue(throwError(() => new Error('fallo')));
    fixture.detectChanges();

    expect(component.errorMessage()).toBe('No pudimos cargar la lista de usuarios.');
  });
});
