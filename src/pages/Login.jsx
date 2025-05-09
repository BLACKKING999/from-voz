"use client"

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "../utils/firebase"

const Login = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate("/dashboard")
    } catch (err) {
      console.error("Error logging in:", err)
      setError(
        err.code === "auth/user-not-found" || err.code === "auth/wrong-password"
          ? "Credenciales incorrectas. Por favor verifica tu email y contraseña."
          : "Ha ocurrido un error al iniciar sesión. Por favor intenta nuevamente.",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError("")
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      navigate("/dashboard")
    } catch (err) {
      console.error("Error signing in with Google:", err)
      setError("Ha ocurrido un error al iniciar sesión con Google. Por favor intenta nuevamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto relative">
      {/* Elementos decorativos */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>

      <div className="card bg-white rounded-lg shadow-xl border border-red-100 p-8 relative overflow-hidden">
        {/* Barra decorativa superior */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

        <div className="w-16 h-16 rounded-full bg-red-900 flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-center mb-6 text-red-900 relative inline-block w-full">
          Iniciar Sesión
          <span className="absolute left-1/4 right-1/4 bottom-0 w-1/2 h-0.5 bg-red-500 mx-auto"></span>
        </h1>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-4 rounded mb-4 shadow-inner">
            <div className="flex">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="group">
            <label
              htmlFor="email"
              className="block text-red-900 font-medium mb-1 group-hover:text-red-700 transition-colors"
            >
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                placeholder="correo@ejemplo.com"
                required
              />
            </div>
          </div>

          <div className="group">
            <label
              htmlFor="password"
              className="block text-red-900 font-medium mb-1 group-hover:text-red-700 transition-colors"
            >
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full px-4 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                placeholder="********"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-red-600 hover:text-red-800 hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-red-700 to-red-900 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:from-red-800 hover:to-red-950 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transform hover:translate-y-[-2px] transition-all disabled:opacity-70"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-red-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-red-600">O continúa con</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="mt-4 w-full flex items-center justify-center space-x-2 py-2 px-4 border border-red-300 rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors shadow-sm disabled:opacity-70"
          disabled={loading}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18.1711 8.36788H17.4998V8.33329H9.99984V11.6666H14.7094C14.0223 13.607 12.1761 14.9999 9.99984 14.9999C7.23859 14.9999 4.99984 12.7612 4.99984 9.99996C4.99984 7.23871 7.23859 4.99996 9.99984 4.99996C11.2744 4.99996 12.4344 5.48913 13.317 6.28913L15.6748 3.93121C14.1886 2.52288 12.2036 1.66663 9.99984 1.66663C5.39775 1.66663 1.6665 5.39788 1.6665 9.99996C1.6665 14.602 5.39775 18.3333 9.99984 18.3333C14.602 18.3333 18.3332 14.602 18.3332 9.99996C18.3332 9.44121 18.2757 8.89579 18.1711 8.36788Z"
              fill="#FFC107"
            />
            <path
              d="M2.62744 6.12121L5.36536 8.12913C6.10411 6.29538 7.90036 4.99996 9.99994 4.99996C11.2744 4.99996 12.4344 5.48913 13.3169 6.28913L15.6748 3.93121C14.1886 2.52288 12.2036 1.66663 9.99994 1.66663C6.74869 1.66663 3.92494 3.47371 2.62744 6.12121Z"
              fill="#FF3D00"
            />
            <path
              d="M9.9999 18.3334C12.1624 18.3334 14.1124 17.5084 15.5849 16.1459L13.0024 13.9875C12.1424 14.6459 11.1099 15 9.9999 15C7.83824 15 5.9999 13.6209 5.30574 11.6917L2.58325 13.7834C3.86658 16.4834 6.7149 18.3334 9.9999 18.3334Z"
              fill="#4CAF50"
            />
            <path
              d="M18.1712 8.36788H17.4999V8.33329H9.99992V11.6666H14.7095C14.3845 12.5916 13.7887 13.3908 13.0016 13.9875L13.0033 13.9866L15.5858 16.145C15.4112 16.305 18.3333 14.1666 18.3333 9.99996C18.3333 9.44121 18.2758 8.89579 18.1712 8.36788Z"
              fill="#1976D2"
            />
          </svg>
          <span>Google</span>
        </button>

        <div className="mt-6 text-center">
          <span className="text-gray-600">¿No tienes una cuenta?</span>{" "}
          <Link
            to="/register"
            className="text-red-600 hover:text-red-800 font-medium hover:underline transition-colors"
          >
            Regístrate
          </Link>
        </div>

        {/* Decoración inferior */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
      </div>
    </div>
  )
}

export default Login
