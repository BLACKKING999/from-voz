/**
 * Servicio centralizado para las llamadas a la API
 * Este archivo maneja todas las interacciones con el backend
 */
import axios from 'axios';
import { API_BASE_URL, API_PREFIX, API_TIMEOUT, API_ROUTES } from '../config/config';
import { auth } from '../utils/firebase';

// Crear una instancia de axios con configuración predeterminada
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}${API_PREFIX}`,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: false // Cambiar a true si necesitas enviar cookies
});

/**
 * Agrega el token de autenticación al header
 * @returns {Promise<string>} El token de autenticación
 */
const getAuthToken = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return null;
  }
  return await currentUser.getIdToken();
};

/**
 * Realizar una petición GET autenticada
 * @param {string} url - URL relativa para la petición
 * @param {Object} params - Parámetros de consulta (query params)
 * @param {boolean} requireAuth - Si la petición requiere autenticación
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const get = async (url, params = {}, requireAuth = true) => {
  try {
    const headers = {};
    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await apiClient.get(url, { params, headers });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Realizar una petición POST autenticada
 * @param {string} url - URL relativa para la petición
 * @param {Object} data - Datos a enviar en el cuerpo de la petición
 * @param {boolean} requireAuth - Si la petición requiere autenticación
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const post = async (url, data = {}, requireAuth = true) => {
  try {
    const headers = {};
    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await apiClient.post(url, data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Realizar una petición PUT autenticada
 * @param {string} url - URL relativa para la petición
 * @param {Object} data - Datos a enviar en el cuerpo de la petición
 * @param {boolean} requireAuth - Si la petición requiere autenticación
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const put = async (url, data = {}, requireAuth = true) => {
  try {
    const headers = {};
    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await apiClient.put(url, data, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Realizar una petición DELETE autenticada
 * @param {string} url - URL relativa para la petición
 * @param {boolean} requireAuth - Si la petición requiere autenticación
 * @returns {Promise<Object>} - Respuesta de la API
 */
export const remove = async (url, requireAuth = true) => {
  try {
    const headers = {};
    if (requireAuth) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    const response = await apiClient.delete(url, { headers });
    return response.data;
  } catch (error) {
    handleApiError(error);
    throw error;
  }
};

/**
 * Maneja los errores de la API de manera centralizada
 * @param {Error} error - Error de la petición
 */
const handleApiError = (error) => {
  // Aquí puedes implementar lógica adicional, como mostrar notificaciones,
  // redirigir al usuario a la página de login si hay un error de autenticación, etc.
};

/**
 * Servicios específicos para diferentes entidades
 */
export const SurveyService = {
  // Obtener todas las encuestas del usuario actual
  getAllSurveys: () => get(API_ROUTES.SURVEYS),
  
  // Obtener encuestas públicas
  getPublicSurveys: () => get(API_ROUTES.PUBLIC_SURVEYS, {}, false),
  
  // Obtener una encuesta específica
  getSurvey: (id) => get(API_ROUTES.SURVEY_DETAIL(id)),
  
  // Obtener una encuesta pública específica
  getPublicSurvey: (id) => get(API_ROUTES.PUBLIC_SURVEY_DETAIL(id), {}, false),
  
  // Obtener respuestas de una encuesta específica
  getSurveyResponses: (id) => get(`/responses/survey/${id}`),
  
  // Crear una nueva encuesta
  createSurvey: (surveyData) => post(API_ROUTES.SURVEYS, surveyData),
  
  // Actualizar una encuesta existente
  updateSurvey: (id, surveyData) => put(API_ROUTES.SURVEY_DETAIL(id), surveyData),
  
  // Eliminar una encuesta
  deleteSurvey: (id) => remove(API_ROUTES.SURVEY_DETAIL(id))
};

export const ResponseService = {
  // Obtener todas las respuestas
  getAllResponses: () => get(API_ROUTES.RESPONSES),
  
  // Obtener una respuesta específica
  getResponse: (id) => get(API_ROUTES.RESPONSE_DETAIL(id)),
  
  // Obtener respuestas para una encuesta específica
  getSurveyResponses: (surveyId) => get(`/responses/survey/${surveyId}`),
  
  // Enviar una nueva respuesta (no requiere autenticación)
  submitResponse: (responseData) => post(API_ROUTES.RESPONSES, responseData, false)
};

export const UserService = {
  // Obtener el perfil del usuario actual
  getUserProfile: () => get(API_ROUTES.USER_PROFILE),
  
  // Actualizar el perfil del usuario
  updateUserProfile: (profileData) => put(API_ROUTES.USER_PROFILE, profileData),
  
  // Crear un nuevo usuario o actualizar uno existente
  createUser: (userData) => post(API_ROUTES.USERS, userData, true)
};

// Exportar los servicios y funciones básicas
const apiService = {
  get,
  post,
  put,
  remove,
  SurveyService,
  ResponseService,
  UserService
};

export default apiService;