import React from 'react';

const LoadingSpinner = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-inner">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-red-700 mb-4"></div>
      <p className="text-red-800 font-semibold">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
