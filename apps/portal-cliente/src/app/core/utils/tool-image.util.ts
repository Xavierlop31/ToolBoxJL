/**
 * Resuelve la imagen adecuada para un modelo de herramienta.
 * Si el modelo incluye una `imagen_url` explícita, la retorna; de lo contrario,
 * retorna una fotografía industrial de alta resolución acorde a su categoría o nombre.
 */
export function getToolImageUrl(model: {
  nombre?: string;
  marca?: string;
  categoria?: string;
  imagen_url?: string | null;
}): string {
  if (model.imagen_url && model.imagen_url.trim().length > 0) {
    return model.imagen_url;
  }

  const name = (model.nombre || '').toLowerCase();
  const cat = (model.categoria || '').toLowerCase();

  // Perforación (Rotomartillos, Taladros, Atornilladores)
  if (cat.includes('perforac') || name.includes('rotomartillo') || name.includes('taladro') || name.includes('atornillador')) {
    if (name.includes('rotomartillo') || name.includes('sds')) {
      return 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&auto=format&fit=crop&q=80';
  }

  // Corte y Desbaste (Esmeriles, Sierras, Lijadoras, Ingletadoras)
  if (cat.includes('corte') || name.includes('esmeril') || name.includes('sierra') || name.includes('tronzadora') || name.includes('ingletadora') || name.includes('lijadora') || name.includes('cortadora')) {
    if (name.includes('ingletadora') || name.includes('sierra')) {
      return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&auto=format&fit=crop&q=80';
    }
    if (name.includes('lijadora') || name.includes('cepillo')) {
      return 'https://images.unsplash.com/photo-1513467535987-fd81bc7d62f8?w=600&auto=format&fit=crop&q=80';
    }
    return 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80';
  }

  // Demolición (Martillos demoledores, Vibroapisonadores, Compactadores)
  if (cat.includes('demolic') || name.includes('martillo') || name.includes('canguro') || name.includes('compactador') || name.includes('rompedor')) {
    return 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=80';
  }

  // Medición y Nivelación (Niveles láser, Distanciómetros, Cámaras térmicas)
  if (cat.includes('medici') || name.includes('laser') || name.includes('nivel') || name.includes('termogr') || name.includes('topogr')) {
    return 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=600&auto=format&fit=crop&q=80';
  }

  // Generación y Energía (Generadores, Soldadores, Plantas)
  if (cat.includes('generac') || name.includes('generador') || name.includes('soldador') || name.includes('planta') || name.includes('inverter')) {
    return 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=600&auto=format&fit=crop&q=80';
  }

  // Compresión y Pintura (Compresores, Airless)
  if (cat.includes('compres') || name.includes('compresor') || name.includes('airless') || name.includes('pintura')) {
    return 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=600&auto=format&fit=crop&q=80';
  }

  // Limpieza y Lavado (Hidrolavadoras, Aspiradoras)
  if (cat.includes('limpieza') || name.includes('hidrolavadora') || name.includes('aspiradora') || name.includes('bomba')) {
    return 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=600&auto=format&fit=crop&q=80';
  }

  // Default
  return 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
}

export const FALLBACK_TOOL_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80';
