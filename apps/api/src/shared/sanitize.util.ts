import { Transform } from "class-transformer";

// Tags HTML (`<script>`, `<img onerror=...>`, etc.) — estos campos se
// persisten en Prisma tal cual y después se muestran SIN escapar en
// mensajes de WhatsApp, PDFs y el panel admin (Issue #187), así que un
// `nombre = "<script>...</script>"` sin este paso llegaría intacto hasta
// esas superficies.
//
// `{0,1000}` en vez de `*` sin acotar (sonar-typescript:S8786, hallazgo de
// Reliability): ningún tag HTML real necesita más de 1000 caracteres entre
// `<` y `>`, y acotar el cuantificador limita el trabajo de backtracking a
// una constante por posición de inicio en vez de dejarlo crecer con el
// tamaño del input — este valor lo pisa `@Transform` ANTES de cualquier
// `@MaxLength` (ver doc-comment de `sanitizarTextoLibre`), así que el input
// crudo puede ser arbitrariamente largo. Mismo criterio que
// `scripts/generate-frontend-config.mjs` (`sinBarraFinal`) para el mismo
// hallazgo.
const TAGS_HTML_REGEX = /<[^>]{0,1000}>/g;

// Caracteres de control ASCII salvo tab (0x09), LF (0x0A) y CR (0x0D), que sí
// se preservan porque campos como `falla_reportada`/`motivo_baja` son
// descripciones de texto libre que razonablemente pueden ser multilínea.
const CARACTERES_DE_CONTROL_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Recorta espacios en los extremos, quita tags HTML y caracteres de control
 * de un valor de texto libre ingresado por un usuario. Valores que no sean
 * `string` se devuelven sin tocar, para que class-validator reporte el error
 * de tipo que corresponda (ej. `@IsString()` sobre un número) en vez de que
 * esta función lo enmascare.
 */
export function sanitizarTextoLibre(valor: unknown): unknown {
  if (typeof valor !== "string") {
    return valor;
  }
  return valor.replace(TAGS_HTML_REGEX, "").replace(CARACTERES_DE_CONTROL_REGEX, "").trim();
}

/**
 * `@Transform` reutilizable (class-transformer) para campos `@IsString()` de
 * texto libre ingresado por un usuario (nombres, marcas, categorías,
 * direcciones, IDs de dispositivo) — NO para UUIDs/enums/números/fechas, que
 * ya están suficientemente acotados por sus propios validadores.
 *
 * `ValidationPipe({ transform: true })` (ver `main.ts`) aplica primero los
 * `@Transform` (fase `plainToInstance`) y recién después corre
 * `class-validator` (`@MaxLength`, etc.) sobre el valor ya transformado —
 * así el límite de longitud declarado junto a este decorador se mide sobre
 * el texto ya sanitizado, no sobre el input crudo.
 *
 * Uso:
 *   @IsString()
 *   @MaxLength(200)
 *   @SanitizarTextoLibre()
 *   nombre!: string;
 */
export function SanitizarTextoLibre(): PropertyDecorator {
  return Transform(({ value }) => sanitizarTextoLibre(value));
}
