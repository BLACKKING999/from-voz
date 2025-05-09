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
                className={`h-5 w-5 ${i < Number.parseInt(value) ? "text-yellow-400" : "text-gray-300"}`}
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
              </svg>
            ))}
            <span className="ml-2 font-medium">{value}/5</span>
          </div>
        )

      case "yesno":
        const isYes = value.toLowerCase() === "sí" || value.toLowerCase() === "si" || value.toLowerCase() === "yes"
        return (
          <span
            className={`px-3 py-1.5 rounded-full ${isYes ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"} font-medium`}
          >
            {isYes ? (
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
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
                  className="h-4 w-4 mr-1"
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
        return <span className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full font-medium">{value}</span>

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
                <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                  {val}
                </span>
              ))}
            </div>
          )
        } catch (e) {
          console.error("Error parsing multiple choice value:", e)
          // Si falla el parsing, mostrar como texto normal
          return <div className="bg-gray-50 p-3 rounded">"{value || "Sin respuesta"}"</div>
        }

      case "open":
      default:
        return <div className="bg-gray-50 p-3 rounded border border-gray-200">"{value || "Sin respuesta"}"</div>
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <svg
          className="animate-spin h-10 w-10 text-primary-500 mx-auto"
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
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-red-500 mx-auto mb-4"
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">{error || "Error"}</h2>
        <p className="text-gray-600 mb-4">No se pudo cargar la información de la respuesta.</p>
        <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
          Volver al Dashboard
        </button>
      </div>
    )
  }

  if (!response) {
    return (
      <div className="text-center py-8">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-gray-400 mx-auto mb-4"
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Respuesta no encontrada</h2>
        <p className="text-gray-600 mb-4">La respuesta que estás buscando no existe o ha sido eliminada.</p>
        <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
          Volver al Dashboard
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Detalles de la Respuesta</h1>
          {survey && (
            <p className="text-gray-600">
              Encuesta:{" "}
              <Link to={`/surveys/${survey._id}`} className="text-primary-600 hover:underline">
                {survey.title}
              </Link>
            </p>
          )}
        </div>
        <button onClick={() => navigate("/dashboard")} className="btn btn-outline mt-4 md:mt-0">
          Volver al Dashboard
        </button>
      </div>

      <div className="card mb-6">
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Respondiente</div>
              <div className="font-medium">{response.respondentName || "Anónimo"}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Fecha de Respuesta</div>
              <div className="font-medium">{formatDate(response.createdAt)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Estado</div>
              <div className="font-medium">
                {response.completed ? (
                  <span className="text-green-600 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
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
                      className="h-4 w-4 mr-1"
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

          <h2 className="text-xl font-semibold mb-4">Respuestas</h2>

          {response && response.answers && Array.isArray(response.answers) && response.answers.length > 0 ? (
            <div className="space-y-4">
              {response.answers.map((answer, index) => {
                // Validar que la respuesta tiene la estructura esperada
                if (!answer || !answer.questionId) {
                  return (
                    <div key={index} className="border rounded-lg p-4 bg-red-50">
                      <div className="text-sm text-red-500">Respuesta {index + 1} (datos incompletos)</div>
                    </div>
                  )
                }

                const questionType = getQuestionType(answer.questionId)

                return (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-gray-500">Pregunta {index + 1}</div>
                          <div className="font-medium">{getQuestionText(answer.questionId)}</div>
                        </div>
                        {questionType && (
                          <div className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                            {questionType === "open" && "Respuesta abierta"}
                            {questionType === "single" && "Opción única"}
                            {questionType === "multiple" && "Opción múltiple"}
                            {questionType === "rating" && "Valoración"}
                            {questionType === "yesno" && "Sí/No"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start">
                        <div className="text-sm text-gray-500 mr-2 mt-1">Respuesta:</div>
                        <div className="flex-1">{renderAnswer(answer)}</div>
                      </div>

                      {answer.audioUrl && (
                        <div className="mt-4 border-t pt-3">
                          <div className="text-sm text-gray-500 mb-2">Respuesta de audio:</div>
                          <audio controls src={answer.audioUrl} className="w-full">
                            Tu navegador no soporta el elemento de audio.
                          </audio>
                        </div>
                      )}

                      {answer.timestamp && (
                        <div className="mt-3 text-xs text-gray-500">Respondido el {formatDate(answer.timestamp)}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No hay respuestas disponibles</p>
              {response && JSON.stringify(response) === "{}" && (
                <p className="text-gray-500 mt-2 text-sm">
                  La respuesta no contiene datos. Esto puede deberse a un problema en la conexión con el servidor.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResponseDetail
