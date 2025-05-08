import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { SurveyService, ResponseService } from '../services/apiService';

const Dashboard = () => {
  const [surveys, setSurveys] = useState([]);
  const [responses, setResponses] = useState([]);
  const [surveyResponseCounts, setSurveyResponseCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        
        // Obtener encuestas usando el servicio centralizado
        const surveysData = await SurveyService.getAllSurveys();
        console.log("Encuestas cargadas:", surveysData);
        setSurveys(surveysData);
        
        // Obtener respuestas usando el servicio centralizado
        try {
          const responsesData = await ResponseService.getAllResponses();
          console.log("Respuestas cargadas:", responsesData);
          setResponses(responsesData);
          
          // Cargar el recuento de respuestas para cada encuesta individualmente
          const responseCountsObj = {};
          for (const survey of surveysData) {
            try {
              const responseData = await ResponseService.getSurveyResponses(survey._id);
              console.log(`Respuestas para encuesta ${survey._id}:`, responseData);
              
              // Verificar el formato de la respuesta - puede ser un objeto o un array
              let count = 0;
              if (responseData && typeof responseData === 'object') {
                // Si es un objeto con una propiedad 'responses' que es un array
                if (responseData.responses && Array.isArray(responseData.responses)) {
                  count = responseData.responses.length;
                  console.log(`Se encontraron ${count} respuestas en survey ${survey._id}`);
                }
                // Si tiene un analysis con totalResponses
                else if (responseData.analysis && typeof responseData.analysis.totalResponses === 'number') {
                  count = responseData.analysis.totalResponses;
                  console.log(`Total respuestas desde analysis: ${count}`);
                }
                // Verificar otras posibles estructuras
                else if (responseData.items && Array.isArray(responseData.items)) {
                  count = responseData.items.length;
                }
                else if (responseData.data && Array.isArray(responseData.data)) {
                  count = responseData.data.length;
                }
                // Si el objeto mismo es un array
                else if (Array.isArray(responseData)) {
                  count = responseData.length;
                }
              }
              // Si directamente es un array
              else if (Array.isArray(responseData)) {
                count = responseData.length;
              }
              
              responseCountsObj[survey._id] = count;
            } catch (e) {
              console.warn(`Error al cargar respuestas para encuesta ${survey._id}:`, e);
              responseCountsObj[survey._id] = 0;
            }
          }
          setSurveyResponseCounts(responseCountsObj);
        } catch (responseError) {
          console.warn('No se pudieron cargar las respuestas:', responseError);
          // No mostramos error al usuario ya que esto es secundario
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al obtener datos:', error);
        setError('No se pudieron cargar los datos. Por favor, intenta de nuevo más tarde.');
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/create-survey" className="btn btn-primary">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Crear Nueva Encuesta
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Surveys Card */}
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200">
          <div className="flex items-center">
            <div className="rounded-full bg-primary-200 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Encuestas</p>
              <p className="text-2xl font-bold text-gray-800">{surveys.length}</p>
            </div>
          </div>
        </div>

        {/* Total Responses Card */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-200 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Respuestas</p>
              <p className="text-2xl font-bold text-gray-800">{responses.length}</p>
            </div>
          </div>
        </div>

        {/* Completion Rate Card */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
          <div className="flex items-center">
            <div className="rounded-full bg-green-200 p-3 mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Tasa de Finalización</p>
              <p className="text-2xl font-bold text-gray-800">
                {surveys.length > 0 
                  ? `${Math.round((responses.filter(r => r.completed).length / surveys.length) * 100)}%` 
                  : '0%'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Mis Encuestas</h2>

      {loading ? (
        <div className="flex justify-center my-12">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : error ? (
        <div className="card text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 mb-2">{error}</h3>
        </div>
      ) : surveys.length === 0 ? (
        <div className="card text-center py-12">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-800 mb-2">No tienes encuestas todavía</h3>
          <p className="text-gray-600 mb-6">¡Crea tu primera encuesta para comenzar a recopilar respuestas por voz!</p>
          <Link to="/create-survey" className="btn btn-primary">
            Crear Nueva Encuesta
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey._id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg">{survey.title}</h3>
                  <p className="text-sm text-gray-500">Creada: {formatDate(survey.createdAt)}</p>
                </div>
                <div className="badge badge-primary">
                  {surveyResponseCounts[survey._id] || 0} respuestas
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 line-clamp-2">{survey.description || 'Sin descripción'}</p>
              
              <div className="flex justify-between items-center mt-auto">
                <Link to={`/surveys/${survey._id}`} className="text-primary-700 hover:text-primary-900 text-sm font-medium">
                  Ver detalles
                </Link>
                <div className="flex space-x-2">
                  <Link to={`/surveys/${survey._id}`} className="btn btn-icon btn-outline btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                  <Link to={`/take-survey/${survey._id}`} className="btn btn-icon btn-outline btn-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Recent Responses Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Respuestas Recientes</h2>
        
        {loading ? (
          <div className="text-center py-4">
            <div className="spinner"></div>
          </div>
        ) : responses.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600">Aún no hay respuestas a tus encuestas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2">Encuesta</th>
                  <th className="px-4 py-2">Respondiente</th>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {responses.slice(0, 5).map((response) => (
                  <tr key={response._id || `response-${Math.random()}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{response.surveyTitle || 'Encuesta sin título'}</td>
                    <td className="px-4 py-3">{response.respondentName || 'Anónimo'}</td>
                    <td className="px-4 py-3">{response.createdAt ? formatDate(response.createdAt) : 'Fecha desconocida'}</td>
                    <td className="px-4 py-3">
                      {response._id ? (
                        <Link to={`/responses/${response._id}`} className="text-primary-600 hover:text-primary-800">
                          Ver respuestas
                        </Link>
                      ) : (
                        <span className="text-gray-400">No disponible</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
