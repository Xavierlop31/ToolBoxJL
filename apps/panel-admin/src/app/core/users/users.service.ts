import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminUser, ListUsersParams, ListUsersResult, UpdateUserInput } from '../models/users.models';

/**
 * Consume `/admin/users*` (Épica 16, openapi.yaml) — solo rol admin, tanto
 * a nivel de backend (`@Roles("admin")`, `RolesGuard`) como de acceso a esta
 * pantalla del panel (ver `entry.routes.ts`/`admin-shell.component.ts`).
 */
@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /** `GET /admin/users` — página filtrable de usuarios. */
  listUsers(params: ListUsersParams = {}): Observable<ListUsersResult> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.rol) httpParams = httpParams.set('rol', params.rol);
    if (params.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params.page) httpParams = httpParams.set('page', params.page);
    if (params.pageSize) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.http.get<ListUsersResult>(`${this.baseUrl}/admin/users`, { params: httpParams });
  }

  /** `PATCH /admin/users/{id}` — cambia rol y/o estado (activo/inactivo). */
  updateUser(id: string, input: UpdateUserInput): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.baseUrl}/admin/users/${id}`, input);
  }
}
