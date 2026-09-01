import {
  colorTokens,
  typographyTokens,
  spacingTokens,
  radiusTokens,
  shadowTokens,
  breakpointTokens,
  designTokens,
} from './design-tokens';

describe('design-tokens', () => {
  it('expone los colores de marca de Industrial Racing', () => {
    expect(colorTokens.brand.primary500).toBe('#141CDB');
    expect(colorTokens.brand.secondary500).toBe('#E70012');
    expect(colorTokens.brand.primary700).toBe('#0B0E3D');
  });

  it('expone la escala de neutros', () => {
    expect(colorTokens.neutral[0]).toBe('#FFFFFF');
    expect(colorTokens.neutral[900]).toBe('#161C21');
  });

  it('expone los colores de feedback', () => {
    expect(colorTokens.feedback.success).toBe('#1E9E5A');
    expect(colorTokens.feedback.error).toBe('#BA1A1A');
  });

  it('expone la tipografía por defecto con Inter y Montserrat', () => {
    expect(typographyTokens.fontFamily).toContain('Inter');
    expect(typographyTokens.fontFamilyHeadings).toContain('Montserrat');
    expect(typographyTokens.fontSize.base).toBe('1rem');
    expect(typographyTokens.fontWeight.bold).toBe(700);
    expect(typographyTokens.lineHeight.normal).toBe(1.5);
  });

  it('expone la escala de espaciados', () => {
    expect(spacingTokens[0]).toBe('0');
    expect(spacingTokens[4]).toBe('1rem');
    expect(spacingTokens[16]).toBe('4rem');
  });

  it('expone los radios de borde', () => {
    expect(radiusTokens.sm).toBe('0.25rem');
    expect(radiusTokens.full).toBe('9999px');
  });

  it('expone las sombras', () => {
    expect(shadowTokens.sm).toContain('rgba(17, 24, 39');
    expect(shadowTokens.lg).toBeDefined();
  });

  it('expone los breakpoints responsive', () => {
    expect(breakpointTokens.sm).toBe('640px');
    expect(breakpointTokens.xl).toBe('1280px');
  });

  it('agrupa todos los tokens individuales dentro de designTokens', () => {
    expect(designTokens.color).toBe(colorTokens);
    expect(designTokens.typography).toBe(typographyTokens);
    expect(designTokens.spacing).toBe(spacingTokens);
    expect(designTokens.radius).toBe(radiusTokens);
    expect(designTokens.shadow).toBe(shadowTokens);
    expect(designTokens.breakpoint).toBe(breakpointTokens);
  });
});
