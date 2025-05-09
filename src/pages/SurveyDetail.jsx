"use client"

import { useState, useEffect } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import { Bar, Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from "chart.js"
import { auth } from "../utils/firebase"
import { SurveyService, ResponseService } from "../services/apiService"

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

// Función auxiliar para normalizar texto (quitar acentos, convertir a minúsculas, eliminar puntuación)
const normalizeText = (text) => {
  if (!text) return ""

  // Convertir a string si no lo es
  const str = String(text)

  // Convertir a minúsculas
  let normalized = str.toLowerCase()

  // Eliminar acentos
  normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

  // Eliminar signos de puntuación y espacios extras
  normalized = normalized.replace(/[.,;:!?¡¿]/g, "").trim()

  // Eliminar espacios múltiples
  normalized = normalized.replace(/\s+/g, " ")

  return normalized
}

// Palabras afirmativas comunes en español
const affirmativeWords = new Set([
  "si",
  "claro",
  "por supuesto",
  "afirmativo",
  "efectivamente",
  "exacto",
  "correcto",
  "ok",
  "vale",
  "bueno",
  "cierto",
  "verdad",
  "desde luego",
  "asi es",
  "sin duda",
  "obviamente",
  "naturalmente",
])

// Palabras negativas comunes en español
const negativeWords = new Set([
  "no",
  "nunca",
  "jamas",
  "negativo",
  "para nada",
  "en absoluto",
  "de ninguna manera",
  "nada",
  "tampoco",
  "ni hablar",
  "que va",
  "de ningun modo",
])

const SurveyDetail = () => {
  const { surveyId } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState(null)
  const [responses, setResponses] = useState([])
  // eslint-disable-next-line no-unused-vars
  const [analysis, setAnalysis] = useState(null) // Guardado para futuras implementaciones
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState("results")
  // eslint-disable-next-line no-unused-vars
  const user = auth.currentUser // Guardado para verificaciones de permisos futuras

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) return

      try {
        setLoading(true)
        setError(null)

        // Usar el servicio centralizado para obtener la encuesta
        const data = await SurveyService.getSurvey(surveyId)

        console.log("Encuesta cargada:", data)

        if (data) {
          setSurvey(data)

          // Verificar si hay respuestas directamente en el objeto
          if (data.responses && Array.isArray(data.responses)) {
            console.log("Respuestas encontradas en data.responses:", data.responses.length)
            setResponses(data.responses)
          } else {
            // Si no hay respuestas en data.responses, intentar cargarlas independientemente
            try {
              // Obtener respuestas usando el servicio centralizado
              try {
                const responseData = await ResponseService.getSurveyResponses(surveyId)
                console.log("Datos completos del API:", responseData)

                // Verificar el formato de la respuesta del API
                if (responseData && typeof responseData === "object") {
                  // Si la respuesta es un objeto con la estructura {responses, analysis, survey}
                  if (responseData.responses && Array.isArray(responseData.responses)) {
                    console.log(`Se encontraron ${responseData.responses.length} respuestas en responseData.responses`)
                    setResponses(responseData.responses)

                    // Guardamos el análisis si está disponible
                    if (responseData.analysis) {
                      console.log("Análisis disponible:", responseData.analysis)
                      setAnalysis(responseData.analysis)
                    }

                    // Si hay una propiedad survey, podríamos usar esa información también
                    if (responseData.survey && Object.keys(responseData.survey).length > 0) {
                      console.log("Usando datos de survey desde la respuesta")
                      setSurvey(responseData.survey)
                    }
                  }
                  // Si es algún otro tipo de objeto, verificar si tiene un array de items o data
                  else if (responseData.items && Array.isArray(responseData.items)) {
                    console.log(`Se encontraron ${responseData.items.length} respuestas en responseData.items`)
                    setResponses(responseData.items)
                  } else if (responseData.data && Array.isArray(responseData.data)) {
                    console.log(`Se encontraron ${responseData.data.length} respuestas en responseData.data`)
                    setResponses(responseData.data)
                  }
                  // Si el objeto mismo es un array (aunque eso sería raro en este formato)
                  else if (Array.isArray(responseData)) {
                    console.log(`Se encontraron ${responseData.length} respuestas (formato array directo)`)
                    setResponses(responseData)
                  }
                  // Si es algún otro tipo de objeto que no podemos procesar
                  else {
                    console.warn("Formato de respuesta inesperado", responseData)
                    setResponses([])
                  }
                } else if (Array.isArray(responseData)) {
                  // Si directamente es un array
                  console.log(`Se encontraron ${responseData.length} respuestas (formato array)`)
                  setResponses(responseData)
                } else {
                  console.warn("No se pudieron cargar las respuestas o formato inesperado", responseData)
                  setResponses([])
                }
              } catch (responseError) {
                console.error("Error al cargar respuestas:", responseError)
                setResponses([])
              }

              setLoading(false)
            } catch (error) {
              console.error("Error al cargar respuestas:", error)
              setResponses([])
            }
          }
        } else {
          setError("No se pudo cargar la encuesta")
        }

        setLoading(false)
      } catch (error) {
        console.error("Error al cargar la encuesta:", error)
        setError("Error al cargar la encuesta: " + (error.message || "Error desconocido"))
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [surveyId])

  // Format date in a readable format
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    return new Date(dateString).toLocaleDateString("es-ES", options)
  }

  // Prepare chart data for ratings
  const prepareRatingChartData = (questionResponses) => {
    if (!questionResponses || questionResponses.length === 0) {
      // Datos por defecto si no hay respuestas
      return {
        labels: ["1 ", "2 ", "3 ", "4 ", "5 "],
        datasets: [
          {
            label: "Número de Respuestas",
            data: [0, 0, 0, 0, 0],
            backgroundColor: [
              "rgba(255, 99, 132, 0.6)",
              "rgba(255, 159, 64, 0.6)",
              "rgba(255, 205, 86, 0.6)",
              "rgba(75, 192, 192, 0.6)",
              "rgba(54, 162, 235, 0.6)",
            ],
          },
        ],
      }
    }

    // Contar respuestas para cada valor
    const counts = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    }

    questionResponses.forEach((response) => {
      const value = response.value
      if (value >= 1 && value <= 5) {
        counts[value.toString()] = (counts[value.toString()] || 0) + 1
      }
    })

    return {
      labels: ["1 ", "2 ", "3 ", "4 ", "5 "],
      datasets: [
        {
          label: "Número de Respuestas",
          data: [counts["1"], counts["2"], counts["3"], counts["4"], counts["5"]],
          backgroundColor: [
            "rgba(255, 99, 132, 0.6)",
            "rgba(255, 159, 64, 0.6)",
            "rgba(255, 205, 86, 0.6)",
            "rgba(75, 192, 192, 0.6)",
            "rgba(54, 162, 235, 0.6)",
          ],
        },
      ],
    }
  }

  // Prepare detailed data for rating questions
  const prepareRatingDetailData = (questionResponses) => {
    if (!questionResponses || questionResponses.length === 0) {
      // Datos por defecto si no hay respuestas
      return [
        { rating: 1, count: 0, percentage: 0 },
        { rating: 2, count: 0, percentage: 0 },
        { rating: 3, count: 0, percentage: 0 },
        { rating: 4, count: 0, percentage: 0 },
        { rating: 5, count: 0, percentage: 0 },
      ]
    }

    // Contar respuestas para cada valor
    const counts = {
      "1": 0,
      "2": 0,
      "3": 0,
      "4": 0,
      "5": 0,
    }

    // Calcular la suma total y el promedio
    let sum = 0
    let validCount = 0

    questionResponses.forEach((response) => {
      const value = Number.parseInt(response.value)
      if (!isNaN(value) && value >= 1 && value <= 5) {
        counts[value.toString()]++
        sum += value
        validCount++
      }
    })

    // Calcular el promedio
    const average = validCount > 0 ? (sum / validCount).toFixed(1) : 0

    // Convertir a formato para mostrar en la tabla
    const result = Object.entries(counts).map(([rating, count]) => ({
      rating: Number.parseInt(rating),
      count,
      percentage: questionResponses.length > 0 ? Math.round((count / questionResponses.length) * 100) : 0,
    }))

    // Ordenar por rating (de 5 a 1)
    result.sort((a, b) => b.rating - a.rating)

    // Añadir el promedio como propiedad adicional
    result.average = average

    return result
  }

  // Prepare chart data for yes/no questions
  const prepareYesNoChartData = (questionResponses) => {
    if (!questionResponses || questionResponses.length === 0) {
      // Datos por defecto si no hay respuestas
      return {
        labels: ["Sí", "No"],
        datasets: [
          {
            data: [0, 0],
            backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
          },
        ],
      }
    }

    // Contar respuestas para Sí y No
    let yesCount = 0
    let noCount = 0

    questionResponses.forEach((response) => {
      const normalizedValue = normalizeText(response.value)

      // Verificar si contiene palabras afirmativas
      let isYes = false
      let isNo = false

      // Verificar palabras afirmativas
      for (const word of affirmativeWords) {
        if (normalizedValue.includes(word)) {
          isYes = true
          break
        }
      }

      // Verificar palabras negativas
      if (!isYes) {
        for (const word of negativeWords) {
          if (normalizedValue.includes(word)) {
            isNo = true
            break
          }
        }
      }

      // Si es una respuesta simple "si" o "no"
      if (normalizedValue === "si") isYes = true
      if (normalizedValue === "no") isNo = true

      if (isYes) yesCount++
      else if (isNo) noCount++
    })

    return {
      labels: ["Sí", "No"],
      datasets: [
        {
          data: [yesCount, noCount],
          backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"],
        },
      ],
    }
  }

  // Prepare data for multiple choice questions
  const prepareMultipleChoiceData = (question, questionResponses) => {
    if (!question.options || !Array.isArray(question.options) || !questionResponses || questionResponses.length === 0) {
      return []
    }

    // Crear un objeto para contar las respuestas por opción
    const optionCounts = {}

    // Normalizar las opciones y crear un mapa para buscar coincidencias
    const normalizedOptionsMap = new Map()

    question.options.forEach((option) => {
      optionCounts[option] = 0
      normalizedOptionsMap.set(normalizeText(option), option)
    })

    // Palabras clave para identificar selecciones
    const selectionKeywords = new Set(["seleccion", "selecciones", "seleccionado", "elegido", "escogido", "marcado"])

    // Contar las respuestas para cada opción
    questionResponses.forEach((response) => {
      try {
        let values = []

        // Intentar parsear el valor como JSON si es un string
        if (typeof response.value === "string") {
          const normalizedValue = normalizeText(response.value)

          // Verificar si es una selección explícita (ej: "Selecciones: NO")
          let hasExplicitSelection = false

          for (const keyword of selectionKeywords) {
            if (normalizedValue.includes(keyword)) {
              // Extraer la parte después de "selecciones:" o similar
              const parts = normalizedValue.split(/[:\s]+/)
              for (let i = 0; i < parts.length; i++) {
                if (selectionKeywords.has(parts[i]) && i + 1 < parts.length) {
                  // La siguiente parte debería ser la opción
                  const selectedOption = parts[i + 1]
                  values.push(selectedOption)
                  hasExplicitSelection = true
                  break
                }
              }

              if (!hasExplicitSelection && parts.length > 1) {
                // Si no encontramos un patrón claro, tomar la última parte
                values.push(parts[parts.length - 1])
                hasExplicitSelection = true
              }

              break
            }
          }

          // Si no es una selección explícita, procesar normalmente
          if (!hasExplicitSelection) {
            // Verificar si es un valor simple (no JSON)
            if (!response.value.startsWith("[")) {
              // Es un valor simple, no un array
              values = [response.value.trim()]
            } else {
              // Intentar parsear como JSON
              try {
                values = JSON.parse(response.value)
                // Asegurarse de que sea un array
                if (!Array.isArray(values)) {
                  values = [values.toString()]
                }
              } catch (e) {
                console.error("Error al parsear JSON:", e)
                values = [response.value]
              }
            }
          }
        } else if (Array.isArray(response.value)) {
          // Ya es un array
          values = response.value
        } else if (response.value) {
          // Cualquier otro valor no nulo
          values = [response.value.toString()]
        }

        // Normalizar todos los valores para comparación
        const normalizedValues = values.map((v) => normalizeText(v))

        // Incrementar el contador para cada opción seleccionada
        normalizedOptionsMap.forEach((originalOption, normalizedOption) => {
          // Verificar coincidencia exacta
          if (normalizedValues.includes(normalizedOption)) {
            optionCounts[originalOption]++
            return
          }

          // Verificar coincidencia parcial (si la opción está contenida en alguna respuesta)
          for (const value of normalizedValues) {
            if (value.includes(normalizedOption) || normalizedOption.includes(value)) {
              optionCounts[originalOption]++
              return
            }
          }
        })

        // Registrar para depuración
        console.log(
          `Respuesta procesada: ${JSON.stringify(values)}, Valores normalizados: ${JSON.stringify(normalizedValues)}`,
        )
      } catch (error) {
        console.error("Error procesando respuesta múltiple:", error, "Valor:", response.value)
      }
    })

    // Convertir a formato para mostrar en la tabla
    return Object.entries(optionCounts).map(([option, count]) => ({
      option,
      count,
      percentage: questionResponses.length > 0 ? Math.round((count / questionResponses.length) * 100) : 0,
    }))
  }

  // Get question responses
  const getQuestionResponses = (questionId) => {
    // Verificar que responses es un array
    if (!Array.isArray(responses)) {
      console.warn("responses no es un array:", responses)
      return []
    }

    // Filtramos las respuestas que corresponden a esta pregunta
    const result = responses
      .filter((response) => response && response.answers && Array.isArray(response.answers))
      .flatMap((response) => {
        try {
          // Buscar respuestas para esta pregunta
          const answers = response.answers.filter((a) => a && a.questionId === questionId)

          // Mapear a un formato estándar
          return answers.map((answer) => ({
            value: answer.value,
            respondentName: response.respondentName || "Anónimo",
            createdAt: response.createdAt,
          }))
        } catch (error) {
          console.error("Error procesando respuesta:", error)
          return []
        }
      })

    console.log(`Respuestas para pregunta ${questionId}:`, result)
    return result
  }

  // Eliminar encuesta
  const handleDelete = async () => {
    if (!window.confirm("¿Está seguro que desea eliminar esta encuesta? Esta acción no se puede deshacer.")) {
      return
    }

    try {
      setLoading(true)

      // Usar el servicio centralizado para eliminar la encuesta
      await SurveyService.deleteSurvey(surveyId)

      navigate("/dashboard")
    } catch (error) {
      setError("Error al eliminar la encuesta: " + (error.message || "Error desconocido"))
      setLoading(false)
    }
  }

  // Cambiar estado activo/inactivo
  const toggleActive = async () => {
    try {
      setLoading(true)

      // Actualizar el estado en el servidor
      const updatedSurvey = await SurveyService.updateSurvey(surveyId, {
        ...survey,
        isActive: !survey.isActive,
      })

      // Actualizar estado local
      setSurvey(updatedSurvey)

      // Mostrar mensaje de éxito
      alert(`Encuesta ${updatedSurvey.isActive ? "activada" : "desactivada"} correctamente`)

      setLoading(false)
    } catch (error) {
      console.error("Error al cambiar el estado de la encuesta:", error)
      setError("Error al actualizar la encuesta: " + (error.message || "Error desconocido"))
      setLoading(false)
    }
  }

  // Cambiar estado público/privado
  const togglePublic = async () => {
    try {
      setLoading(true)

      // Actualizar el estado en el servidor
      const updatedSurvey = await SurveyService.updateSurvey(surveyId, {
        ...survey,
        isPublic: !survey.isPublic,
      })

      // Actualizar estado local
      setSurvey(updatedSurvey)

      // Mostrar mensaje de éxito
      alert(`Encuesta ahora es ${updatedSurvey.isPublic ? "pública" : "privada"}`)

      setLoading(false)
    } catch (error) {
      console.error("Error al cambiar la visibilidad de la encuesta:", error)
      setError("Error al actualizar la encuesta: " + (error.message || "Error desconocido"))
      setLoading(false)
    }
  }

  // Renderizar estrellas para valoraciones
  const renderStars = (rating) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-red-100 max-w-md w-full relative overflow-hidden">
          {/* Elementos decorativos */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <svg
            className="animate-spin h-16 w-16 text-red-600 mx-auto mb-6"
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
          <h2 className="text-2xl font-bold text-red-900 mb-2">Cargando encuesta</h2>
          <p className="text-gray-600">Estamos preparando todos los datos para ti...</p>

          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-red-100 max-w-md w-full relative overflow-hidden">
          {/* Elementos decorativos */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-red-600"
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
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">¡Ups! Algo salió mal</h2>
          <p className="text-gray-600 mb-6">{error || "No se pudo cargar la información de la encuesta."}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Volver al Dashboard
          </button>

          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
        </div>
      </div>
    )
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white">
        <div className="text-center p-8 bg-white rounded-xl shadow-xl border border-red-100 max-w-md w-full relative overflow-hidden">
          {/* Elementos decorativos */}
          <div className="absolute -top-10 -left-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-red-800 rounded-full opacity-10"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-gray-400"
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
          </div>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Encuesta no encontrada</h2>
          <p className="text-gray-600 mb-6">La encuesta que estás buscando no existe o ha sido eliminada.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Volver al Dashboard
          </button>

          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white p-6 relative">
      {/* Elementos decorativos */}
      <div className="absolute top-0 left-0 w-40 h-40 bg-red-800 rounded-full opacity-5"></div>
      <div className="absolute bottom-0 right-0 w-40 h-40 bg-red-800 rounded-full opacity-5"></div>

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-xl border border-red-100 p-6 mb-8 relative overflow-hidden">
          {/* Barra superior decorativa */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="flex flex-col md:flex-row justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-red-900 mb-2 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8 mr-3 text-red-600"
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
                {survey.title}
              </h1>
              <p className="text-gray-600 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Creada: {formatDate(survey.createdAt)}
              </p>
            </div>
            <div className="mt-6 md:mt-0 flex flex-wrap gap-3">
              <Link
                to={`/take-survey/${survey._id}`}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
                target="_blank"
              >
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Ver Encuesta
              </Link>

              {/* Botón para activar/desactivar encuesta */}
              <button
                onClick={toggleActive}
                className={`px-5 py-2.5 rounded-lg shadow-md transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${
                  survey.isActive
                    ? "bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 focus:ring-green-500"
                    : "bg-gradient-to-r from-yellow-500 to-yellow-700 text-white hover:from-yellow-600 hover:to-yellow-800 focus:ring-yellow-500"
                }`}
              >
                {survey.isActive ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Activa
                  </>
                ) : (
                  <>
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
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Inactiva
                  </>
                )}
              </button>

              {/* Botón para cambiar visibilidad pública/privada */}
              <button
                onClick={togglePublic}
                className={`px-5 py-2.5 rounded-lg shadow-md transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-opacity-50 flex items-center ${
                  survey.isPublic
                    ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 focus:ring-blue-500"
                    : "bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-600 hover:to-purple-800 focus:ring-purple-500"
                }`}
              >
                {survey.isPublic ? (
                  <>
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    Pública
                  </>
                ) : (
                  <>
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
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                      />
                    </svg>
                    Privada
                  </>
                )}
              </button>

              <button
                onClick={handleDelete}
                className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Eliminar
              </button>

              <button className="px-5 py-2.5 bg-white border border-red-300 text-red-700 rounded-lg shadow-sm hover:bg-red-50 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center">
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Compartir
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-red-100 overflow-hidden">
            <div className="flex flex-wrap border-b border-red-100">
              <button
                className={`px-6 py-3 font-medium transition-colors duration-200 flex items-center ${
                  activeTab === "results"
                    ? "border-b-2 border-red-600 text-red-700 bg-red-50"
                    : "text-gray-600 hover:bg-red-50"
                }`}
                onClick={() => setActiveTab("results")}
              >
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                Resultados
              </button>
              <button
                className={`px-6 py-3 font-medium transition-colors duration-200 flex items-center ${
                  activeTab === "overview"
                    ? "border-b-2 border-red-600 text-red-700 bg-red-50"
                    : "text-gray-600 hover:bg-red-50"
                }`}
                onClick={() => setActiveTab("overview")}
              >
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Información General
              </button>
            </div>

            <div className="p-6">
              {activeTab === "overview" && (
                <div>
                  <h2 className="text-xl font-bold text-red-900 mb-6 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-2 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Información de la Encuesta
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                      <h3 className="font-bold text-red-900 mb-3 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h7"
                          />
                        </svg>
                        Descripción
                      </h3>
                      <p className="text-gray-700">{survey.description || "Sin descripción"}</p>
                    </div>
                    <div className="space-y-6">
                      <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                        <h3 className="font-bold text-red-900 mb-3 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 12l2-2m0 0l7-7 7 7m-7-7v14"
                            />
                          </svg>
                          Mensaje de Bienvenida
                        </h3>
                        <p className="text-gray-700">{survey.welcomeMessage || "Sin mensaje de bienvenida"}</p>
                      </div>
                      <div className="bg-red-50 p-6 rounded-xl border border-red-100 shadow-sm">
                        <h3 className="font-bold text-red-900 mb-3 flex items-center">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                          Mensaje de Despedida
                        </h3>
                        <p className="text-gray-700">{survey.farewell || "Sin mensaje de despedida"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h3 className="text-xl font-bold text-red-900 mb-6 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-2 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Configuración
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm transition-transform hover:transform hover:scale-105">
                        <div className="text-red-600 text-sm font-medium mb-1">Estado</div>
                        <div className={`text-lg font-bold ${survey.isActive ? "text-green-600" : "text-red-600"}`}>
                          {survey.isActive ? "Activa" : "Inactiva"}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm transition-transform hover:transform hover:scale-105">
                        <div className="text-red-600 text-sm font-medium mb-1">Acceso</div>
                        <div className="text-lg font-bold text-gray-800">{survey.isPublic ? "Pública" : "Privada"}</div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm transition-transform hover:transform hover:scale-105">
                        <div className="text-red-600 text-sm font-medium mb-1">Respuestas Anónimas</div>
                        <div className="text-lg font-bold text-gray-800">
                          {survey.allowAnonymous ? "Permitidas" : "No permitidas"}
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm transition-transform hover:transform hover:scale-105">
                        <div className="text-red-600 text-sm font-medium mb-1">Visitas</div>
                        <div className="text-lg font-bold text-gray-800">{survey.viewsCount || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "results" && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-bold text-red-900 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 mr-2 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Resultados
                    </h2>
                    <div className="bg-red-100 text-red-800 px-4 py-2 rounded-full font-bold flex items-center">
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
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Total de respuestas: <span className="ml-1">{responses.length}</span>
                    </div>
                  </div>

                  {!Array.isArray(responses) || responses.length === 0 ? (
                    <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100 shadow-inner">
                      <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center mx-auto mb-6 shadow-md">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-red-400"
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
                      </div>
                      <h3 className="text-xl font-bold text-red-900 mb-3">Sin respuestas aún</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Todavía no hay respuestas para esta encuesta. Compártela para comenzar a recibir feedback.
                      </p>
                      <div className="flex flex-wrap justify-center gap-4">
                        <Link
                          to={`/take-survey/${survey._id}`}
                          className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-lg shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
                          target="_blank"
                        >
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path strokeLinecap="" />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          Tomar la Encuesta
                        </Link>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-5 py-2.5 bg-white border border-red-300 text-red-700 rounded-lg shadow-sm hover:bg-red-50 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
                        >
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
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Actualizar Datos
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {survey.questions.map((question, index) => {
                        const questionResponses = getQuestionResponses(question._id)

                        return (
                          <div
                            key={question._id}
                            className="bg-white rounded-xl shadow-md border border-red-100 overflow-hidden"
                          >
                            <div className="bg-gradient-to-r from-red-50 to-white p-5 border-b border-red-100">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="inline-flex items-center justify-center bg-red-700 text-white rounded-full w-8 h-8 text-sm font-bold mb-2">
                                    {index + 1}
                                  </div>
                                  <div className="text-xl font-bold text-red-900">{question.text}</div>
                                  <div className="text-xs text-red-600 mt-2 flex items-center">
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
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                      />
                                    </svg>
                                    Tipo:{" "}
                                    <span className="font-medium">
                                      {question.type === "open"
                                        ? "Respuesta abierta"
                                        : question.type === "single"
                                          ? "Opción única"
                                          : question.type === "multiple"
                                            ? "Opción múltiple"
                                            : question.type === "rating"
                                              ? "Valoración"
                                              : question.type === "yesno"
                                                ? "Sí/No"
                                                : question.type}
                                    </span>
                                  </div>
                                </div>
                                <div className="bg-red-700 text-white px-3 py-1 rounded-full text-sm font-bold">
                                  {questionResponses.length} respuestas
                                </div>
                              </div>
                            </div>

                            <div className="p-5">
                              {question.type === "rating" && (
                                <div>
                                  {/* Gráfico de barras */}
                                  <div className="h-64 mb-8 p-4 bg-white rounded-lg shadow-inner border border-red-100">
                                    <Bar
                                      data={prepareRatingChartData(questionResponses)}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                          y: {
                                            beginAtZero: true,
                                            ticks: {
                                              precision: 0,
                                            },
                                          },
                                        },
                                        plugins: {
                                          legend: {
                                            labels: {
                                              font: {
                                                family: "'Inter', sans-serif",
                                              },
                                            },
                                          },
                                        },
                                      }}
                                    />
                                  </div>

                                  {questionResponses.length > 0 && (
                                    <>
                                      {/* Tabla de valoraciones */}
                                      <div className="overflow-x-auto">
                                        <div className="bg-blue-50 p-4 rounded-xl mb-6 flex justify-between items-center border border-blue-100 shadow-inner">
                                          <div className="text-blue-800 font-bold">
                                            Valoración promedio:{" "}
                                            <span className="text-2xl ml-2">
                                              {prepareRatingDetailData(questionResponses).average}
                                            </span>{" "}
                                            / 5
                                          </div>
                                          <div className="flex items-center">
                                            {renderStars(
                                              Math.round(prepareRatingDetailData(questionResponses).average),
                                            )}
                                          </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                                          <table className="min-w-full divide-y divide-red-100">
                                            <thead className="bg-red-50">
                                              <tr>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Valoración
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Respuestas
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Porcentaje
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Gráfico
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-red-100">
                                              {prepareRatingDetailData(questionResponses).map((item, idx) => (
                                                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-red-50"}>
                                                  <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                      <span className="font-bold text-gray-900 mr-2">
                                                        {item.rating}
                                                      </span>
                                                      {renderStars(item.rating)}
                                                    </div>
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                    {item.count}
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                    {item.percentage}%
                                                  </td>
                                                  <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                      <div
                                                        className="bg-yellow-400 h-2.5 rounded-full"
                                                        style={{ width: `${item.percentage}%` }}
                                                      ></div>
                                                    </div>
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {/* Detalle de respuestas individuales */}
                                      <div className="mt-8">
                                        <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 mr-2 text-red-600"
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
                                          Detalle de respuestas
                                        </h4>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                          {questionResponses.map((response, idx) => (
                                            <div
                                              key={idx}
                                              className="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                                            >
                                              <div className="flex justify-between">
                                                <div className="font-bold text-red-900">{response.respondentName}</div>
                                                {response.createdAt && (
                                                  <div className="text-xs text-gray-500">
                                                    {formatDate(response.createdAt)}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="mt-3 flex items-center">
                                                <div className="mr-2 text-gray-700">Valoración:</div>
                                                <div className="flex items-center">
                                                  {renderStars(Number.parseInt(response.value))}
                                                  <span className="ml-2 font-bold text-red-900">
                                                    {response.value}/5
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {question.type === "yesno" && (
                                <div className="flex flex-col items-center">
                                  <div className="h-64 w-64 mx-auto mb-6 p-4 bg-white rounded-lg shadow-inner border border-red-100">
                                    <Pie
                                      data={prepareYesNoChartData(questionResponses)}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: {
                                          legend: {
                                            position: "bottom",
                                            labels: {
                                              font: {
                                                family: "'Inter', sans-serif",
                                                size: 14,
                                              },
                                              padding: 20,
                                            },
                                          },
                                        },
                                      }}
                                    />
                                  </div>

                                  {/* Detalle de respuestas individuales */}
                                  {questionResponses.length > 0 && (
                                    <div className="w-full mt-6">
                                      <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-5 w-5 mr-2 text-red-600"
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
                                        Detalle de respuestas
                                      </h4>
                                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {questionResponses.map((response, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                                          >
                                            <div className="flex justify-between">
                                              <div className="font-bold text-red-900">{response.respondentName}</div>
                                              {response.createdAt && (
                                                <div className="text-xs text-gray-500">
                                                  {formatDate(response.createdAt)}
                                                </div>
                                              )}
                                            </div>
                                            <div className="mt-3">
                                              <span className="font-medium text-gray-700 mr-2">Respuesta:</span>
                                              <span
                                                className={`font-bold ${
                                                  normalizeText(response.value).includes("si")
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                                }`}
                                              >
                                                {response.value || "Sin respuesta"}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {question.type === "open" && (
                                <div className="max-h-96 overflow-y-auto pr-2">
                                  {questionResponses.length > 0 ? (
                                    <ul className="space-y-4">
                                      {questionResponses.map((response, idx) => (
                                        <li
                                          key={idx}
                                          className="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                                        >
                                          <div className="flex justify-between mb-2">
                                            <div className="font-bold text-red-900">{response.respondentName}</div>
                                            {response.createdAt && (
                                              <div className="text-xs text-gray-500">
                                                {formatDate(response.createdAt)}
                                              </div>
                                            )}
                                          </div>
                                          <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-100 italic text-gray-700">
                                            "{response.value || "Sin respuesta"}"
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="text-gray-500 italic text-center py-8 bg-red-50 rounded-lg border border-red-100">
                                      No hay respuestas para esta pregunta
                                    </p>
                                  )}
                                </div>
                              )}

                              {question.type === "single" && (
                                <div>
                                  <div className="h-64 mb-8 p-4 bg-white rounded-lg shadow-inner border border-red-100">
                                    <Bar
                                      data={{
                                        labels: question.options,
                                        datasets: [
                                          {
                                            label: "Respuestas",
                                            data: question.options.map((option) => {
                                              // Usar normalización para comparar
                                              const normalizedOption = normalizeText(option)
                                              return questionResponses.filter(
                                                (r) =>
                                                  normalizeText(r.value) === normalizedOption ||
                                                  normalizeText(r.value).includes(normalizedOption),
                                              ).length
                                            }),
                                            backgroundColor: "rgba(220, 38, 38, 0.6)",
                                            borderColor: "rgba(220, 38, 38, 1)",
                                            borderWidth: 1,
                                          },
                                        ],
                                      }}
                                      options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                          y: {
                                            beginAtZero: true,
                                            ticks: {
                                              precision: 0,
                                            },
                                          },
                                        },
                                        plugins: {
                                          legend: {
                                            labels: {
                                              font: {
                                                family: "'Inter', sans-serif",
                                              },
                                            },
                                          },
                                        },
                                      }}
                                    />
                                  </div>

                                  {/* Detalle de respuestas individuales */}
                                  {questionResponses.length > 0 && (
                                    <div className="mt-6">
                                      <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-5 w-5 mr-2 text-red-600"
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
                                        Detalle de respuestas
                                      </h4>
                                      <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                        {questionResponses.map((response, idx) => (
                                          <div
                                            key={idx}
                                            className="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                                          >
                                            <div className="flex justify-between">
                                              <div className="font-bold text-red-900">{response.respondentName}</div>
                                              {response.createdAt && (
                                                <div className="text-xs text-gray-500">
                                                  {formatDate(response.createdAt)}
                                                </div>
                                              )}
                                            </div>
                                            <div className="mt-3">
                                              <span className="font-medium text-gray-700 mr-2">Selección:</span>
                                              <span className="font-bold text-red-900">
                                                {response.value || "Sin respuesta"}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {question.type === "multiple" && (
                                <div>
                                  {questionResponses.length > 0 ? (
                                    <>
                                      {/* Tabla de opciones y respuestas */}
                                      <div className="overflow-x-auto">
                                        <div className="bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden mb-8">
                                          <table className="min-w-full divide-y divide-red-100">
                                            <thead className="bg-red-50">
                                              <tr>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Opción
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Respuestas
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Porcentaje
                                                </th>
                                                <th
                                                  scope="col"
                                                  className="px-6 py-3 text-left text-xs font-bold text-red-700 uppercase tracking-wider"
                                                >
                                                  Gráfico
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-red-100">
                                              {prepareMultipleChoiceData(question, questionResponses).map(
                                                (item, idx) => (
                                                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-red-50"}>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                      {item.option}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                      {item.count}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                      {item.percentage}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                        <div
                                                          className="bg-red-600 h-2.5 rounded-full"
                                                          style={{ width: `${item.percentage}%` }}
                                                        ></div>
                                                      </div>
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>

                                      {/* Detalle de respuestas individuales */}
                                      <div className="mt-6">
                                        <h4 className="text-lg font-bold text-red-900 mb-4 flex items-center">
                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-5 w-5 mr-2 text-red-600"
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
                                          Detalle de respuestas
                                        </h4>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                          {questionResponses.map((response, idx) => {
                                            let values = []
                                            try {
                                              if (typeof response.value === "string") {
                                                // Verificar si es una selección explícita
                                                const normalizedValue = normalizeText(response.value)
                                                if (normalizedValue.includes("seleccion")) {
                                                  // Extraer la parte después de "selecciones:" o similar
                                                  const parts = normalizedValue.split(/[:\s]+/)
                                                  for (let i = 0; i < parts.length; i++) {
                                                    if (parts[i].includes("seleccion") && i + 1 < parts.length) {
                                                      values = [parts[i + 1]]
                                                      break
                                                    }
                                                  }

                                                  if (values.length === 0 && parts.length > 1) {
                                                    values = [parts[parts.length - 1]]
                                                  }
                                                } else if (response.value.startsWith("[")) {
                                                  // Intentar parsear como JSON
                                                  try {
                                                    values = JSON.parse(response.value)
                                                    if (!Array.isArray(values)) {
                                                      values = [values.toString()]
                                                    }
                                                  } catch (e) {
                                                    values = [response.value]
                                                  }
                                                } else {
                                                  // Es un valor simple
                                                  values = [response.value]
                                                }
                                              } else if (Array.isArray(response.value)) {
                                                values = response.value
                                              } else if (response.value) {
                                                values = [response.value.toString()]
                                              }
                                            } catch (e) {
                                              console.error("Error parsing response value:", e)
                                              values = [response.value || "Error en formato"]
                                            }

                                            return (
                                              <div
                                                key={idx}
                                                className="bg-white p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow"
                                              >
                                                <div className="flex justify-between">
                                                  <div className="font-bold text-red-900">
                                                    {response.respondentName}
                                                  </div>
                                                  {response.createdAt && (
                                                    <div className="text-xs text-gray-500">
                                                      {formatDate(response.createdAt)}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                  {values.map((val, valIdx) => (
                                                    <span
                                                      key={valIdx}
                                                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                                                    >
                                                      {val}
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <p className="text-gray-500 italic text-center py-8 bg-red-50 rounded-lg border border-red-100">
                                      No hay respuestas para esta pregunta
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Barra inferior decorativa */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
        </div>
      </div>
    </div>
  )
}

export default SurveyDetail
