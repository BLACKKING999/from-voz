"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import axios from "axios"
import { auth } from "../utils/firebase"

const ResponseDetail = () => {
  const { responseId } = useParams()
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const user = auth.currentUser

  useEffect(() => {
    const fetchResponseData = async () => {
      if (!responseId || !user) {
        setLoading(false)
        setError("Se requiere autenticación para ver esta respuesta")
        return
      }

      try {
        setLoading(true)
        console.log(`Intentando cargar la respuesta con ID: ${responseId}`)

        // Obtener token de autenticación
        const token = await user.getIdToken()

        // Obtener datos de la respuesta
        const responseData = await axios.get(
          `${process.env.REACT_APP_API_URL || "https://sistema-de-encuestas-por-voz.onrender.com"}/api/responses/${responseId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        console.log("Respuesta cargada:", responseData.data)

        // Verificar que la respuesta tiene la estructura esperada
        if (!responseData.data) {
          throw new Error("La respuesta no contiene datos")
        }

        // Validar que tenemos datos válidos antes de actualizar el estado
        const validResponse = responseData.data
        setResponse(validResponse)

        // Cargar datos de la encuesta asociada
        if (validResponse.surveyId) {
          try {
            const surveyData = await axios.get(
              `${process.env.REACT_APP_API_URL || "https://sistema-de-encuestas-por-voz.onrender.com"}/api/surveys/${validResponse.surveyId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
            )
            console.log("Encuesta cargada:", surveyData.data)

            if (surveyData.data) {
              setSurvey(surveyData.data)
            } else {
              console.warn("La respuesta de la API de encuesta no contiene datos")
            }
          } catch (surveyError) {
            console.error("No se pudo cargar la encuesta asociada:", surveyError)
            // No establecemos error global para que al menos se muestren las respuestas
          }
        } else {
          console.warn("La respuesta no tiene un surveyId asociado")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error al cargar la respuesta:", error)

        if (error.response && error.response.status === 404) {
          setError("Respuesta no encontrada. Puede que haya sido eliminada o no tengas acceso.")
        } else {
          setError("Error al cargar los datos de la respuesta: " + (error.message || "Error desconocido"))
        }

        setLoading(false)
      }
    }

    fetchResponseData()
  }, [responseId, user])

  // Format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric" }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  // Obtener la pregunta correspondiente a un ID
  const getQuestionText = (questionId) => {
    if (!survey || !survey.questions || !Array.isArray(survey.questions)) {
      return "Pregunta no disponible"
    }

    const question = survey.questions.find((q) => q && q._id === questionId)
    return question ? question.text : "Pregunta no disponible"
  }

  // Obtener el tipo de pregunta
  const getQuestionType = (questionId) => {
    if (!survey || !survey.questions || !Array.isArray(survey.questions)) {
      return null
    }

    const question = survey.questions.find((q) => q && q._id === questionId)
    return question ? question.type : null
  }

  // Obtener las opciones de una pregunta
  const getQuestionOptions = (questionId) => {
    if (!survey || !survey.questions || !Array.isArray(survey.questions)) {
      return []
    }

    const question = survey.questions.find((q) => q && q._id === questionId)
    return question && question.options ? question.options : []
  }

  // Renderizar respuesta según el tipo de pregunta
  const renderAnswer = (answer) => {
    if (!answer || !answer.questionId) return null

    const questionType = getQuestionType(answer.questionId)
    const value = answer.value

    switch (questionType) {
      case "rating":
        return (
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`h-6 w-6 ${i < Number.parseInt(value) ? "text-red-600" : "text-gray-300"}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-2 font-bold text-red-700">{value}/5</span>
          </div>
        )

      case "yesno":
        const isYes = value.toLowerCase() === "sí" || value.toLowerCase() === "si" || value.toLowerCase() === "yes"
        return (
          <span
            className={`px-4 py-2 rounded-full ${
              isYes ? "bg-red-600 text-white" : "bg-gray-200 text-gray-800"
            } font-bold shadow-md`}
          >
            {isYes ? (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Sí
              </span>
            ) : (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                No
              </span>
            )}
          </span>
        )

      case "single":
        // eslint-disable-next-line no-unused-vars
        const options = getQuestionOptions(answer.questionId) // Guardado para futuras mejoras de UI
        return <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-bold shadow-sm border border-red-200">{value}</span>

      case "multiple":
        try {
          // Intentar parsear como array si viene como string
          const values =
            typeof value === "string"
              ? value.startsWith("[")
                ? JSON.parse(value)
                : [value]
              : Array.isArray(value)
                ? value
                : [value]

          return (
            <div className="flex flex-wrap gap-2">
              {values.map((val, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm font-medium border border-red-200 shadow-sm">
                  {val}
                </span>
              ))}
            </div>
          )
        } catch (e) {
          console.error("Error parsing multiple choice value:", e)
          // Si falla el parsing, mostrar como texto normal
          return <div className="bg-white p-4 rounded-md shadow-inner border border-red-100">"{value || "Sin respuesta"}"</div>
        }

      case "open":
      default:
        return <div className="bg-white p-4 rounded-md shadow-inner border border-red-100 font-medium">"{value || "Sin respuesta"}"</div>
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-white to-red-50 min-h-screen flex items-center justify-center">
        <div className="p-8 rounded-lg shadow-lg bg-white border-t-4 border-red-600">
          <svg
            className="animate-spin h-16 w-16 text-red-600 mx-auto mb-4"
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
          <h2 className="text-2xl font-bold text-red-800">Cargando respuesta...</h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-white to-red-50 min-h-screen flex items-center justify-center">
        <div className="p-8 rounded-lg shadow-lg bg-white border-t-4 border-red-600 max-w-md w-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 text-red-600 mx-auto mb-6"
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
          <h2 className="text-2xl font-bold text-red-800 mb-3">{error || "Error"}</h2>
          <p className="text-gray-700 mb-6">No se pudo cargar la información de la respuesta.</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="px-6 py-3 bg-red-600 text-white rounded-md font-bold shadow-md hover:bg-red-700 transition duration-200 transform hover:scale-105"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-white to-red-50 min-h-screen flex items-center justify-center">
        <div className="p-8 rounded-lg shadow-lg bg-white border-t-4 border-red-600 max-w-md w-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-20 w-20 text-red-600 mx-auto mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h2 className="text-2xl font-bold text-red-800 mb-3">Respuesta no encontrada</h2>
          <p className="text-gray-700 mb-6">La respuesta que estás buscando no existe o ha sido eliminada.</p>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="px-6 py-3 bg-red-600 text-white rounded-md font-bold shadow-md hover:bg-red-700 transition duration-200 transform hover:scale-105"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-red-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start mb-8 bg-white p-6 rounded-lg shadow-md border-t-4 border-red-600">
          <div>
            <h1 className="text-3xl font-bold text-red-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Detalles de la Respuesta
            </h1>
            {survey && (
              <p className="text-gray-700 mt-2 ml-11">
                Encuesta:{" "}
                <Link to={`/surveys/${survey._id}`} className="text-red-600 hover:underline font-medium">
                  {survey.title}
                </Link>
              </p>
            )}
          </div>
          <button 
            onClick={() => navigate("/dashboard")} 
            className="mt-4 md:mt-0 px-5 py-2 bg-white text-red-700 border-2 border-red-600 rounded-md font-bold shadow-sm hover:bg-red-50 transition duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-lg mb-6 overflow-hidden border border-red-100">
          <div className="bg-red-600 text-white px-6 py-4 text-lg font-bold">
            Información de la respuesta
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm transform hover:shadow-md transition duration-200 hover:-translate-y-1">
                <div className="text-sm text-red-600 font-medium mb-1">Respondiente</div>
                <div className="font-bold text-gray-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {response.respondentName || "Anónimo"}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm transform hover:shadow-md transition duration-200 hover:-translate-y-1">
                <div className="text-sm text-red-600 font-medium mb-1">Fecha de Respuesta</div>
                <div className="font-bold text-gray-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(response.createdAt)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-red-200 shadow-sm transform hover:shadow-md transition duration-200 hover:-translate-y-1">
                <div className="text-sm text-red-600 font-medium mb-1">Estado</div>
                <div className="font-bold text-gray-800">
                  {response.completed ? (
                    <span className="text-green-600 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Completada
                    </span>
                  ) : (
                    <span className="text-yellow-600 flex items-center">
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
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Incompleta
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-red-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-lg font-bold text-red-700 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  RESPUESTAS
                </span>
              </div>
            </div>

            {response && response.answers && Array.isArray(response.answers) && response.answers.length > 0 ? (
              <div className="space-y-6">
                {response.answers.map((answer, index) => {
                  // Validar que la respuesta tiene la estructura esperada
                  if (!answer || !answer.questionId) {
                    return (
                      <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-300">
                        <div className="text-sm text-red-500">Respuesta {index + 1} (datos incompletos)</div>
                      </div>
                    )
                  }

                  const questionType = getQuestionType(answer.questionId)

                  return (
                    <div key={index} className="bg-white rounded-xl overflow-hidden shadow-md border border-red-200 transform hover:shadow-lg transition duration-300">
                      <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 border-b">
                        <div className="flex justify-between items-center">
                          <div className="text-white">
                            <div className="text-xs font-medium opacity-80">Pregunta {index + 1}</div>
                            <div className="font-bold text-lg">{getQuestionText(answer.questionId)}</div>
                          </div>
                          {questionType && (
                            <div className="px-3 py-1.5 bg-white text-red-700 rounded-full text-xs font-bold shadow-sm">
                              {questionType === "open" && "Respuesta abierta"}
                              {questionType === "single" && "Opción única"}
                              {questionType === "multiple" && "Opción múltiple"}
                              {questionType === "rating" && "Valoración"}
                              {questionType === "yesno" && "Sí/No"}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start">
                          <div className="text-sm text-red-600 font-medium mr-3 mt-1">Respuesta:</div>
                          <div className="flex-1">{renderAnswer(answer)}</div>
                        </div>

                        {answer.audioUrl && (
                          <div className="mt-6 pt-4 border-t border-red-100">
                            <div className="text-sm text-red-600 font-medium mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                              </svg>
                              Respuesta de audio:
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-red-100">
                              <audio controls src={answer.audioUrl} className="w-full">
                                Tu navegador no soporta el elemento de audio.
                              </audio>
                            </div>
                          </div>
                        )}

                        {answer.timestamp && (
                          <div className="mt-4 text-xs text-gray-500 flex items-center justify-end">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Respondido el {formatDate(answer.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white rounded-lg border border-red-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-700">No hay respuestas disponibles</p>
                {response && JSON.stringify(response) === "{}" && (
                  <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto">
                    La respuesta no contiene datos. Esto puede deberse a un problema en la conexión con el servidor.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResponseDetail