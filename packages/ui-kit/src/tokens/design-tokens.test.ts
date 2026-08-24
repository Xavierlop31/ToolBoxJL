import { test } from 'node:test';
import assert from 'node:assert/strict';
import { designTokens } from './design-tokens.js';

const hexColor = /^#[0-9a-f]{6}$/i;

test('designTokens expone las 6 categorías esperadas', () => {
  assert.deepEqual(Object.keys(designTokens).sort(), [
    'breakpoint',
    'color',
    'radius',
    'shadow',
    'spacing',
    'typography',
  ]);
});

test('todos los colores de marca, neutrales y feedback son hex válidos (#RRGGBB)', () => {
  const { brand, neutral, feedback, surface } = designTokens.color;
  const allColors = {
    ...brand,
    ...neutral,
    ...feedback,
    ...surface,
  } as Record<string, string>;

  for (const [name, value] of Object.entries(allColors)) {
    assert.match(value, hexColor, `${name} = "${value}" no es un hex válido`);
  }
});

test('la escala tipográfica es estrictamente creciente', () => {
  const order: (keyof typeof designTokens.typography.fontSize)[] = [
    'xs',
    'sm',
    'base',
    'lg',
    'xl',
    '2xl',
    '3xl',
  ];
  const sizesRem = order.map(
    (key) => parseFloat(designTokens.typography.fontSize[key]),
  );

  for (let i = 1; i < sizesRem.length; i++) {
    assert.ok(
      sizesRem[i] > sizesRem[i - 1],
      `${order[i]} (${sizesRem[i]}rem) debería ser mayor que ${order[i - 1]} (${sizesRem[i - 1]}rem)`,
    );
  }
});

test('color primario de marca cumple un mínimo de contraste sobre blanco (heurística WCAG simplificada)', () => {
  // Cálculo simplificado de luminancia relativa (sRGB) para un chequeo
  // rápido de que el color de marca no es "claro sobre claro" — no
  // reemplaza una auditoría real de contraste AA/AAA contra el spec UI/UX.
  const hex = designTokens.color.brand.primary500;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  assert.ok(
    luminance < 0.6,
    `primary500 (${hex}) es demasiado claro para texto/ícono sobre fondo blanco`,
  );
});
