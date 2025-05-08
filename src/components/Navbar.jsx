import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Función para cerrar el menú móvil
  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  // Crear un Link personalizado que cierre el menú al hacer clic
  const NavLink = ({ to, children, className }) => {
    return (
      <Link 
        to={to} 
        className={className}
        onClick={closeMenu}
      >
        {children}
      </Link>
    );
  };

  // Manejar el cierre de sesión y cerrar el menú
  const handleLogoutAndClose = async () => {
    closeMenu();
    await handleLogout();
  };

  return (
    <nav className="bg-primary-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo and brand */}
          <NavLink to="/" className="text-xl font-bold flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            Encuestas por Voz
          </NavLink>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink to="/" className="hover:text-primary-200 transition-colors">Inicio</NavLink>
            <NavLink to="/surveys/public" className="hover:text-primary-200 transition-colors">Encuestas Públicas</NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="hover:text-primary-200 transition-colors">Dashboard</NavLink>
                <button 
                  onClick={handleLogout}
                  className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded transition-colors"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hover:text-primary-200 transition-colors">Iniciar Sesión</NavLink>
                <NavLink 
                  to="/register" 
                  className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded transition-colors"
                >
                  Registrarse
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden text-white focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <NavLink to="/" className="block py-2 hover:text-primary-200 transition-colors">Inicio</NavLink>
            <NavLink to="/surveys/public" className="block py-2 hover:text-primary-200 transition-colors">Encuestas Públicas</NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="block py-2 hover:text-primary-200 transition-colors">Dashboard</NavLink>
                <button 
                  onClick={handleLogoutAndClose}
                  className="block w-full text-left py-2 hover:text-primary-200 transition-colors"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="block py-2 hover:text-primary-200 transition-colors">Iniciar Sesión</NavLink>
                <NavLink to="/register" className="block py-2 hover:text-primary-200 transition-colors">Registrarse</NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
