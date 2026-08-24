# @toolboxjl/ui-kit

Paquete compartido de UI de ToolBox JL entre `apps/shell` y los futuros
remotes de Native Federation (`portal-cliente`, `panel-admin`,
`pwa-logistica`).

## Alcance de Sprint 0

Este paquete arranca **solo con design tokens** (`src/tokens/`) — colores,
tipografía, espaciado, radios, sombras y breakpoints — expuestos como:

- Un objeto TypeScript tipado (`designTokens`, en `src/index.ts`), para
  lógica/estilos en componentes Angular.
- Un archivo de custom properties CSS (`src/tokens/design-tokens.css`,
  exportado como `@toolboxjl/ui-kit/tokens.css`), para importar directo en
  `styles.scss` de cada app.

Los **componentes Angular compartidos** (botones, inputs, cards, etc. — ver
`docs/DESIGN.md` §3 y `PROMPT_IMPLEMENTACION.md` B.3) todavía no existen acá:
se agregan en un sprint posterior, cuando haya más de un remote consumiéndolos
y el diseño visual final (Stitch) esté conectado.

## ⚠️ Nota importante — origen de los tokens

La referencia formal de estos valores es
`docs/04_Especificacion_UIUX_ToolBoxJL.docx`. Ese archivo es un `.docx`
binario que el agente de Frontend de Sprint 0 no pudo leer desde su entorno
de ejecución (Claude Code no tiene una herramienta para parsear `.docx`
directamente).

Como fallback, los valores de `design-tokens.ts` / `design-tokens.css` son
una **base de trabajo inferida** de `docs/DESIGN.md` (rubro: alquiler/venta
de herramientas eléctricas para construcción) y de convenciones estándar de
accesibilidad — **no** son el resultado de leer el documento UI/UX real.

**Acción pendiente para el Tech Lead**: reemplazar estos valores por los
reales del `.docx` (o por lo que resulte de conectar el proyecto de Stitch,
Sprint 10 en el roadmap de Frontend) apenas sea posible. Hasta entonces,
cualquier pantalla que use `@toolboxjl/ui-kit` — incluida la de login en
`apps/shell` — hereda esta paleta provisoria.

## Uso

```ts
import { designTokens } from '@toolboxjl/ui-kit';

designTokens.color.brand.primary500; // '#F2600C'
```

```scss
// styles.scss de una app Angular
@import '@toolboxjl/ui-kit/tokens.css';

.button-primary {
  background: var(--tbjl-color-primary-500);
}
```

## Scripts

- `pnpm build` — compila `src/` a `dist/` con `tsc`.
- `pnpm lint` — ESLint sobre `src/`.
- `pnpm test` — build + `node --test` sobre los tests compilados en
  `dist/tokens/`.
