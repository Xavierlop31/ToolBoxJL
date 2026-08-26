#!/usr/bin/env node
/**
 * Genera la configuración de despliegue de las apps Angular a partir de
 * variables de entorno, antes de `ng build`.
 *
 * *** POR QUÉ EXISTE ***
 * Los `environment.ts` de producción se commitean con PLACEHOLDERS
 * (`REEMPLAZAR-EN-VERCEL...`) y `angular.json` solo hace `fileReplacements`
 * entre dev y prod — ninguna app lee variables de entorno. Sin este paso, el
 * bundle de producción sale con los placeholders: sin `apiUrl` real y sin
 * credenciales de Supabase. Cargar variables en el dashboard de Vercel no
 * cambia nada por sí solo; hace falta materializarlas en un archivo antes de
 * compilar. Lo mismo con `federation.manifest.json`, que se commitea
 * apuntando a `http://localhost:4201/4202/4203` — desplegado, el shell
 * intentaría cargar los remotes desde el localhost del navegador del
 * visitante y no cargaría ningún micro-frontend.
 *
 * *** CONTRATO: NO PISA NADA SI NO HAY VARIABLES ***
 * Si para una app no hay ninguna variable definida, el script NO toca sus
 * archivos y lo reporta. Así `pnpm start` / `ng serve` en local sigue
 * funcionando exactamente igual que antes (con los placeholders y el manifest
 * de localhost commiteados), y solo CI/Vercel — donde las variables sí
 * existen — obtiene los valores reales. Es deliberado que el archivo
 * generado sobrescriba uno versionado: el commiteado es el fallback de
 * desarrollo, no la fuente de verdad de producción.
 *
 * *** AGNÓSTICO A LA TOPOLOGÍA DE DOMINIOS ***
 * Las URLs de los remotes se toman tal cual de las variables, sin
 * normalizar a absolutas. Eso deja abiertas las dos topologías sin cambiar
 * código, que es una decisión de arquitectura todavía abierta:
 *   - 4 dominios Vercel separados → valor absoluto
 *     (`https://toolboxjl-portal.vercel.app`). Requiere habilitar CORS en los
 *     remotes: el shell hace fetch de `remoteEntry.json` cross-origin.
 *   - Un solo dominio con rewrites de Vercel → valor relativo
 *     (`/remotes/portal-cliente`). Sin CORS.
 *
 * Uso:  node scripts/generate-frontend-config.mjs <app>
 *       node scripts/generate-frontend-config.mjs --all
 */

import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Qué variable alimenta qué campo, por app. Se deriva de lo que cada
 * `environment.ts` declara hoy — no todas las apps usan Supabase en el
 * cliente (pwa-logistica habla solo con la API). portal-cliente suma
 * `supabase: true` en Sprint 9 (HU-10.1/10.2): `core/auth/auth.service.ts`
 * de ese remote necesita saber reactivamente si hay un Cliente autenticado
 * para decidir si mostrar el widget flotante de voz.
 */
const APPS = {
  // `apiUrl`: agregado a shell en Sprint 6 (HU-6.2, Issue #18) — OtpService
  // llama directo a POST /auth/otp/request y /auth/otp/verify. Si este mapa
  // queda desactualizado respecto al environment.ts real de la app, el
  // síntoma es un error de TypeScript en el build de Vercel ("Property
  // 'apiUrl' does not exist on type...") — no un error de este script (que
  // corre sin problema, solo que genera un objeto incompleto).
  shell: { apiUrl: true, supabase: true },
  "portal-cliente": { apiUrl: true, supabase: true },
  "panel-admin": { apiUrl: true, supabase: true },
  "pwa-logistica": { apiUrl: true },
};

/** Remotes que el shell monta vía Native Federation. */
const REMOTES = {
  "portal-cliente": "NG_APP_REMOTE_PORTAL_CLIENTE",
  "pwa-logistica": "NG_APP_REMOTE_PWA_LOGISTICA",
  "panel-admin": "NG_APP_REMOTE_PANEL_ADMIN",
};

/** Lee una variable tratando la cadena vacía como ausente. */
function leer(nombre) {
  const valor = process.env[nombre];
  return valor && valor.trim() !== "" ? valor.trim() : undefined;
}

/**
 * Escapa un valor para incrustarlo en un literal de string de TypeScript.
 * Los valores vienen de variables de entorno (una anon key de Supabase, una
 * URL); una comilla o una barra invertida sin escapar generaría un
 * `environment.ts` sintácticamente inválido y el build fallaría con un error
 * incomprensible en vez de acá.
 */
function comoLiteralTs(valor) {
  return JSON.stringify(String(valor));
}

