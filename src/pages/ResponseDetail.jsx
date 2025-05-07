import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../utils/firebase';

const ResponseDetail = () => {
  const { responseId } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchResponseData = async () => {
      if (!responseId || !user) {
        setLoading(false);
        setError('Se requiere autenticación para ver esta respuesta');
        return;
      }

      try {
        setLoading(true);
        console.log(`Intentando cargar la respuesta con ID: ${responseId}`);
        
        // Obtener token de autenticación
        const token = await user.getIdToken();
        
        // Obtener datos de la respuesta
        const responseData = await axios.get(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/responses/${responseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        console.log('Respuesta cargada:', responseData.data);
        setResponse(responseData.data);
        
        // Cargar datos de la encuesta asociada
        if (responseData.data && responseData.data.surveyId) {
          try {
            const surveyData = await axios.get(
              `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/surveys/${responseData.data.surveyId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              }
            );
            console.log('Encuesta cargada:', surveyData.data);
            setSurvey(surveyData.data);
          } catch (surveyError) {
            console.warn('No se pudo cargar la encuesta asociada:', surveyError);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar la respuesta:', error);
        
        if (error.response && error.response.status === 404) {
          setError('Respuesta no encontrada. Puede que haya sido eliminada o no tengas acceso.');
        } else {
          setError('Error al cargar los datos de la respuesta. Por favor, intenta de nuevo más tarde.');
        }
        
        setLoading(false);
      }
    };

    fetchResponseData();
  }, [responseId, user]);

  // Format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Obtener la pregunta correspondiente a un ID
  const getQuestionText = (questionId) => {
    if (!survey || !survey.questions) return 'Pregunta no disponible';
    
    const question = survey.questions.find(q => q._id === questionId);
    return question ? question.text : 'Pregunta no disponible';
  };

  // Obtener el tipo de pregunta
  const getQuestionType = (questionId) => {
    if (!survey || !survey.questions) return null;
    
    const question = survey.questions.find(q => q._id === questionId);
    return question ? question.type : null;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-10 w-10 text-primary-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-xl font-bold text-gray-800 mb-2">{error || 'Error'}</h2>
        <p className="text-gray-600 mb-4">No se pudo cargar la información de la respuesta.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Respuesta no encontrada</h2>
        <p className="text-gray-600 mb-4">La respuesta que estás buscando no existe o ha sido eliminada.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Detalles de la Respuesta</h1>
          {survey && (
            <p className="text-gray-600">
              Encuesta: <Link to={`/surveys/${survey._id}`} className="text-primary-600 hover:underline">{survey.title}</Link>
            </p>
          )}
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn btn-outline mt-4 md:mt-0"
        >
          Volver al Dashboard
        </button>
      </div>

      <div className="card mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Respondiente</div>
              <div className="font-medium">{response.respondentName || 'Anónimo'}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Fecha de Respuesta</div>
              <div className="font-medium">{formatDate(response.createdAt)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Estado</div>
              <div className="font-medium">
                {response.completed ? (
                  <span className="text-green-600">Completada</span>
                ) : (
                  <span className="text-yellow-600">Incompleta</span>
                )}
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold mb-4">Respuestas</h2>
          
          {response.answers && response.answers.length > 0 ? (
            <div className="space-y-4">
              {response.answers.map((answer, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="text-sm text-gray-500">Pregunta {index + 1}</div>
                  <div className="font-medium mb-2">{getQuestionText(answer.questionId)}</div>
                  
                  <div className="flex items-start">
                    <div className="text-sm text-gray-500 mr-2">Respuesta:</div>
                    <div className="font-medium">
                      {getQuestionType(answer.questionId) === 'rating' ? (
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className={`h-5 w-5 ${i < parseInt(answer.value) ? 'text-yellow-400' : 'text-gray-300'}`} 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 20 20" 
                              fill="currentColor"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      ) : getQuestionType(answer.questionId) === 'yesno' ? (
                        <span className={`px-2 py-1 rounded ${answer.value.toLowerCase() === 'sí' || answer.value.toLowerCase() === 'si' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {answer.value}
                        </span>
                      ) : (
                        <div className="bg-gray-50 p-3 rounded">
                          "{answer.value}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No hay respuestas disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponseDetail;
