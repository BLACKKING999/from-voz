import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../utils/firebase';

const Home = () => {
  const user = auth.currentUser;

  // Efecto de animación al cargar la página
  useEffect(() => {
    const animateElements = () => {
      const elements = document.querySelectorAll('.animate-on-scroll');
      elements.forEach((element, index) => {
        setTimeout(() => {
          element.classList.add('animate-active');
        }, 150 * index);
      });
    };
    
    animateElements();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="flex flex-col-reverse lg:flex-row items-center gap-12 py-8">
        <div className="lg:w-1/2 animate-on-scroll opacity-0 transition-all duration-700 transform translate-y-8" 
             style={{ animationDelay: '0.3s' }}>
          <h1 className="text-4xl md:text-6xl font-extrabold text-red-700 mb-6 leading-tight">
            Encuestas <span className="text-gray-800">por</span> <br/><span className="underline decoration-red-500 decoration-4 underline-offset-4">Voz</span>
          </h1>
          <p className="text-lg text-gray-700 mb-8 border-l-4 border-red-500 pl-4">
            Diseña experiencias de encuestas más naturales y accesibles. 
            Permitiendo a tus usuarios interactuar mediante la voz, obtendrás 
            respuestas más auténticas y una <span className="font-bold">mayor participación</span>.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link to="/dashboard" className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-center">
                Ir al Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="bg-red-700 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 text-center">
                  Crear Cuenta Gratis
                </Link>
                <Link to="/login" className="border-2 border-red-700 text-red-700 hover:bg-red-50 font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-center">
                  Iniciar Sesión
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="lg:w-1/2 animate-on-scroll opacity-0 transition-all duration-700 transform -translate-y-8" 
             style={{ animationDelay: '0.5s' }}>
          <div className="relative">
            <div className="absolute -inset-4 bg-red-200 rounded-full opacity-30 blur-xl"></div>
            <img 
              src="/logo192.png" 
              alt="Encuestas por Voz" 
              className="rounded-2xl shadow-2xl relative z-10 transform hover:rotate-2 transition-transform duration-300"
            />
            <div className="absolute -bottom-4 -right-4 bg-red-700 text-white p-4 rounded-lg shadow-lg z-20 font-bold">
              ¡Nueva Versión!
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <h2 className="text-3xl font-bold text-center mb-16 relative">
          <span className="relative z-10">Características Principales</span>
          <span className="absolute w-24 h-2 bg-red-500 left-1/2 transform -translate-x-1/2 bottom-0"></span>
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-red-700 animate-on-scroll opacity-0 transform translate-y-8">
            <div className="rounded-full bg-red-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-center text-gray-800">Interacción por Voz</h3>
            <p className="text-gray-600 text-center">
              Utiliza la Web Speech API para reconocimiento y síntesis de voz, 
              creando encuestas con una experiencia conversacional natural.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-red-700 animate-on-scroll opacity-0 transform translate-y-8" style={{ animationDelay: '0.2s' }}>
            <div className="rounded-full bg-red-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-center text-gray-800">Análisis Avanzado</h3>
            <p className="text-gray-600 text-center">
              Visualiza los resultados con gráficos interactivos y obtén 
              insights a través de análisis de sentimientos básico.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-t-4 border-red-700 animate-on-scroll opacity-0 transform translate-y-8" style={{ animationDelay: '0.4s' }}>
            <div className="rounded-full bg-red-100 p-4 w-16 h-16 flex items-center justify-center mb-6 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-center text-gray-800">Optimizado para Móviles</h3>
            <p className="text-gray-600 text-center">
              Diseño responsive que funciona perfectamente en cualquier dispositivo, 
              permitiendo a los usuarios completar encuestas desde cualquier lugar.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="py-16">
        <h2 className="text-3xl font-bold text-center mb-16 relative">
          <span className="relative z-10">Cómo Funciona</span>
          <span className="absolute w-24 h-2 bg-red-500 left-1/2 transform -translate-x-1/2 bottom-0"></span>
        </h2>
        
        <div className="flex flex-col space-y-20">
          {/* Step 1 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 flex justify-center animate-on-scroll opacity-0 transform -translate-x-8">
              <div className="bg-red-700 text-white rounded-full h-36 w-36 flex items-center justify-center text-5xl font-bold shadow-lg relative">
                <span>1</span>
                <div className="absolute -inset-3 border-4 border-red-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="md:w-1/2 animate-on-scroll opacity-0 transform translate-x-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Crea tu Encuesta</h3>
              <p className="text-gray-600 text-lg">
                Diseña tu encuesta con preguntas personalizadas y configura los mensajes 
                de bienvenida y despedida. Define el flujo natural de la conversación.
              </p>
              <div className="mt-4 flex">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mr-2">Fácil</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">Rápido</span>
              </div>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2 flex justify-center animate-on-scroll opacity-0 transform translate-x-8">
              <div className="bg-red-700 text-white rounded-full h-36 w-36 flex items-center justify-center text-5xl font-bold shadow-lg relative">
                <span>2</span>
                <div className="absolute -inset-3 border-4 border-red-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="md:w-1/2 animate-on-scroll opacity-0 transform -translate-x-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Comparte tu Encuesta</h3>
              <p className="text-gray-600 text-lg">
                Distribuye tu encuesta mediante un enlace o código QR. Los participantes 
                pueden acceder fácilmente desde cualquier dispositivo con un navegador moderno.
              </p>
              <div className="mt-4 flex">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mr-2">Accesible</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">Multiplataforma</span>
              </div>
            </div>
          </div>
          
          {/* Step 3 */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2 flex justify-center animate-on-scroll opacity-0 transform -translate-x-8">
              <div className="bg-red-700 text-white rounded-full h-36 w-36 flex items-center justify-center text-5xl font-bold shadow-lg relative">
                <span>3</span>
                <div className="absolute -inset-3 border-4 border-red-200 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="md:w-1/2 animate-on-scroll opacity-0 transform translate-x-8">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Analiza los Resultados</h3>
              <p className="text-gray-600 text-lg">
                Visualiza las respuestas mediante gráficos interactivos, análisis de 
                sentimientos y nubes de palabras. Exporta los datos para un análisis más profundo.
              </p>
              <div className="mt-4 flex">
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold mr-2">Insights</span>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">Visualización</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl text-center p-12 my-8 shadow-xl animate-on-scroll opacity-0">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6 text-white">¿Listo para revolucionar tus encuestas?</h2>
          <p className="text-xl text-white/90 mb-8">
            Crea tu primera encuesta por voz en minutos y descubre cómo 
            la interacción conversacional mejora la experiencia de tus encuestados.
          </p>
          {user ? (
            <Link to="/create-survey" className="bg-white text-red-700 font-bold py-4 px-10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-block text-lg">
              Crear Mi Primera Encuesta →
            </Link>
          ) : (
            <Link to="/register" className="bg-white text-red-700 font-bold py-4 px-10 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 inline-block text-lg">
              Crear Cuenta Gratis →
            </Link>
          )}
        </div>
      </div>

      {/* Animación CSS para los elementos */}
      <style jsx>{`
        .animate-on-scroll.animate-active {
          opacity: 1;
          transform: translate(0, 0);
        }
      `}</style>
    </div>
  );
};

export default Home;