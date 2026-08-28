/**
 * Design tokens — ToolBox JL
 *
 * Fuente de verdad: Google Stitch Project 6704671418307409330
 * Estilo: "Industrial Racing" (Brand Blue #141CDB, Brand Red #E70012, Deep Navy #0B0E3D)
 * Tipografía: Montserrat (Display/Headings) + Inter (Body/UI/Data)
 */

export const colorTokens = {
  brand: {
    // Azul Industrial & Rojo Acción — Sistema Industrial Racing de Stitch
    primary50: '#E0E0FF',
    primary100: '#BEC2FF',
    primary300: '#3943F2',
    primary500: '#141CDB', // Color primario de marca (Brand Blue)
    primary600: '#0003A8', // Azul profundo
    primary700: '#0B0E3D', // Deep Navy
    // Color secundario (Brand Red)
    secondary500: '#E70012',
    secondary600: '#BC000C',
    secondary700: '#8E0E00',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F5FAFF', // Superficie principal
    100: '#EEF4FB', // Contenedor bajo
    200: '#E8EFF5', // Contenedor medio
    300: '#DCE3EA', // Contenedor alto / bordes
    500: '#757588', // Outline
    700: '#454556', // On-surface variant
    900: '#161C21', // Texto principal (On-surface)
  },
  feedback: {
    success: '#1E9E5A',
    warning: '#E0A400',
    error: '#BA1A1A',
    info: '#141CDB',
  },
  surface: {
    background: '#F5FAFF',
    card: '#FFFFFF',
    border: '#DCE3EA',
  },
} as const;

export const typographyTokens = {
  fontFamily:
    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  fontFamilyHeadings:
    "'Montserrat', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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
