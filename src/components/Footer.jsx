import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-red-900 text-white py-12 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Logo and description */}
          <div className="transform hover:translate-y-[-5px] transition-transform duration-300">
            <Link to="/" className="text-2xl font-bold flex items-center">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <span>ENCUESTAS<span className="text-red-300">VOZ</span></span>
            </Link>
            <p className="mt-4 text-gray-300 border-l-2 border-red-500 pl-4">
              Sistema de encuestas por voz interactivo. Crea encuestas que hablan con tus usuarios y analiza sus respuestas de manera innovadora.
            </p>
            <div className="mt-6 bg-red-800 rounded-lg p-4 shadow-inner">
              <span className="text-sm font-medium text-white">¡Contáctanos para una demostración!</span>
            </div>
          </div>
          
          {/* Quick links */}
          <div>
            <h3 className="text-xl font-bold mb-6 relative inline-block">
              Enlaces Rápidos
              <span className="absolute left-0 bottom-0 w-full h-0.5 bg-red-500"></span>
            </h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Inicio
                </Link>
              </li>
              <li>
                <Link to="/surveys/public" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Encuestas Públicas
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Iniciar Sesión
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Registrarse
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-gray-300 hover:text-white transition-colors flex items-center group">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-400 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Ayuda y Soporte
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact info */}
          <div>
            <h3 className="text-xl font-bold mb-6 relative inline-block">
              Síguenos
              <span className="absolute left-0 bottom-0 w-full h-0.5 bg-red-500"></span>
            </h3>
            <p className="text-gray-300 mb-6">
              ¿Tienes preguntas o sugerencias? Contáctanos a través de nuestro correo electrónico o síguenos en redes sociales.
            </p>
            <div className="flex mt-4 space-x-4">
              <a href="#" aria-label="Facebook" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-700 hover:bg-red-100 transition-colors hover:scale-110 transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
              </a>
              <a href="#" aria-label="Twitter" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-700 hover:bg-red-100 transition-colors hover:scale-110 transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6.066 9.645c.183 4.04-2.83 8.544-8.164 8.544-1.622 0-3.131-.476-4.402-1.291 1.524.18 3.045-.244 4.252-1.189-1.256-.023-2.317-.854-2.684-1.995.451.086.895.061 1.298-.049-1.381-.278-2.335-1.522-2.304-2.853.388.215.83.344 1.301.359-1.279-.855-1.641-2.544-.889-3.835 1.416 1.738 3.533 2.881 5.92 3.001-.419-1.796.944-3.527 2.799-3.527.825 0 1.572.349 2.096.907.654-.128 1.27-.368 1.824-.697-.215.671-.67 1.233-1.263 1.589.581-.07 1.135-.224 1.649-.453-.384.578-.87 1.084-1.433 1.489z" />
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-700 hover:bg-red-100 transition-colors hover:scale-110 transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 16h-2v-6h2v6zm-1-6.891c-.607 0-1.1-.496-1.1-1.109 0-.612.492-1.109 1.1-1.109s1.1.497 1.1 1.109c0 .613-.493 1.109-1.1 1.109zm8 6.891h-1.998v-2.861c0-1.881-2.002-1.722-2.002 0v2.861h-2v-6h2v1.093c.872-1.616 4-1.736 4 1.548v3.359z" />
                </svg>
              </a>
              <a href="#" aria-label="Instagram" className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-red-700 hover:bg-red-100 transition-colors hover:scale-110 transform duration-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-red-800 to-red-900 rounded-lg shadow-inner">
              <h4 className="text-lg font-semibold mb-2">Boletín Informativo</h4>
              <form className="flex">
                <input 
                  type="email" 
                  placeholder="Tu correo electrónico" 
                  className="flex-grow px-4 py-2 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-800"
                />
                <button 
                  type="submit" 
                  className="bg-white text-red-700 font-bold px-4 py-2 rounded-r-lg hover:bg-red-100 transition-colors"
                >
                  Suscribir
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-red-800 text-center text-gray-300">
          <p>© {currentYear} <span className="font-bold">ENCUESTAS<span className="text-red-300">VOZ</span></span>. Todos los derechos reservados.</p>
          <div className="flex justify-center mt-4 space-x-4 text-sm">
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Política de Privacidad</Link>
            <span className="text-red-700">|</span>
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Términos de Uso</Link>
            <span className="text-red-700">|</span>
            <Link to="/cookies" className="text-gray-400 hover:text-white transition-colors">Política de Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;