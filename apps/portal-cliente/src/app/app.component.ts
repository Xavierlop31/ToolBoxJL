import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Raíz de portal-cliente en modo standalone (`pnpm start`, puerto 4201).
 *
 * Deliberadamente mínima: no monta el widget de voz acá (ver
 * `remote-entry/portal-shell.component.ts`) porque cuando el shell monta
 * portal-cliente como remote de Native Federation NO pasa por este
 * `AppComponent` — solo instancia las rutas expuestas en
 * `remote-entry/entry.routes.ts` (`loadRemoteModule(...).then(m =>
 * m.remoteRoutes)`, ver `apps/shell/src/app/app.routes.ts`). El widget se
 * monta en `PortalShellComponent`, que envuelve esas mismas rutas — así
 * queda visible en cualquier ruta del portal tanto en modo standalone
 * (`routes` reutiliza `remoteRoutes`, ver `app.routes.ts`) como federado a
 * través del shell, sin duplicar el árbol de componentes.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'portal-cliente';
}
