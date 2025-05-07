import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../utils/firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error logging in:', err);
      setError(
        err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password'
          ? 'Credenciales incorrectas. Por favor verifica tu email y contraseña.'
          : 'Ha ocurrido un error al iniciar sesión. Por favor intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error signing in with Google:', err);
      setError('Ha ocurrido un error al iniciar sesión con Google. Por favor intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="card">
        <h1 className="text-2xl font-bold text-center mb-6">Iniciar Sesión</h1>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-700 font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-gray-700 font-medium mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="********"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-800">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">O continúa con</span>
          </div>
        </div>
        
        <button 
          onClick={handleGoogleSignIn}
          className="mt-4 w-full flex items-center justify-center space-x-2 btn btn-outline"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 14.9999 9.99984 14.9999C7.23859 14.9999 4.99984 12.7612 4.99984 9.99996C4.99984 7.23871 7.23859 4.99996 9.99984 4.99996C11.2744 4.99996 12.4344 5.48913 13.317 6.28913L15.6748 3.93121C14.1886 2.52288 12.2036 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 9.99996C1.6665 14.602 5.39775 18.3333 9.99984 18.3333C14.602 18.3333 18.3332 14.602 18.3332 9.99996C18.3332 9.44121 18.2757 8.89579 18.1711 8.36788Z" fill="#FFC107"/>
            <path d="M2.62744 6.12121L5.36536 8.12913C6.10411 6.29538 7.90036 4.99996 9.99994 4.99996C11.2744 4.99996 12.4344 5.48913 13.3169 6.28913L15.6748 3.93121C14.1886 2.52288 12.2036 1.66663 9.99994 1.66663C6.74869 1.66663 3.92494 3.47371 2.62744 6.12121Z" fill="#FF3D00"/>
            <path d="M9.9999 18.3334C12.1624 18.3334 14.1124 17.5084 15.5849 16.1459L13.0024 13.9875C12.1424 14.6459 11.1099 15 9.9999 15C7.83824 15 5.9999 13.6209 5.30574 11.6917L2.58325 13.7834C3.86658 16.4834 6.7149 18.3334 9.9999 18.3334Z" fill="#4CAF50"/>
            <path d="M18.1712 8.36788H17.4999V8.33329H9.99992V11.6666H14.7095C14.3845 12.5916 13.7887 13.3908 13.0016 13.9875L13.0033 13.9866L15.5858 16.145C15.4112 16.305 18.3333 14.1666 18.3333 9.99996C18.3333 9.44121 18.2758 8.89579 18.1712 8.36788Z" fill="#1976D2"/>
          </svg>
          <span>Google</span>
        </button>
        
        <div className="mt-6 text-center">
          <span className="text-gray-600">¿No tienes una cuenta?</span>{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-800 font-medium">
            Regístrate
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
