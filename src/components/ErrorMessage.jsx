import React from 'react';
import { Link } from 'react-router-dom';

const ErrorMessage = ({ message, onRetry }) => {
  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white rounded-lg shadow-lg border-l-4 border-red-500">
      <div className="flex items-center mb-4">
        <svg 
          className="h-6 w-6 text-red-500 mr-3" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="text-xl font-bold text-gray-800">Error</h2>
      </div>
      
      <p className="text-gray-600 mb-6">{message}</p>
      
      <div className="flex space-x-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        )}
        
        <Link 
          to="/" 
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default ErrorMessage; 