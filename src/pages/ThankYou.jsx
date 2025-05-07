import React from 'react';
import { useLocation, Link } from 'react-router-dom';

const ThankYou = () => {
  const location = useLocation();
  const message = location.state?.message || '¡Gracias por completar la encuesta!';

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg text-center">
      <div className="mb-6">
        <svg 
          className="mx-auto h-24 w-24 text-green-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-800 mb-4">¡Gracias!</h1>
      
      <p className="text-lg text-gray-600 mb-8">{message}</p>
      
      <div className="flex flex-col space-y-3">
        <Link 
          to="/surveys/public" 
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Ver más encuestas
        </Link>
        
        <Link 
          to="/" 
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default ThankYou; 