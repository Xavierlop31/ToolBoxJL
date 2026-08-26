import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { VoiceWidgetComponent } from '../features/voice-widget/voice-widget.component';

/**
 * Layout raíz de las rutas expuestas por Native Federation
 * (`remote-entry/entry.routes.ts`) — envuelve el `<router-outlet>` de las
 * páginas del portal (catálogo, ficha de modelo, etc.) con el widget
 * flotante de voz (HU-10.1/10.2, Sprint 9), para que sea visible en
 * cualquier ruta del portal mientras el Cliente esté logueado.
 *
 * Se declara acá y no en `app.component.ts` porque cuando el shell monta
 * portal-cliente vía `loadRemoteModule({ remoteName: 'portal-cliente',
 * exposedModule: './Routes' })` NUNCA instancia el `AppComponent` de este
 * remote — solo el árbol de rutas de `entry.routes.ts`. Este componente es
 * el único punto de montaje compartido entre el modo standalone
 * (`app.routes.ts` reutiliza `remoteRoutes`) y el modo federado a través
 * del shell.
 */
@Component({
  selector: 'app-portal-shell',
  standalone: true,
  imports: [RouterOutlet, VoiceWidgetComponent],
  template: `
    <router-outlet></router-outlet>
    <app-voice-widget></app-voice-widget>
  `,
})
export class PortalShellComponent {}
