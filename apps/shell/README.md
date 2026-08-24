# apps/shell

Host Angular de ToolBox JL, con [Native Federation](https://github.com/angular-architects/module-federation-plugin)
(`@angular-architects/native-federation`). Ver `docs/DESIGN.md` §2 para el
diagrama de contenedores completo.

Generado con Angular CLI 18.2.21 y luego extendido con `ng add
@angular-architects/native-federation` (host) y `ng add
@angular-eslint/schematics`.

## Decisión de arquitectura — Sprint 0: ¿dónde vive el login?

`PROMPT_IMPLEMENTACION.md` (B.3) pide, para Sprint 0, "scaffolding de
apps/shell + Native Federation" y por separado, en el roadmap de HU-1.1 en
adelante, la creación de los remotes `portal-cliente`, `panel-admin` y
`pwa-logistica`. La duda a resolver: ¿la pantalla de login/registro
(HU-6.1, Issue #17) va en el shell o hay que adelantar la creación de
`portal-cliente` para alojarla ahí?

**Decisión: el login vive en `apps/shell`, no en un remote.**

Razones:

1. **Es transversal a los 3 perfiles**, no específico de Cliente. Los 5
   roles (`admin`, `gerente`, `almacenista`, `repartidor`, `cliente` — ver
   `docs/DESIGN.md` §4.1) inician sesión contra el mismo `AuthModule`
   (Supabase Auth). `portal-cliente` es B2C/B2B (Cliente); `panel-admin` es
   Admin/Gerente; `pwa-logistica` es Almacenista/Repartidor. Ninguno de los
   tres remotes es dueño natural de la pantalla de login sin que los otros
   dos terminen dependiendo de él para poder loguearse — eso violaría el
   propósito de Native Federation (remotes independientes, cargados por
   demanda) y acoplaría remotes entre sí antes de que existan.
2. **El shell es exactamente el contenedor pensado para esto**: es lo único
   que carga siempre, antes de decidir qué remote montar. Loguear ahí y
   recién después enrutar al remote que corresponda al rol del usuario
   (Sprint 1+) es el flujo natural.
3. **No crea trabajo prematuro**: no hizo falta adelantar la creación de
   `portal-cliente`/`panel-admin`/`pwa-logistica` (todavía fuera de alcance
   de Sprint 0 según el roadmap de Frontend) solo para alojar una pantalla
   que no es específica de ese remote.

Consecuencia práctica: `apps/shell/src/app/core/auth/` (AuthService, guard,
cliente de Supabase) y `apps/shell/src/app/features/auth/login/` quedan en
el shell. Cuando los remotes existan (Sprint 1+), consumen la sesión ya
resuelta por el shell (vía federation, o reimplementando un cliente liviano
que lea la misma sesión de Supabase — a decidir por el Tech Lead cuando
haya más de un remote real para validar el patrón).

## Manifest de remotes (Native Federation)

`public/federation.manifest.json` está vacío (`{}`) a propósito: ningún
remote existe todavía. `src/main.ts` carga ese manifest antes de bootstrapear
la app. Cuando se cree `portal-cliente` (Sprint 1) hay que agregarle su
entrada, por ejemplo:

```json
{
  "portal-cliente": "http://localhost:4201/remoteEntry.json"
}
```

## AuthModule (frontend) — HU-6.1

Cubre `features/06_autenticacion_seguridad.feature`, primer escenario
("Cliente inicia sesión con correo/contraseña o con Google"). El segundo
escenario (OTP WhatsApp) es Sprint 6 y no está implementado acá.

- `core/auth/supabase-client.ts` — `InjectionToken<SupabaseClient>`,
  configurado con `environment.supabase.{url,anonKey}`.
- `core/auth/auth.service.ts` — envoltorio de `@supabase/supabase-js`
  (`signInWithPassword`, `signUp`, `signInWithGoogle` vía OAuth, `signOut`,
  señal de sesión reactiva).
- `core/auth/auth.guard.ts` — guard funcional de rutas (`authGuard`).
- `features/auth/login/` — componente standalone con formulario
  email/contraseña (reactive forms) + botón "Continuar con Google", y un
  toggle login/registro.
- `features/home/` — placeholder post-login (ruta protegida por
  `authGuard`), representa el "obtengo acceso a la plataforma" del
  escenario Gherkin. Sprint 1+ lo reemplaza por el home real de cada perfil.

**No hay endpoint propio `/auth/login` en `openapi.yaml`** — se verificó que
no existe ninguna ruta `/auth/*` en el contrato: el login pasa directo por
el SDK de Supabase Auth desde el cliente (ver `docs/DESIGN.md` §3.7), no por
el backend NestJS. El backend consume el JWT resultante vía `bearerAuth`
para el resto de los endpoints.

### Credenciales de Supabase — placeholders

`src/environments/environment.ts` y `environment.development.ts` tienen
placeholders (`REEMPLAZAR-...`) para `supabase.url` / `supabase.anonKey`.
Las credenciales sandbox reales ya existen como GitHub Secrets del repo,
pero no estaban disponibles en el entorno donde se hizo este scaffolding.
**No commitear credenciales reales acá** — inyectar por variables de entorno
del proyecto Vercel en CI/deploy, o reemplazar localmente sin commitear el
cambio.

## Comandos

- `pnpm start` — `ng serve` (puerto 4200 por defecto).
- `pnpm build` — build de producción (Native Federation vía
  `@angular-architects/native-federation:build`).
- `pnpm test` — `ng test --watch=false --browsers=ChromeHeadless` (Karma +
  Jasmine).
- `pnpm lint` — ESLint (`@angular-eslint`).
