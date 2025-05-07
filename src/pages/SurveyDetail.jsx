import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { auth } from '../utils/firebase';
import { SurveyService } from '../services/apiService';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const SurveyDetail = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('results');
  const user = auth.currentUser;

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Usar el servicio centralizado para obtener la encuesta
        const data = await SurveyService.getSurvey(surveyId);
        
        if (data) {
          setSurvey(data);
          setResponses(data.responses || []);
        } else {
          setError('No se pudo cargar la encuesta');
        }
        
        setLoading(false);
      } catch (error) {
        setError('Error al cargar la encuesta: ' + (error.message || 'Error desconocido'));
        setLoading(false);
      }
    };

    fetchSurvey();
  }, [surveyId]);

  // Format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  // Prepare chart data for ratings
  const prepareRatingChartData = (questionResponses) => {
    if (!questionResponses || questionResponses.length === 0) {
      // Datos por defecto si no hay respuestas
      return {
        labels: ['1 ', '2 ', '3 ', '4 ', '5 '],
        datasets: [{
          label: 'Número de Respuestas',
          data: [0, 0, 0, 0, 0],
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(255, 159, 64, 0.6)',
            'rgba(255, 205, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(54, 162, 235, 0.6)'
          ]
        }]
      };
    }
    
    // Contar respuestas para cada valor
    const counts = {
      '1': 0, '2': 0, '3': 0, '4': 0, '5': 0
    };
    
    questionResponses.forEach(response => {
      const value = response.value;
      if (value >= 1 && value <= 5) {
        counts[value.toString()] = (counts[value.toString()] || 0) + 1;
      }
    });
    
    return {
      labels: ['1 ', '2 ', '3 ', '4 ', '5 '],
      datasets: [{
        label: 'Número de Respuestas',
        data: [counts['1'], counts['2'], counts['3'], counts['4'], counts['5']],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(255, 159, 64, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(54, 162, 235, 0.6)'
        ]
      }]
    };
  };

  // Prepare chart data for yes/no questions
  const prepareYesNoChartData = (questionResponses) => {
    if (!questionResponses || questionResponses.length === 0) {
      // Datos por defecto si no hay respuestas
      return {
        labels: ['Sí', 'No'],
        datasets: [{
          data: [0, 0],
          backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)']
        }]
      };
    }
    
    // Contar respuestas para Sí y No
    let yesCount = 0;
    let noCount = 0;
    
    questionResponses.forEach(response => {
      const value = response.value.toLowerCase();
      if (value === 'sí' || value === 'si' || value === 'yes') {
        yesCount++;
      } else if (value === 'no') {
        noCount++;
      }
    });
    
    return {
      labels: ['Sí', 'No'],
      datasets: [{
        data: [yesCount, noCount],
        backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)']
      }]
    };
  };

  // Get question responses
  const getQuestionResponses = (questionId) => {
    // Verificar que responses es un array
    if (!Array.isArray(responses)) {
      return [];
    }
    
    // Filtramos las respuestas que corresponden a esta pregunta
    return responses
      .filter(response => response && response.answers)
      .flatMap(response => {
        try {
          const answer = response.answers.find(a => a && a.questionId === questionId);
          return answer ? [{ value: answer.value }] : [];
        } catch (error) {
          return [];
        }
      });
  };

  // Eliminar encuesta
  const handleDelete = async () => {
    if (!window.confirm('¿Está seguro que desea eliminar esta encuesta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Usar el servicio centralizado para eliminar la encuesta
      await SurveyService.deleteSurvey(surveyId);
      
      navigate('/dashboard');
    } catch (error) {
      setError('Error al eliminar la encuesta: ' + (error.message || 'Error desconocido'));
      setLoading(false);
    }
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
        <p className="text-gray-600 mb-4">No se pudo cargar la información de la encuesta.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="btn btn-primary"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Encuesta no encontrada</h2>
        <p className="text-gray-600 mb-4">La encuesta que estás buscando no existe o ha sido eliminada.</p>
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
          <h1 className="text-2xl font-bold">{survey.title}</h1>
          <p className="text-gray-600">Creada: {formatDate(survey.createdAt)}</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-2">
          <Link 
            to={`/take-survey/${survey._id}`} 
            className="btn btn-primary"
            target="_blank"
          >
            Ver Encuesta
          </Link>
          <button 
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Eliminar Encuesta
          </button>
          <button className="btn btn-outline">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Compartir
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap border-b">
          <button 
            className={`px-4 py-2 ${activeTab === 'results' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-600'}`}
            onClick={() => setActiveTab('results')}
          >
            Resultados
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'overview' ? 'border-b-2 border-primary-500 text-primary-600 font-medium' : 'text-gray-600'}`}
            onClick={() => setActiveTab('overview')}
          >
            Información General
          </button>
        </div>

        <div className="p-4">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-lg font-medium mb-4">Información de la Encuesta</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Descripción</h3>
                  <p className="text-gray-600">{survey.description || 'Sin descripción'}</p>
                </div>
                <div className="space-y-2">
                  <div>
                    <h3 className="font-medium text-gray-700">Mensaje de Bienvenida</h3>
                    <p className="text-gray-600">{survey.welcomeMessage || 'Sin mensaje de bienvenida'}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-700">Mensaje de Despedida</h3>
                    <p className="text-gray-600">{survey.farewell || 'Sin mensaje de despedida'}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-2">Configuración</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500 text-sm">Estado</div>
                    <div className={`font-medium ${survey.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {survey.isActive ? 'Activa' : 'Inactiva'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500 text-sm">Acceso</div>
                    <div className="font-medium">
                      {survey.isPublic ? 'Pública' : 'Privada'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500 text-sm">Respuestas Anónimas</div>
                    <div className="font-medium">
                      {survey.allowAnonymous ? 'Permitidas' : 'No permitidas'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-gray-500 text-sm">Visitas</div>
                    <div className="font-medium">{survey.viewsCount || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-medium">Resultados</h2>
                <div className="text-gray-600">
                  Total de respuestas: <span className="font-medium">{responses.length}</span>
                </div>
              </div>

              {responses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600 mb-4">Todavía no hay respuestas para esta encuesta</p>
                  <div className="flex justify-center">
                    <Link to={`/take-survey/${survey._id}`} className="btn btn-primary" target="_blank">
                      Tomar la Encuesta
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {survey.questions.map((question, index) => {
                    const questionResponses = getQuestionResponses(question._id);
                    
                    return (
                      <div key={question._id} className="card p-4 border border-gray-200">
                        <div className="flex justify-between mb-4">
                          <div>
                            <div className="text-sm text-gray-500">Pregunta {index + 1}</div>
                            <div className="text-lg font-medium">{question.text}</div>
                          </div>
                          <div className="badge badge-primary">
                            {questionResponses.length} respuestas
                          </div>
                        </div>

                        <div className="mt-4">
                          {question.type === 'rating' && (
                            <div className="h-64">
                              <Bar 
                                data={prepareRatingChartData(questionResponses)} 
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        precision: 0
                                      }
                                    }
                                  }
                                }} 
                              />
                            </div>
                          )}

                          {question.type === 'yesno' && (
                            <div className="h-64 w-64 mx-auto">
                              <Pie 
                                data={prepareYesNoChartData(questionResponses)}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false
                                }}
                              />
                            </div>
                          )}

                          {question.type === 'open' && (
                            <div className="max-h-64 overflow-y-auto">
                              {questionResponses.length > 0 ? (
                                <ul className="space-y-2">
                                  {questionResponses.map((response, idx) => (
                                    <li key={idx} className="bg-gray-50 p-3 rounded">
                                      "{response.value}"
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-gray-500 italic text-center">No hay respuestas para esta pregunta</p>
                              )}
                            </div>
                          )}

                          {question.type === 'single' && (
                            <div className="h-64">
                              <Bar 
                                data={{
                                  labels: question.options,
                                  datasets: [{
                                    label: 'Respuestas',
                                    data: question.options.map(option => {
                                      return questionResponses.filter(r => r.value === option).length;
                                    }),
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                                  }]
                                }}
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  scales: {
                                    y: {
                                      beginAtZero: true,
                                      ticks: {
                                        precision: 0
                                      }
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyDetail;