import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../supabase/supabase-client';

/**
 * Suscripción a Supabase Realtime (Postgres Changes) sobre la tabla
 * `shipments` — RF-3.3, "los estados se actualizan en tiempo real vía
 * Supabase Realtime sin recargar la página".
 *
 * Decisión de diseño: se separa de `LogisticsService` (que solo hace el GET
 * inicial vía HttpClient) para mantener responsabilidad única — un service
 * HTTP normal, testeable con `HttpTestingController`, y un service de
 * Realtime con su propio ciclo de vida de canal (`channel.subscribe()` /
 * `channel.unsubscribe()`), testeable por separado si hace falta mockear
 * `SUPABASE_CLIENT`.
 */
@Injectable({ providedIn: 'root' })
export class LogisticsRealtimeService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  /**
   * Devuelve un Observable que emite cada payload de cambio (`INSERT`,
   * `UPDATE`, `DELETE`) de la tabla `shipments`. Antes de suscribirse al
   * canal, autentica el cliente Realtime con el `access_token` de la sesión
   * activa (`this.supabase.realtime.setAuth(...)`) para que el canal
   * respete las políticas RLS (gerente/admin ven todo — la policy la
   * escribe el Backend). Esa sesión ya existe en `localStorage` porque
   * `@supabase/supabase-js` la persiste por proyecto: el cliente de
   * panel-admin lee la misma sesión que inició el usuario vía el cliente de
   * apps/shell.
   *
   * El teardown de RxJS (disparado por el `unsubscribe()` de quien consuma
   * este Observable, típicamente vía `takeUntilDestroyed`) llama a
   * `channel.unsubscribe()`.
   */
  watchShipments(): Observable<
    RealtimePostgresChangesPayload<Record<string, unknown>>
  > {
    return new Observable((subscriber) => {
      let tornDown = false;
      const channel = this.supabase.channel('shipments-realtime');

      const setup = async (): Promise<void> => {
        const {
          data: { session },
        } = await this.supabase.auth.getSession();

        if (session) {
          this.supabase.realtime.setAuth(session.access_token);
        }

        if (tornDown) return;

        channel
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'shipments' },
            (payload) => subscriber.next(payload),
          )
          .subscribe();
      };

      setup().catch((err: unknown) => subscriber.error(err));

      return () => {
        tornDown = true;
        channel.unsubscribe();
      };
    });
  }
}
