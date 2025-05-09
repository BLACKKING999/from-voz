/**
 * Configuración global de la aplicación
 */

// URL base de la API
export const API_BASE_URL = 'https://sistema-de-encuestas-por-voz.onrender.com';

// Tiempo de espera para las peticiones (en milisegundos)
export const API_TIMEOUT = 10000;

// Prefijo para todas las rutas de la API
export const API_PREFIX = '/api';

// Configuración de rutas específicas de la API
export const API_ROUTES = {
  // Rutas de encuestas
  SURVEYS: '/surveys',
  PUBLIC_SURVEYS: '/surveys/public',
  SURVEY_DETAIL: (id) => `/surveys/${id}`,
  PUBLIC_SURVEY_DETAIL: (id) => `/surveys/public/${id}`,
  
  // Rutas de respuestas
  RESPONSES: '/responses',
  RESPONSE_DETAIL: (id) => `/responses/${id}`,
  
  // Rutas de usuarios
  USERS: '/users',
  USER_PROFILE: '/users/profile',
  
  // Ruta de verificación de salud
  HEALTH: '/health'
};
