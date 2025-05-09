import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SurveyService } from '../services/apiService';

const PublicSurveys = () => {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSurveys = async () => {
      try {
        setLoading(true);
        const data = await SurveyService.getPublicSurveys();
        setSurveys(data);
        setLoading(false);
      } catch (error) {
        setError('No se pudieron cargar las encuestas. Por favor, intenta de nuevo más tarde.');
        setLoading(false);
      }
    };

    fetchSurveys();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
  };

  if (loading) {
    return (
      <div className="flex justify-center my-12">
        <svg className="animate-spin h-8 w-8 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-xl font-semibold mb-2 text-red-700">Error</h2>
        <p className="text-gray-700 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-white text-red-700 border border-red-700 px-4 py-2 rounded hover:bg-red-100 transition"
        >
          Intentar nuevamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-red-700 text-white py-6 px-4 rounded-lg shadow mb-8">
        <h1 className="text-3xl font-extrabold tracking-wide">Encuestas Públicas Disponibles</h1>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg text-center py-12 px-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-bold text-red-700 mb-2">No hay encuestas disponibles</h3>
          <p className="text-gray-600 mb-6">Actualmente no hay encuestas públicas disponibles.</p>
          <Link to="/" className="bg-white text-red-700 font-bold px-4 py-2 rounded border border-red-700 hover:bg-red-100 transition">
            Volver al Inicio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey) => (
            <div key={survey._id} className="bg-white rounded-lg shadow-md p-5 hover:shadow-xl transition-shadow">
              <h2 className="text-xl font-bold text-red-700 mb-2">{survey.title}</h2>
              <p className="text-gray-700 mb-4 line-clamp-2">{survey.description || "Sin descripción"}</p>
              <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                <span>{survey.questionCount} preguntas</span>
                <span>Creada el {formatDate(survey.createdAt)}</span>
              </div>
              <Link 
                to={`/take-survey/${survey._id}`}
                className="bg-red-700 text-white px-4 py-2 rounded-lg w-full block text-center font-semibold hover:bg-red-800 transition"
              >
                Responder Encuesta
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PublicSurveys;
