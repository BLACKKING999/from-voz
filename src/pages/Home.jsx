import React from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../utils/firebase';

const Home = () => {
  const user = auth.currentUser;

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Hero Section */}
      <div className="flex flex-col-reverse lg:flex-row items-center gap-12">
        <div className="lg:w-1/2">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Crea encuestas interactivas con reconocimiento de voz
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Diseña experiencias de encuestas más naturales y accesibles. 
            Permitiendo a tus usuarios interactuar mediante la voz, obtendrás 
            respuestas más auténticas y una mayor participación.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary text-center">
                Ir al Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary text-center">
                  Crear Cuenta Gratis
                </Link>
                <Link to="/login" className="btn btn-outline text-center">
                  Iniciar Sesión
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="lg:w-1/2">
          <img 
            src="https://via.placeholder.com/600x400?text=Encuestas+por+Voz" 
            alt="Encuestas por Voz" 
            className="rounded-lg shadow-xl"
          />
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Características Principales</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card">
            <div className="rounded-full bg-primary-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Interacción por Voz</h3>
            <p className="text-gray-600">
              Utiliza la Web Speech API para reconocimiento y síntesis de voz, 
              creando encuestas con una experiencia conversacional natural.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="card">
            <div className="rounded-full bg-primary-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Análisis Avanzado</h3>
            <p className="text-gray-600">
              Visualiza los resultados con gráficos interactivos y obtén 
              insights a través de análisis de sentimientos básico.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="card">
            <div className="rounded-full bg-primary-100 p-3 w-12 h-12 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Optimizado para Móviles</h3>
            <p className="text-gray-600">
              Diseño responsive que funciona perfectamente en cualquier dispositivo, 
              permitiendo a los usuarios completar encuestas desde cualquier lugar.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Cómo Funciona</h2>
        
        <div className="flex flex-col space-y-12">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-primary-100 rounded-full h-32 w-32 flex items-center justify-center text-4xl font-bold text-primary-600">
                1
              </div>
            </div>
            <div className="md:w-1/2">
              <h3 className="text-2xl font-semibold mb-4">Crea tu Encuesta</h3>
              <p className="text-gray-600">
                Diseña tu encuesta con preguntas personalizadas y configura los mensajes 
                de bienvenida y despedida. Define el flujo natural de la conversación.
              </p>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-primary-100 rounded-full h-32 w-32 flex items-center justify-center text-4xl font-bold text-primary-600">
                2
              </div>
            </div>
            <div className="md:w-1/2">
              <h3 className="text-2xl font-semibold mb-4">Comparte tu Encuesta</h3>
              <p className="text-gray-600">
                Distribuye tu encuesta mediante un enlace o código QR. Los participantes 
                pueden acceder fácilmente desde cualquier dispositivo con un navegador moderno.
              </p>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 flex justify-center">
              <div className="bg-primary-100 rounded-full h-32 w-32 flex items-center justify-center text-4xl font-bold text-primary-600">
                3
              </div>
            </div>
            <div className="md:w-1/2">
              <h3 className="text-2xl font-semibold mb-4">Analiza los Resultados</h3>
              <p className="text-gray-600">
                Visualiza las respuestas mediante gráficos interactivos, análisis de 
                sentimientos y nubes de palabras. Exporta los datos para un análisis más profundo.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-primary-50 rounded-xl text-center p-8">
        <h2 className="text-3xl font-bold mb-6">¿Listo para comenzar?</h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Crea tu primera encuesta por voz en minutos y descubre cómo 
          la interacción conversacional mejora la experiencia de tus encuestados.
        </p>
        {user ? (
          <Link to="/create-survey" className="btn btn-primary inline-block">
            Crear Mi Primera Encuesta
          </Link>
        ) : (
          <Link to="/register" className="btn btn-primary inline-block">
            Crear Cuenta Gratis
          </Link>
        )}
      </div>
    </div>
  );
};

export default Home;
