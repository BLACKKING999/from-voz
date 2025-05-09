"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { SurveyService, ResponseService } from "../services/apiService"

// Componentes
import LoadingSpinner from "../components/LoadingSpinner"
import ErrorMessage from "../components/ErrorMessage"
import audioService from "../services/audioService"
// Importar servicio de procesamiento de lenguaje natural
import { validateResponse, processResponse, extractName, analyzeIntent } from "../services/nlpService"

const TakeSurvey = () => {
  const { surveyId } = useParams()
  const navigate = useNavigate()

  // Referencias para controlar el flujo
  const hasInitializedRef = useRef(false)
  const hasPlayedWelcomeRef = useRef(false)
  const speakTimeoutRef = useRef(null)
  const questionSpeakingRef = useRef(false)
  // Estado para controlar cuando la encuesta se ha cargado completamente
  // se mantiene como referencia para futuras implementaciones
  // eslint-disable-next-line no-unused-vars
  const [surveyLoaded, setSurveyLoaded] = useState(false)

  // Estados
  const [survey, setSurvey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState([])
  const [respondentName, setRespondentName] = useState("")
  const [nameAsked, setNameAsked] = useState(false)
  const [nameCollectionComplete, setNameCollectionComplete] = useState(false)
  const [showSurveyQuestions, setShowSurveyQuestions] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [currentResponse, setCurrentResponse] = useState("")
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [conversationState, setConversationState] = useState("idle") // idle, speaking, listening, processing
  const [conversationMessage, setConversationMessage] = useState("")
  const [micPermission, setMicPermission] = useState("unknown") // 'unknown', 'granted', 'denied'
  // Estado para rastrear el estado actual del proceso
  // eslint-disable-next-line no-unused-vars
  const [status, setStatus] = useState("")
  const [currentTransitionPhrase, setCurrentTransitionPhrase] = useState("")
  // eslint-disable-next-line no-unused-vars
  const [currentFarewellPhrase, setCurrentFarewellPhrase] = useState("")

  // Cargar la encuesta
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const data = await SurveyService.getPublicSurvey(surveyId)
        setSurvey(data)
        // Inicializar respuestas vacías
        setResponses(new Array(data.questions.length).fill(""))
      } catch (error) {
        setError("No se pudo cargar la encuesta. Verifique que el ID sea correcto y que la encuesta esté activa.")
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()

    // Inicializar sistema de voz
    audioService.initSpeechSystem()

    // Configurar el callback para cambios en el permiso del micrófono
    audioService.onPermissionChange((granted, errorMsg) => {
      setMicPermission(granted ? "granted" : "denied")
      if (!granted && errorMsg) {
        setConversationMessage(`Error de permiso: ${errorMsg}`)
        setConversationState("permission_denied")
      }
    })

    return () => {
      // Detener cualquier síntesis y reconocimiento al desmontar
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current)
      }
      audioService.stop()
      hasInitializedRef.current = false
      hasPlayedWelcomeRef.current = false
      questionSpeakingRef.current = false

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [surveyId])

  // Detectar si es un dispositivo móvil, especialmente Android
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  const isAndroidDevice = () => {
    return /Android/i.test(navigator.userAgent)
  }

  // Configurar tiempos específicos para dispositivos móviles
  useEffect(() => {
    if (isMobileDevice()) {
      // Configuración específica para dispositivos móviles
      const mobileConfig = {
        silenceThreshold: 15000, // 3 segundos sin hablar para terminar (más tiempo en móviles)
        speakingTimeout: 30000, // 15 segundos máximo de espera
        volumeThreshold: isAndroidDevice() ? 2 : 3, // Umbral más bajo para Android (más sensible)
      }

      // Aplicar configuración optimizada para móviles
      audioService.setTimingConfig(mobileConfig)

      // Si es Android, usar una configuración de reconocimiento más agresiva
      if (isAndroidDevice()) {
        audioService.setMobileMode(true)
      }
    }
  }, [])

  // Frases de transición para mostrar aleatoriamente antes de las preguntas
  const transitionPhrases = [
    "Bro, aún no acabamos, ¿vas preparado?",
    "No corras, que esto apenas calienta motores, ja, ja.",
    "Espera un segundo… todavía hay más cachos por partir, ajajá.",
    "Tranqui, que la mejor parte viene ahora, jeje.",
    "No te me vayas, que la fiesta continúa.",
    "Alto ahí, que falta lo fuerte, ja.",
    "No cambies de sintonía, que sigue lo bueno.",
    "Quieto parao, que todavía no acabamos.",
    "No te me adelantes, que falta el plato principal, je.",
    "Espera, que lo mejor está por salir.",
    "Aguanta, que viene la bomba, ajá.",
    "No pienses que ya, que apenas vamos por la mitad, ja.",
    "Oye, que aún queda tela para cortar, jijí.",
    "Tranquilo, que lo interesante está por llegar.",
    "No te me desconectes, que viene lo jugoso.",
    "¡Alto! Que aún falta la guinda del pastel, jeje.",
    "No despistes, que aquí hay más chicha.",
    "Detente un momento, que la segunda ronda arranca ya.",
    "No te duermas en los laureles, que sigue la acción.",
    "Quieto, que viene la pregunta que rompe todo.",
    "Ni se te ocurra irte, que lo mejor está en camino.",
    "No cambies la página, que falta el capítulo estelar.",
    "Espera un toque, que la próxima te va a encantar.",
    "No te me escondas, que aún hay jugo que exprimir.",
    "No corras, que esto sube de nivel en un segundo.",
    "No palidezcas, que la siguiente te dejará pensando.",
    "Párate ahí, que viene la pregunta bomba.",
    "No respires tan rápido, que esto se pone intenso.",
    "No te me pierdas, que queda lo más sabroso.",
    "No te me adelantes, que la sorpresa está por explotar.",
  ]

  // Función para obtener una frase de transición aleatoria
  const getRandomTransitionPhrase = () => {
    const randomIndex = Math.floor(Math.random() * transitionPhrases.length)
    return transitionPhrases[randomIndex]
  }

  // Iniciar la encuesta una vez que está cargada y tenemos permiso del micrófono
  // Función para hablar el texto usando el servicio de audio
  const speakText = useCallback(
    (text, onEndCallback) => {
      if (!voiceEnabled) {
        if (onEndCallback) onEndCallback()
        return
      }

      // Cancela cualquier síntesis en curso y limpia los timeouts anteriores
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }

      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current)
        speakTimeoutRef.current = null
      }

      // Detener cualquier reconocimiento en curso para evitar conflictos
      audioService.stop()
      setIsListening(false)

      // Pequeña pausa antes de hablar
      speakTimeoutRef.current = setTimeout(() => {
        setConversationState("speaking")
        setConversationMessage("Hablando: " + text.substring(0, 40) + (text.length > 40 ? "..." : ""))

        audioService.speakText(
          text,
          () => {
            if (text.includes("Pregunta")) {
              questionSpeakingRef.current = true
            }
          },
          () => {
            setConversationState("idle")

            // Marcar que ya no está hablando la pregunta
            if (questionSpeakingRef.current) {
              questionSpeakingRef.current = false
            }

            // Llamar al callback después de hablar, si existe
            if (onEndCallback) {
              onEndCallback()
            }
          },
          (error) => {
            setConversationState("error")
            setConversationMessage(`Error: ${error}`)

            // En caso de error, intentar continuar
            if (onEndCallback) {
              onEndCallback()
            }
          },
        )
      }, 300)
    },
    [voiceEnabled],
  )

  // Escuchar el nombre del usuario
  const listenForName = useCallback(() => {
    if (!voiceEnabled) return

    audioService.init("es-ES")

    audioService.onResult((transcript, isFinal) => {
      setCurrentResponse(transcript)
      setStatus(isFinal ? "Procesando..." : "Escuchando...")
    })

    audioService.onEnd((finalTranscript) => {
      setIsListening(false)
      setConversationState("processing")
      setConversationMessage("Procesando nombre...")

      // Extraer el nombre usando nlpService con mejor validación
      if (finalTranscript && finalTranscript.trim() !== "") {
        try {
          const extractedName = extractName(finalTranscript)
          // Verificar que sea un nombre válido
          if (extractedName && extractedName !== "Estimado participante" && extractedName.length >= 2) {
            setRespondentName(extractedName)
            setCurrentResponse("")
            speakText(
              `Gracias, ${extractedName}. Presiona Siguiente cuando estés listo para comenzar con la encuesta.`,
              () => {
                setNameCollectionComplete(true)
                setConversationState("idle")
                setConversationMessage("Esperando para comenzar la encuesta...")
              },
            )
          } else {
            setRespondentName("Anónimo")
            setCurrentResponse("")
            speakText(
              "No pude entender tu nombre. Te llamaré Anónimo por ahora. Presiona Siguiente cuando estés listo para comenzar con la encuesta.",
              () => {
                setNameCollectionComplete(true)
                setConversationState("idle")
                setConversationMessage("Esperando para comenzar la encuesta...")
              },
            )
          }
        } catch (error) {
          console.error("Error al procesar el nombre:", error)
          setRespondentName("Anónimo")
          setCurrentResponse("")
          speakText("Hubo un problema al procesar tu nombre. Te llamaré Anónimo por ahora.", () => {
            setNameCollectionComplete(true)
            setConversationState("idle")
            setConversationMessage("Esperando para comenzar la encuesta...")
          })
        }
      } else {
        // No se detectó ningún texto
        setRespondentName("Anónimo")
        setCurrentResponse("")
        speakText("No pude entender tu nombre. Te llamaré Anónimo por ahora.", () => {
          setNameCollectionComplete(true)
          setConversationState("idle")
          setConversationMessage("Esperando para comenzar la encuesta...")
        })
      }
    })

    audioService.onError((errorMessage) => {
      setIsListening(false)
      setConversationState("error")
      setConversationMessage(`Error: ${errorMessage}`)
      // En caso de error, seguir con el nombre anónimo
      setRespondentName("Anónimo")
      speakText(
        "Hubo un problema al captar tu nombre. Te llamaré Anónimo por ahora. Presiona Siguiente cuando estés listo para comenzar con la encuesta.",
        () => {
          setNameCollectionComplete(true)
          setConversationState("idle")
          setConversationMessage("Esperando para comenzar la encuesta...")
        },
      )
    })

    try {
      audioService.start()
      setIsListening(true)
      setConversationState("listening")
      setConversationMessage("Escuchando tu nombre...")
    } catch (error) {
      setRespondentName("Anónimo")
      speakText(
        "No pude activar el micrófono. Te llamaré Anónimo por ahora. Presiona Siguiente cuando estés listo para comenzar con la encuesta.",
        () => {
          setNameCollectionComplete(true)
          setConversationState("idle")
          setConversationMessage("Esperando para comenzar la encuesta...")
        },
      )
    }
  }, [voiceEnabled, speakText])

  // Función para hablar la pregunta actual
  const speakCurrentQuestion = useCallback(() => {
    if (!survey || !voiceEnabled) return

    const currentQuestion = survey.questions[currentQuestionIndex]
    if (!currentQuestion) return

    let questionText = `Pregunta ${currentQuestionIndex + 1}: ${currentQuestion.text}`

    // Agregar información sobre opciones si es pregunta de opción múltiple
    if (currentQuestion.type === "multiple_choice" && currentQuestion.options) {
      questionText += ". Las opciones son: "
      questionText += currentQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
    }

    speakText(questionText, null)
  }, [survey, voiceEnabled, currentQuestionIndex, speakText])

  // Función para preguntar el nombre al usuario
  const askForName = useCallback(() => {
    if (!nameAsked) {
      setNameAsked(true)
      speakText("¿Podrías decirme tu nombre, por favor?", () => {
        listenForName()
      })
    } else {
      // Si ya se preguntó el nombre, continuar con la primera pregunta
      speakCurrentQuestion()
    }
  }, [nameAsked, speakText, listenForName, speakCurrentQuestion])

  useEffect(() => {
    // Solo iniciar si tenemos encuesta, voz habilitada, permiso, y no hemos iniciado antes
    if (survey && voiceEnabled && micPermission === "granted" && !hasInitializedRef.current && !loading) {
      hasInitializedRef.current = true

      // Dar un mensaje de bienvenida y preguntar el nombre
      if (survey.welcomeMessage && !hasPlayedWelcomeRef.current) {
        hasPlayedWelcomeRef.current = true
        speakText(survey.welcomeMessage, () => {
          // Preguntar el nombre después de la bienvenida
          askForName()
        })
      } else {
        // Si no hay mensaje de bienvenida, preguntar directamente el nombre
        askForName()
      }
    }
  }, [survey, voiceEnabled, micPermission, loading, askForName, speakText])

  // Ya se ha reubicado arriba

  // Ya se ha reubicado arriba

  // La función listenForName se ha movido arriba

  // Función para comenzar la encuesta después de recoger el nombre
  const startSurveyAfterName = () => {
    setShowSurveyQuestions(true)
    speakCurrentQuestion()
  }

  // Solicitar permiso del micrófono
  const requestMicrophonePermission = async () => {
    setConversationState("requesting_permission")
    setConversationMessage("Solicitando permiso para el micrófono...")

    try {
      const permissionGranted = await audioService.requestMicrophonePermission()

      if (permissionGranted) {
        setMicPermission("granted")
        setConversationMessage("Permiso concedido. Iniciando encuesta por voz...")
      } else {
        setMicPermission("denied")
        setConversationState("permission_denied")
        setConversationMessage("Se necesita acceso al micrófono para usar la función de voz")
      }
    } catch (error) {
      setMicPermission("denied")
      setConversationState("error")
      setConversationMessage("Error al solicitar permiso del micrófono")
    }
  }

  // Ya se ha reubicado arriba

  // La función speakCurrentQuestion ahora está definida con useCallback arriba

  // Función para iniciar la escucha de la respuesta del usuario
  const startListening = async () => {
    if (!voiceEnabled) return

    // Si está hablando la pregunta, esperar a que termine
    if (questionSpeakingRef.current) {
      setConversationMessage("Espera a que termine de leer la pregunta...")
      return
    }

    if (!audioService.isSupportedByBrowser()) {
      setError("Tu navegador no soporta reconocimiento de voz")
      return
    }

    if (micPermission !== "granted") {
      await requestMicrophonePermission()
      return
    }

    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    // Inicializar el reconocimiento de voz con el idioma español
    audioService.init("es-ES")

    audioService.onResult((transcript, isFinal) => {
      setCurrentResponse(transcript)
      setStatus(isFinal ? "Procesando..." : "Escuchando...")
    })

    audioService.onEnd((finalTranscript) => {
      setIsListening(false)
      setConversationState("processing")
      setConversationMessage("Procesando tu respuesta...")

      // Verificar si hay una respuesta válida
      if (finalTranscript && finalTranscript.trim() !== "") {
        const currentQuestion = survey.questions[currentQuestionIndex]

        // Validar la respuesta según el tipo de pregunta
        const validation = validateResponse(finalTranscript, currentQuestion.type, currentQuestion.options)

        if (validation.isValid) {
          // Procesar la respuesta según el tipo de pregunta
          const processedResponse = processResponse(finalTranscript, currentQuestion.type, currentQuestion.options)

          // Guardar respuesta procesada en el array de respuestas
          const updatedResponses = [...responses]
          updatedResponses[currentQuestionIndex] = {
            raw: finalTranscript,
            processed: processedResponse,
          }
          setResponses(updatedResponses)

          // Mostrar la respuesta procesada o la original según el tipo
          let displayResponse = finalTranscript

          // Para preguntas de selección única, mostrar la opción seleccionada
          if (currentQuestion.type === "single" && processedResponse && processedResponse.selected) {
            displayResponse = `Selección: ${processedResponse.selected}`
          }
          // Para preguntas de selección múltiple, mostrar las opciones seleccionadas
          else if (currentQuestion.type === "multiple" && Array.isArray(processedResponse)) {
            // Eliminar duplicados y valores vacíos
            const uniqueSelections = [...new Set(processedResponse.map((item) => item.selected))].filter(Boolean)
            const selections = uniqueSelections.join(", ")
            displayResponse = `Selecciones: ${selections || "Ninguna"}`
          }
          // Para preguntas de sí/no, mostrar Sí o No
          else if (currentQuestion.type === "yesno") {
            displayResponse = processedResponse === true ? "Sí" : "No"
          }
          // Para valoraciones, mostrar la puntuación
          else if (currentQuestion.type === "rating" && typeof processedResponse === "number") {
            displayResponse = `Valoración: ${processedResponse} de 5`
          }

          setCurrentResponse(displayResponse)

          // Confirmar la respuesta al usuario
          speakText(`He registrado tu respuesta: ${displayResponse}`, null)
        } else {
          // Si la respuesta no es válida, informar al usuario y volver a preguntar
          setCurrentResponse(finalTranscript + " (Respuesta no válida)")
          speakText(`${validation.message} Vamos a intentarlo de nuevo.`, () => {
            // Volver a leer la pregunta después de un breve momento
            setTimeout(() => {
              const currentQuestion = survey.questions[currentQuestionIndex]
              let questionText = `Pregunta ${currentQuestionIndex + 1}: ${currentQuestion.text}`

              // Añadir instrucciones según el tipo de pregunta
              if (currentQuestion.type === "single" && currentQuestion.options && currentQuestion.options.length > 0) {
                questionText += ". Por favor, elige una de las siguientes opciones: "
                questionText += currentQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
              } else if (
                currentQuestion.type === "multiple" &&
                currentQuestion.options &&
                currentQuestion.options.length > 0
              ) {
                questionText += ". Puedes elegir una o varias de las siguientes opciones: "
                questionText += currentQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
              } else if (currentQuestion.type === "rating") {
                questionText += ". Por favor, responde con un número del 1 al 5, donde 1 es muy malo y 5 es excelente."
              } else if (currentQuestion.type === "yesno") {
                questionText += ". Por favor, responde sí o no."
              }

              speakText(questionText, null)
            }, 1000)
          })
        }
      } else {
        // No se detectó ninguna respuesta
        speakText("No pude entender tu respuesta. Por favor, inténtalo de nuevo.", () => {
          // Volver a preguntar
          speakCurrentQuestion()
        })
      }
    })

    audioService.onError((errorMessage) => {
      setIsListening(false)
      setConversationState("error")
      setConversationMessage(`Error: ${errorMessage}`)
    })

    try {
      const started = await audioService.start()
      if (started) {
        setIsListening(true)
        setConversationState("listening")
        setConversationMessage("Escuchando tu respuesta...")
      } else {
        setError("No se pudo iniciar el reconocimiento de voz")
        setConversationState("idle")
      }
    } catch (error) {
      setError(`Error al iniciar reconocimiento: ${error.message || "Error desconocido"}`)
      setConversationState("idle")
    }
  }

  // Detener la escucha de voz
  const stopListening = () => {
    if (isListening) {
      audioService.stop()
      setIsListening(false)
      setConversationState("idle")
      setConversationMessage("Escucha detenida")
    }
  }

  // Navegar a la siguiente pregunta
  const goToNextQuestion = () => {
    // Si estamos en la fase de recolección de nombre y no hemos empezado la encuesta aún
    if (nameCollectionComplete && !showSurveyQuestions) {
      startSurveyAfterName()
      return
    }

    // Guardar la respuesta actual
    const updatedResponses = [...responses]
    updatedResponses[currentQuestionIndex] = currentResponse
    setResponses(updatedResponses)

    // Parar la escucha si está activa
    if (isListening) {
      audioService.stop()
      setIsListening(false)
    }

    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
      speakTimeoutRef.current = null
    }

    // Avanzar a la siguiente pregunta o mostrar confirmación
    if (currentQuestionIndex < survey.questions.length - 1) {
      // Primero actualizamos el índice
      const nextIndex = currentQuestionIndex + 1
      setCurrentQuestionIndex(nextIndex)
      setCurrentResponse(responses[nextIndex] || "")

      // Si es la segunda pregunta o posterior, seleccionamos una frase de transición aleatoria
      if (nextIndex >= 1) {
        const randomPhrase = getRandomTransitionPhrase()
        setCurrentTransitionPhrase(randomPhrase)

        // Esperamos a que React actualice el estado y luego leemos la nueva pregunta con la frase de transición
        setTimeout(() => {
          if (voiceEnabled) {
            // Primero decimos la frase de transición y luego la pregunta
            speakText(randomPhrase, () => {
              // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
              const nextQuestion = survey.questions[nextIndex]
              if (nextQuestion) {
                let questionText = `Pregunta ${nextIndex + 1}: ${nextQuestion.text}`

                // Agregar información sobre opciones según el tipo de pregunta
                if (nextQuestion.type === "single" && nextQuestion.options && nextQuestion.options.length > 0) {
                  questionText += ". Por favor, elige una de las siguientes opciones: "
                  questionText += nextQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
                } else if (
                  nextQuestion.type === "multiple" &&
                  nextQuestion.options &&
                  nextQuestion.options.length > 0
                ) {
                  questionText += ". Puedes elegir una o varias de las siguientes opciones: "
                  questionText += nextQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
                } else if (nextQuestion.type === "rating") {
                  questionText +=
                    ". Por favor, responde con un número del 1 al 5, donde 1 es muy malo y 5 es excelente."
                } else if (nextQuestion.type === "yesno") {
                  questionText += ". Por favor, responde sí o no."
                }

                speakText(questionText, null)
              }
            })
          }
        }, 300)
      } else {
        // Si es la primera pregunta, no mostramos frase de transición
        setTimeout(() => {
          if (voiceEnabled) {
            // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
            const nextQuestion = survey.questions[nextIndex]
            if (nextQuestion) {
              let questionText = `Pregunta ${nextIndex + 1}: ${nextQuestion.text}`

              // Agregar información sobre opciones según el tipo de pregunta
              if (nextQuestion.type === "single" && nextQuestion.options && nextQuestion.options.length > 0) {
                questionText += ". Por favor, elige una de las siguientes opciones: "
                questionText += nextQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
              } else if (nextQuestion.type === "multiple" && nextQuestion.options && nextQuestion.options.length > 0) {
                questionText += ". Puedes elegir una o varias de las siguientes opciones: "
                questionText += nextQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
              } else if (nextQuestion.type === "rating") {
                questionText += ". Por favor, responde con un número del 1 al 5, donde 1 es muy malo y 5 es excelente."
              } else if (nextQuestion.type === "yesno") {
                questionText += ". Por favor, responde sí o no."
              }

              speakText(questionText, null)
            }
          }
        }, 300)
      }
    } else {
      // Si es la última pregunta, mostrar confirmación
      setShowConfirmation(true)
      if (voiceEnabled) {
        speakText(
          "Hemos terminado todas las preguntas. Ahora te mostraré un resumen de tus respuestas para que las confirmes.",
          () => {
            speakConfirmationSummary()
          },
        )
      }
    }
  }

  // Navegar a la pregunta anterior
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex <= 0) return

    // Guardar la respuesta actual
    const updatedResponses = [...responses]
    updatedResponses[currentQuestionIndex] = currentResponse
    setResponses(updatedResponses)

    // Parar la escucha si está activa
    if (isListening) {
      audioService.stop()
      setIsListening(false)
    }

    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }

    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current)
      speakTimeoutRef.current = null
    }

    // Ir a la pregunta anterior
    const prevIndex = currentQuestionIndex - 1
    setCurrentQuestionIndex(prevIndex)
    setCurrentResponse(responses[prevIndex] || "")

    // Esperamos a que React actualice el estado y luego leemos la nueva pregunta
    setTimeout(() => {
      if (voiceEnabled) {
        // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
        const prevQuestion = survey.questions[prevIndex]
        if (prevQuestion) {
          let questionText = `Pregunta ${prevIndex + 1}: ${prevQuestion.text}`

          // Agregar información sobre opciones según el tipo de pregunta
          if (prevQuestion.type === "single" && prevQuestion.options && prevQuestion.options.length > 0) {
            questionText += ". Por favor, elige una de las siguientes opciones: "
            questionText += prevQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
          } else if (prevQuestion.type === "multiple" && prevQuestion.options && prevQuestion.options.length > 0) {
            questionText += ". Puedes elegir una o varias de las siguientes opciones: "
            questionText += prevQuestion.options.map((option, idx) => `Opción ${idx + 1}: ${option}`).join(", ")
          } else if (prevQuestion.type === "rating") {
            questionText += ". Por favor, responde con un número del 1 al 5, donde 1 es muy malo y 5 es excelente."
          } else if (prevQuestion.type === "yesno") {
            questionText += ". Por favor, responde sí o no."
          }

          speakText(questionText, null)
        }
      }
    }, 300)
  }

  // Leer el resumen de confirmación
  const speakConfirmationSummary = () => {
    if (!voiceEnabled || !showConfirmation) return

    let summaryText = "Resumen de tus respuestas: "

    survey.questions.forEach((question, index) => {
      // Obtener la respuesta en un formato legible
      let respuestaFormateada = ""
      const respuesta = responses[index]

      if (!respuesta) {
        respuestaFormateada = "Sin respuesta"
      } else if (typeof respuesta === "object") {
        if (respuesta.raw) {
          // Para respuestas procesadas con formato original
          if (question.type === "open") {
            respuestaFormateada = respuesta.raw
          } else if (question.type === "multiple" && Array.isArray(respuesta.processed)) {
            // Eliminar duplicados para selección múltiple
            const seleccionesUnicas = [...new Set(respuesta.processed.map((item) => item.selected))].filter(Boolean)
            respuestaFormateada = seleccionesUnicas.join(", ")
          } else if (question.type === "single" && respuesta.processed && respuesta.processed.selected) {
            respuestaFormateada = respuesta.processed.selected
          } else if (question.type === "yesno") {
            respuestaFormateada = respuesta.processed === true ? "Sí" : "No"
          } else if (question.type === "rating" && typeof respuesta.processed === "number") {
            respuestaFormateada = respuesta.processed.toString()
          } else {
            respuestaFormateada = respuesta.raw
          }
        } else {
          respuestaFormateada = JSON.stringify(respuesta)
        }
      } else {
        respuestaFormateada = respuesta
      }

      summaryText += `Pregunta ${index + 1}: ${question.text}. Tu respuesta: ${respuestaFormateada}. `
    })

    summaryText += "¿Deseas enviar estas respuestas o volver para revisar alguna?"

    speakText(summaryText, null)
  }

  // Escuchar la confirmación del usuario - activada por botón
  const listenForConfirmation = () => {
    if (!voiceEnabled) return

    // Iniciar escucha directamente
    setConversationState("waiting")
    setConversationMessage("Esperando confirmación...")

    audioService.init("es-ES")

    audioService.onResult((transcript, isFinal) => {
      // Mostrar lo que está diciendo el usuario en tiempo real
      setCurrentResponse(transcript)
      setConversationMessage(isFinal ? "Procesando tu respuesta..." : `Escuchando: ${transcript}`)
    })

    audioService.onEnd((finalTranscript) => {
      setIsListening(false)
      setConversationState("processing")
      setConversationMessage("Analizando respuesta...")

      // Analizar respuesta
      setTimeout(() => {
        try {
          // Utilizar el servicio NLP para analizar respuesta
          const result = analyzeIntent(finalTranscript.toLowerCase())

          // Usar el resultado del análisis NLP para determinar la intención
          // Comprobar si la intención es afirmativa
          const isAffirmative =
            result.intent === "afirmacion" ||
            finalTranscript.toLowerCase().includes("sí") ||
            finalTranscript.toLowerCase().includes("si") ||
            finalTranscript.toLowerCase().includes("confirmar") ||
            finalTranscript.toLowerCase().includes("enviar")

          // Comprobar si la intención es negativa
          const isNegative =
            result.intent === "negacion" ||
            finalTranscript.toLowerCase().includes("no") ||
            finalTranscript.toLowerCase().includes("revisar") ||
            finalTranscript.toLowerCase().includes("volver")

          if (isAffirmative) {
            // Confirmado - enviar respuestas
            setConversationState("confirmed")
            setConversationMessage("Confirmado. Enviando respuestas...")

            speakText("Perfecto, estoy enviando tus respuestas ahora.", () => {
              handleSubmit()
            })
          } else if (isNegative) {
            // Volver a revisar
            setConversationState("reviewing")
            setConversationMessage("Volviendo a revisar las preguntas...")

            setShowConfirmation(false)
            speakText("De acuerdo, volvamos a revisar las preguntas.", null)
          } else {
            // Respuesta no clara
            setConversationState("unclear")
            setConversationMessage("No entendí tu respuesta, intenta de nuevo o usa los botones")
          }
        } catch (error) {
          // Fallback simple en caso de error
          const lowerResponse = finalTranscript.toLowerCase()

          if (
            lowerResponse.includes("sí") ||
            lowerResponse.includes("si") ||
            lowerResponse.includes("confirmar") ||
            lowerResponse.includes("enviar")
          ) {
            speakText("Perfecto, enviando tus respuestas.", () => {
              handleSubmit()
            })
          } else if (lowerResponse.includes("no") || lowerResponse.includes("revisar")) {
            setShowConfirmation(false)
            speakText("De acuerdo, volvamos a revisar las preguntas.", null)
          } else {
            setConversationMessage("No entendí tu respuesta, intenta de nuevo o usa los botones")
          }
        }
      }, 100)
    })

    audioService.onError((errorMessage) => {
      setIsListening(false)
      setConversationState("error")
      setConversationMessage(`Error al escuchar: ${errorMessage}`)
    })

    // Iniciar el reconocimiento de voz
    audioService.start()
    setIsListening(true)
    setConversationState("listening")
    setConversationMessage("Escuchando tu confirmación...")

    // Reproducir un sonido para indicar que está listo
    try {
      const beep = new Audio("/assets/sounds/listen-beep.mp3")
      beep.volume = 0.9
      beep.play()
    } catch (error) {
      // No se pudo reproducir el sonido de inicio de escucha
    }
  }

  // Enviar todas las respuestas
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      // Preparar objeto de respuesta
      const responseData = {
        surveyId: survey._id,
        respondentName: respondentName || "Anónimo",
        userAgent: navigator.userAgent,
        answers: survey.questions.map((question, index) => {
          // Obtener la respuesta correspondiente
          const response = responses[index]

          // Preparar el valor final de la respuesta
          let finalValue = ""

          // Si la respuesta existe y tiene formato procesado
          if (response && typeof response === "object") {
            // Determinar el valor final según el tipo de pregunta
            if (question.type === "open") {
              // Para preguntas abiertas, usar el texto original
              finalValue = response.raw || ""
            } else if (question.type === "single" && response.processed && response.processed.selected) {
              // Para selección única, usar la opción seleccionada
              finalValue = response.processed.selected
            } else if (question.type === "multiple" && Array.isArray(response.processed)) {
              // Para selección múltiple, eliminar duplicados y juntar las opciones seleccionadas
              const uniqueSelections = [...new Set(response.processed.map((item) => item.selected))].filter(Boolean)
              finalValue = uniqueSelections.join(", ")
            } else if (question.type === "yesno") {
              // Para sí/no, enviar true/false o sí/no
              finalValue = response.processed === true ? "Sí" : "No"
            } else if (question.type === "rating" && typeof response.processed === "number") {
              // Para valoraciones, enviar el número
              finalValue = response.processed.toString()
            } else {
              // Si no hay formato especial, usar la respuesta original
              finalValue = response.raw || ""
            }
          }
          // Si la respuesta es un string directo (para compatibilidad con formato anterior)
          else if (typeof response === "string") {
            finalValue = response
          }

          return {
            questionId: question._id,
            value: finalValue,
          }
        }),
      }

      // Enviar respuesta a la API
      await ResponseService.submitResponse(responseData)

      // Lista de frases de despedida
      const farewellPhrases = [
        "Bueno, hasta aquí llegamos, ¡gracias por participar!",
        "Eso es todo por hoy, nos vemos en la próxima.",
        "Listo, cerramos con broche de oro. ¡Chau!",
        "Se acabó la función, ¡hasta luego!",
        "Y así concluye, ¡cuídense mucho!",
        "Nos leemos pronto, ¡un abrazo!",
        "Hasta aquí nuestro rato, ¡feliz día!",
        "Cerramos por hoy, ¡hasta la próxima!",
        "Me despido, ¡que les vaya genial!",
        "Listo, esto fue todo. ¡Adiós!",
        "Terminamos, ¡gracias y hasta luego!",
        "Bueno, esto es todo. ¡Nos vemos!",
        "Con esto cerramos, ¡hasta pronto!",
        "Gracias por acompañar, ¡hasta la próxima!",
        "Así concluye el show, ¡adiós!",
        "Nos vemos en la siguiente, ¡cuídense!",
        "Cerramos transmisión, ¡hasta luego!",
        "Eso fue todo, ¡gracias y chau!",
        "Se terminó el episodio, ¡nos vemos!",
        "Hasta aquí llegamos, ¡buenas vibras!",
        "Listo, desconectando… ¡hasta pronto!",
        "Me despido ya, ¡éxitos!",
        "Cierro esto, ¡un saludo a todos!",
        "Eso es todo, ¡nos vemos pronto!",
        "Fin de la charla, ¡gracias!",
        "Hasta la próxima ronda, ¡adiós!",
        "Cerramos aquí, ¡buenas!",
        "Chau chau, ¡hasta luego!",
        "Listo, ¡nos vemos en la próxima!",
      ]
      // Función para obtener una frase de despedida aleatoria
      const getRandomFarewellPhrase = () => {
        const randomIndex = Math.floor(Math.random() * farewellPhrases.length)
        return farewellPhrases[randomIndex]
      }

      const randomFarewell = getRandomFarewellPhrase()
      setCurrentFarewellPhrase(randomFarewell)

      // Mensaje de despedida
      if (voiceEnabled) {
        speakText(randomFarewell, () => {
          // Redirigir a página de agradecimiento
          navigate(`/thank-you`, {
            state: {
              message: survey.farewell || "¡Gracias por completar la encuesta!",
            },
          })
        })
      } else {
        // Redirigir a página de agradecimiento sin hablar
        navigate(`/thank-you`, {
          state: {
            message: survey.farewell || "¡Gracias por completar la encuesta!",
          },
        })
      }
    } catch (error) {
      setError("Ocurrió un error al enviar tus respuestas. Por favor, intenta nuevamente.")
      setIsSubmitting(false)

      if (voiceEnabled) {
        speakText("Ha ocurrido un error al enviar tus respuestas. Por favor, intenta nuevamente.", null)
      }
    }
  }

  // Renderizar pantalla de carga
  if (loading) {
    return <LoadingSpinner />
  }

  // Renderizar mensaje de error
  if (error) {
    return <ErrorMessage message={error} />
  }

  // Si no hay encuesta
  if (!survey) {
    return <ErrorMessage message="No se encontró la encuesta solicitada." />
  }

  // Obtener la pregunta actual
  const currentQuestion = survey.questions[currentQuestionIndex]

  return (
    <div className="max-w-3xl mx-auto p-4 relative">
      {/* Elementos decorativos */}
      <div className="absolute -top-16 -left-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>
      <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-red-800 rounded-full opacity-20"></div>

      {/* Barra superior decorativa */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

      {/* Estado de la conversación - Estilizado */}
      <div className="mb-6 p-5 rounded-lg shadow-md text-center bg-white border border-red-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

        <h2 className="text-xl font-bold mb-3 text-red-900">{survey.title}</h2>
        <p className="text-sm mb-4 text-gray-700">{survey.description}</p>

        {respondentName && (
          <div className="mb-3 bg-red-50 py-2 px-4 rounded-md inline-block">
            <p className="text-sm font-semibold text-red-800">
              <span className="mr-2">👤</span>
              {respondentName}
            </p>
          </div>
        )}

        {/* Controles de voz - Estilizados */}
        <div className="mb-4 flex flex-wrap justify-center gap-3">
          {micPermission === "unknown" ? (
            <button
              onClick={requestMicrophonePermission}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-md shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              <span className="flex items-center">
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Permitir micrófono para continuar
              </span>
            </button>
          ) : micPermission === "denied" ? (
            <p className="text-red-600 mb-2 bg-red-50 p-2 rounded-md border border-red-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline mr-1"
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
              Se necesita acceso al micrófono para usar la función de voz.
            </p>
          ) : (
            <>
              <button
                onClick={isListening ? stopListening : startListening}
                className={`px-4 py-2 ${
                  isListening
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900"
                } text-white rounded-md shadow-md transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-70`}
                disabled={conversationState === "speaking"}
              >
                <span className="flex items-center">
                  {isListening ? (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 mr-2 animate-pulse"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Detener escucha
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
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                      </svg>
                      Registrar respuesta
                    </>
                  )}
                </span>
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`px-4 py-2 ${
                  voiceEnabled ? "bg-red-800 hover:bg-red-900" : "bg-gray-400 hover:bg-gray-500"
                } text-white rounded-md shadow-md transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50`}
              >
                <span className="flex items-center">
                  {voiceEnabled ? (
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
                          d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                          clipRule="evenodd"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                        />
                      </svg>
                      Desactivar voz
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
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                      </svg>
                      Activar voz
                    </>
                  )}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="flex justify-center items-center">
          <div className="h-1 bg-red-200 flex-grow max-w-xs rounded-full"></div>
          <p className="font-semibold mx-3 text-red-900">
            {!nameCollectionComplete
              ? "Recolección de datos"
              : showConfirmation
                ? "Confirmación de respuestas"
                : `Pregunta ${currentQuestionIndex + 1} de ${survey.questions.length}`}
          </p>
          <div className="h-1 bg-red-200 flex-grow max-w-xs rounded-full"></div>
        </div>

        {conversationState !== "idle" && (
          <div className="mt-3 py-2 px-4 bg-red-50 text-red-800 rounded-md border border-red-100 inline-block animate-pulse">
            <p className="flex items-center">
              {conversationState === "speaking" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
              {conversationState === "listening" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
              {conversationState === "processing" && (
                <svg
                  className="animate-spin h-4 w-4 mr-2"
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
              )}
              {conversationState === "error" && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2"
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
              )}
              {conversationMessage}
            </p>
          </div>
        )}
      </div>

      {/* Contenido principal (Nombre, Pregunta o Confirmación) - Estilizado */}
      {!nameCollectionComplete ? (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-900 flex items-center justify-center shadow-md">
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
          </div>

          <h3 className="text-xl font-bold mb-4 text-red-900 text-center">¿Cuál es tu nombre?</h3>

          {/* Respuesta actual - Estilizada */}
          <div
            className={`mt-4 p-4 ${
              isListening ? "bg-red-50 border border-red-200 animate-pulse" : "bg-gray-50 border border-gray-200"
            } rounded-md shadow-inner`}
          >
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 text-red-600"
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
              Tu nombre:
            </p>
            <p className="min-h-10 pl-6">
              {isListening ? (
                <span className="text-red-600 font-medium">{currentResponse || "Escuchando..."}</span>
              ) : (
                <span className={respondentName ? "text-red-800 font-medium" : "text-gray-500"}>
                  {respondentName || currentResponse || "(Sin respuesta)"}
                </span>
              )}
            </p>
          </div>

          {/* Botones para registrar nombre - Estilizados */}
          <div className="flex justify-between mt-6">
            <div></div> {/* Espacio vacío para mantener la disposición */}
            <button
              onClick={nameCollectionComplete ? startSurveyAfterName : goToNextQuestion}
              className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-md shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-70 flex items-center"
              disabled={isListening || conversationState === "speaking"}
            >
              Siguiente
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : showConfirmation ? (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-900 flex items-center justify-center shadow-md">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
          </div>

          <h3 className="text-xl font-bold mb-4 text-red-900 text-center">Resumen de respuestas</h3>

          <div className="max-h-60 overflow-y-auto mb-4 bg-red-50 rounded-lg p-4 border border-red-100 shadow-inner">
            {survey.questions.map((question, index) => (
              <div key={question._id} className="mb-3 pb-3 border-b border-red-200 last:border-b-0">
                <p className="font-medium text-red-900 flex items-start">
                  <span className="bg-red-800 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 flex-shrink-0 text-sm">
                    {index + 1}
                  </span>
                  {question.text}
                </p>
                <p className="pl-8 mt-1 text-gray-700">
                  {responses[index] ? (
                    <span className="text-red-800">{responses[index]}</span>
                  ) : (
                    <span className="text-gray-500 italic">(Sin respuesta)</span>
                  )}
                </p>
              </div>
            ))}
          </div>

          {/* Controles específicos para confirmación - Estilizados */}
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {isListening ? (
              <div className="w-full text-center">
                <p className="text-center text-red-700 animate-pulse bg-red-50 p-3 rounded-lg border border-red-100 mb-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 inline mr-2 animate-pulse"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Di "confirmar" para enviar o "revisar" para volver
                </p>
                <button
                  onClick={stopListening}
                  className="px-4 py-2 bg-red-600 text-white rounded-md shadow-md hover:bg-red-700 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Detener escucha
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={listenForConfirmation}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-md shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-70 flex items-center"
                  disabled={isSubmitting}
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
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Responder por voz
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false)
                    setConversationState("reviewing")
                    setConversationMessage("Revisando preguntas...")
                  }}
                  className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md shadow-sm hover:bg-red-50 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-70 flex items-center"
                  disabled={isSubmitting}
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
                      d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
                    />
                  </svg>
                  Revisar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-800 text-white rounded-md shadow-md hover:from-green-700 hover:to-green-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 disabled:opacity-70 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Enviando...
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirmar
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-red-100 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-900 flex items-center justify-center shadow-md">
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <div className="bg-red-800 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              {currentQuestionIndex + 1}
            </div>
            <h3 className="text-xl font-bold text-red-900">{currentQuestion.text}</h3>
          </div>

          {/* Opciones para preguntas de opción múltiple - Estilizadas */}
          {currentQuestion.type === "multiple_choice" && currentQuestion.options && (
            <div className="mb-5 bg-red-50 p-4 rounded-lg border border-red-100">
              <p className="text-sm text-red-800 font-medium mb-2 flex items-center">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Opciones disponibles:
              </p>
              <ul className="space-y-1 pl-7">
                {currentQuestion.options.map((option, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-gray-800">{option}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mostrar frase de transición si existe y estamos en la pregunta 2 o superior */}
          {currentQuestionIndex >= 1 && currentTransitionPhrase && (
            <div className="my-4 p-3 bg-red-50 border border-red-200 rounded-md shadow-inner">
              <p className="text-red-700 font-medium flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {currentTransitionPhrase}
              </p>
            </div>
          )}

          {/* Respuesta actual - Estilizada */}
          <div
            className={`mt-4 p-4 ${
              isListening ? "bg-red-50 border border-red-200 animate-pulse" : "bg-gray-50 border border-gray-200"
            } rounded-md shadow-inner`}
          >
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Tu respuesta:
            </p>
            <p className="min-h-10 pl-6">
              {isListening ? (
                <span className="text-red-600 font-medium">{currentResponse || "Escuchando..."}</span>
              ) : (
                <span className={currentResponse ? "text-red-800 font-medium" : "text-gray-500 italic"}>
                  {currentResponse || "(Sin respuesta)"}
                </span>
              )}
            </p>
          </div>

          {/* Botones de navegación - Estilizados */}
          <div className="flex justify-between mt-6">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-red-700 bg-white border border-red-300 rounded-md shadow-sm disabled:opacity-50 hover:bg-red-50 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Anterior
            </button>
            <button
              onClick={goToNextQuestion}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-md shadow-md hover:from-red-700 hover:to-red-900 transition-all transform hover:translate-y-[-2px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 flex items-center"
            >
              {currentQuestionIndex < survey.questions.length - 1 ? (
                <>
                  Siguiente
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              ) : (
                <>
                  Revisar respuestas
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 ml-1"
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
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior decorativa */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-white to-red-500"></div>
    </div>
  )
}

export default TakeSurvey
