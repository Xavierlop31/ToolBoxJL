/**
 * Design tokens — ToolBox JL
 *
 * ASUNCIÓN (Sprint 0): la referencia formal es
 * `docs/04_Especificacion_UIUX_ToolBoxJL.docx`, que no es legible desde este
 * entorno de agente (archivo .docx binario). Estos valores son un punto de
 * partida provisorio inferido de `docs/DESIGN.md` (rubro: alquiler/venta de
 * herramientas eléctricas para construcción — tono industrial, alto
 * contraste, confiable) y de convenciones estándar de accesibilidad
 * (contraste AA). El Tech Lead debe reemplazarlos por los valores reales del
 * documento UI/UX al conectar el proyecto de Stitch (Plan de Implementación,
 * Sprint 10 según el roadmap de Frontend, o antes si el documento se vuelve
 * legible primero).
 *
 * No se ajustó nada de esto contra el .docx: es una base de trabajo, no la
 * fuente de verdad.
 */

export const colorTokens = {
  brand: {
    // Naranja "seguridad industrial" — asociación visual con herramientas de
    // construcción y EPP (equipo de protección personal).
    primary50: '#FFF4ED',
    primary100: '#FFE3D1',
    primary300: '#FFA968',
    primary500: '#F2600C', // color de marca principal
    primary600: '#C94C08',
    primary700: '#9C3B07',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F7F7F8',
    100: '#EDEEF0',
    200: '#D7D9DD',
    300: '#B4B8BF',
    500: '#6B7280',
    700: '#374151',
    900: '#111827', // texto principal
  },
  feedback: {
    success: '#1B8A5A',
    warning: '#B7791F',
    error: '#C0362C',
    info: '#2563EB',
  },
  surface: {
    background: '#F7F7F8',
    card: '#FFFFFF',
    border: '#D7D9DD',
  },
} as const;

export const typographyTokens = {
  // Familia tipográfica provisoria: sans-serif de alta legibilidad, con
  // fallback estándar del sistema (evita depender de una fuente externa
  // hasta que el UI/UX defina la tipografía de marca).
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacingTokens = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

export const radiusTokens = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  full: '9999px',
} as const;

export const shadowTokens = {
  sm: '0 1px 2px 0 rgba(17, 24, 39, 0.06)',
  md: '0 4px 8px -2px rgba(17, 24, 39, 0.1)',
  lg: '0 12px 24px -4px rgba(17, 24, 39, 0.14)',
} as const;

export const breakpointTokens = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;

export const designTokens = {
  color: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadow: shadowTokens,
  breakpoint: breakpointTokens,
} as const;

export type DesignTokens = typeof designTokens;
