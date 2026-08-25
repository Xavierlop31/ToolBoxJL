import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor simple para adjuntar el token JWT de Supabase Auth a las peticiones salientes.
 * Lee el token directamente del localStorage donde Supabase guarda la sesión por defecto.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  let token: string | null = null;

  try {
    // Supabase guarda la sesión en localStorage con una llave que contiene el prefijo 'sb-'
    const keys = Object.keys(localStorage);
    const supabaseKey = keys.find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    if (supabaseKey) {
      const sessionData = localStorage.getItem(supabaseKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        token = parsed?.access_token || null;
      }
    }
  } catch (e) {
    console.error('Error al leer el token de Supabase para el interceptor:', e);
  }

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
