import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../utils/firebase';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const user = auth.currentUser;

  // Efecto para detectar el scroll y animar el navbar
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

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

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const NavLink = ({ to, children, className }) => {
    return (
      <Link 
        to={to} 
        className={`${className} relative group`}
        onClick={closeMenu}
      >
        <span className="relative z-10">{children}</span>
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transform transition-all duration-300 group-hover:w-full"></span>
      </Link>
    );
  };

  const handleLogoutAndClose = async () => {
    closeMenu();
    await handleLogout();
  };

  return (
    <nav className={`bg-red-700 text-white shadow-lg transition-all duration-300 ${scrolled ? 'py-2' : 'py-4'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and brand */}
          <NavLink to="/" className="text-2xl font-extrabold flex items-center">
            <div className="mr-3 bg-white text-red-700 p-1 rounded-full shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <span className="tracking-wider">ENCUESTAS<span className="text-red-300">VOZ</span></span>
          </NavLink>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-6">
            <NavLink to="/" className="hover:text-red-200 transition-colors font-semibold">Inicio</NavLink>
            <NavLink to="/surveys/public" className="hover:text-red-200 transition-colors font-semibold">Encuestas Públicas</NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="hover:text-red-200 transition-colors font-semibold">Dashboard</NavLink>
                <button 
                  onClick={handleLogout}
                  className="bg-white text-red-700 hover:bg-red-100 px-5 py-2 rounded-lg font-bold transform transition-transform duration-200 hover:scale-105 shadow-md"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="hover:text-red-200 transition-colors font-semibold">Iniciar Sesión</NavLink>
                <NavLink 
                  to="/register" 
                  className="bg-white text-red-700 hover:bg-red-100 px-5 py-2 rounded-lg font-bold transform transition-transform duration-200 hover:scale-105 shadow-md"
                >
                  Registrarse
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden text-white focus:outline-none bg-red-800 p-2 rounded-md"
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
          <div className="md:hidden pb-4 space-y-3 mt-4 border-t border-red-600 pt-3">
            <NavLink to="/" className="block py-2 hover:bg-red-800 hover:pl-2 rounded transition-all duration-200 font-semibold">
              Inicio
            </NavLink>
            <NavLink to="/surveys/public" className="block py-2 hover:bg-red-800 hover:pl-2 rounded transition-all duration-200 font-semibold">
              Encuestas Públicas
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className="block py-2 hover:bg-red-800 hover:pl-2 rounded transition-all duration-200 font-semibold">
                  Dashboard
                </NavLink>
                <button 
                  onClick={handleLogoutAndClose}
                  className="block w-full text-left py-2 px-3 bg-white text-red-700 rounded-lg font-bold mt-2"
                >
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="block py-2 hover:bg-red-800 hover:pl-2 rounded transition-all duration-200 font-semibold">
                  Iniciar Sesión
                </NavLink>
                <NavLink to="/register" className="block w-full py-2 px-3 bg-white text-red-700 rounded-lg font-bold mt-2 text-center">
                  Registrarse
                </NavLink>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;