function generarEnvironment(app) {
  const forma = APPS[app];
  const apiUrl = forma.apiUrl ? leer("NG_APP_API_URL") : undefined;
  const supabaseUrl = forma.supabase ? leer("NG_APP_SUPABASE_URL") : undefined;
  const supabaseKey = forma.supabase ? leer("NG_APP_SUPABASE_ANON_KEY") : undefined;

  const definidas = [apiUrl, supabaseUrl, supabaseKey].filter(Boolean).length;
  if (definidas === 0) {
    return { estado: "omitido", motivo: "ninguna variable NG_APP_* definida" };
  }

  // Falta parcial: es peor desplegar un bundle a medio configurar (que falla
  // en runtime, en el navegador del evaluador) que fallar el build acá.
  const faltantes = [];
  if (forma.apiUrl && !apiUrl) faltantes.push("NG_APP_API_URL");
  if (forma.supabase && !supabaseUrl) faltantes.push("NG_APP_SUPABASE_URL");
  if (forma.supabase && !supabaseKey) faltantes.push("NG_APP_SUPABASE_ANON_KEY");
  if (faltantes.length > 0) {
    throw new Error(
      `[${app}] configuración parcial — faltan: ${faltantes.join(", ")}. ` +
        `Definilas todas o ninguna (ninguna = usar los placeholders commiteados).`,
    );
  }

  const campos = ["  production: true,"];
  if (apiUrl) campos.push(`  apiUrl: ${comoLiteralTs(apiUrl)},`);
  if (supabaseUrl) {
    campos.push("  supabase: {");
    campos.push(`    url: ${comoLiteralTs(supabaseUrl)},`);
    campos.push(`    anonKey: ${comoLiteralTs(supabaseKey)},`);
    campos.push("  },");
  }

  const contenido = [
    "// ARCHIVO GENERADO — no editar a mano ni commitear los valores reales.",
    "// Lo produce scripts/generate-frontend-config.mjs desde las variables",
    "// NG_APP_* del entorno de build. La versión versionada de este archivo",
    "// tiene placeholders y es el fallback de desarrollo local.",
    "export const environment = {",
    ...campos,
    "};",
    "",
  ].join("\n");

  const destino = join(RAIZ, "apps", app, "src", "environments", "environment.ts");
  writeFileSync(destino, contenido, "utf8");
  return { estado: "generado", destino, campos: campos.length - 1 };
}

function generarManifiestoFederacion() {
  const entradas = {};
  for (const [remote, variable] of Object.entries(REMOTES)) {
    const base = leer(variable);
    if (base) {
      // `base` se usa tal cual (ver nota de topología en la cabecera). Solo
      // se normaliza la barra final para no emitir `//remoteEntry.json`.
      entradas[remote] = `${base.replace(/\/+$/, "")}/remoteEntry.json`;
    }
  }

  const declaradas = Object.keys(entradas).length;
  if (declaradas === 0) {
    return { estado: "omitido", motivo: "ninguna variable NG_APP_REMOTE_* definida" };
  }

  // Un manifest con dos de tres remotes produce un shell donde una sección
  // entera no carga, y el síntoma en el navegador no apunta a esta causa.
  if (declaradas !== Object.keys(REMOTES).length) {
    const faltantes = Object.entries(REMOTES)
      .filter(([remote]) => !entradas[remote])
      .map(([, variable]) => variable);
    throw new Error(
      `[shell] manifest de federación parcial — faltan: ${faltantes.join(", ")}. ` +
        `Definí las tres o ninguna.`,
    );
  }

  const destino = join(RAIZ, "apps", "shell", "public", "federation.manifest.json");
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, `${JSON.stringify(entradas, null, 2)}\n`, "utf8");
  return { estado: "generado", destino, entradas };
}

function main() {
  const args = process.argv.slice(2);
  const objetivo = args[0];

  if (!objetivo) {
    console.error("Uso: node scripts/generate-frontend-config.mjs <app|--all>");
    process.exit(2);
  }

  const apps = objetivo === "--all" ? Object.keys(APPS) : [objetivo];
  for (const app of apps) {
    if (!APPS[app]) {
      console.error(`App desconocida: ${app}. Conocidas: ${Object.keys(APPS).join(", ")}`);
      process.exit(2);
    }
  }

  for (const app of apps) {
    const r = generarEnvironment(app);
    console.log(
      r.estado === "generado"
        ? `[${app}] environment.ts generado (${r.campos} campo(s)).`
        : `[${app}] environment.ts sin cambios — ${r.motivo}; se usa el commiteado.`,
    );
  }

  if (apps.includes("shell")) {
    const r = generarManifiestoFederacion();
    console.log(
      r.estado === "generado"
        ? `[shell] federation.manifest.json generado:\n${JSON.stringify(r.entradas, null, 2)}`
        : `[shell] federation.manifest.json sin cambios — ${r.motivo}; se usa el commiteado (localhost).`,
    );
  }
}

// Los errores de este script son de CONFIGURACIÓN, no bugs: el stack trace de
// Node no aporta nada y entierra el único dato accionable (qué variable
// falta). Se reporta como una línea limpia en stderr, con `::error::` para
// que GitHub Actions lo muestre como anotación en el resumen del run en vez
// de obligar a abrir los logs.
try {
  main();
} catch (error) {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`::error::${mensaje}`);
  console.error(`\ngenerate-frontend-config: ${mensaje}`);
  process.exit(1);
}
