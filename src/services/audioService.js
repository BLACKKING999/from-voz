/**
 * Servicio de audio mejorado para encuestas por voz
 * Implementa síntesis y reconocimiento de voz con temporizaciones naturales
 * y mejor detección de voz humana
 */

class AudioService {
  constructor() {
    // Variables de estado para síntesis de voz
    this.isSpeaking = false
    this.currentUtterance = null
    this.resumeInterval = null
    this.utteranceTimeoutId = null

    // Variables para reconocimiento de voz
    this.recognition = null
    this._isListening = false
    // No necesitamos inicializar isListening en el constructor
    // ya que ahora accederá directamente a _isListening
    this.recognitionLang = "es-ES"
    this.finalTranscript = ""
    this.interimTranscript = ""
    this.microphoneStream = null
    this.permissionGranted = false
    this.permissionCallback = null
    this.hasSpeechDetected = false
    this.hasSoundDetected = false

    // Callbacks
    this.onResultCallback = null
    this.onEndCallback = null
    this.onErrorCallback = null

    // Configuración mejorada para el reconocimiento de voz
    this.silenceThreshold = 5000 // Tiempo en ms para considerar silencio
    this.speakingTimeout = 60000 // Tiempo máximo de espera para una respuesta
    this.volumeThreshold = 5 // Umbral de volumen para detección de voz
    this.restartAttempts = 0 // Contador de intentos de reinicio
    this.maxRestartAttempts = 8 // Máximo número de reintentos
    this.silenceTimer = null // Timer para detectar silencio
    this.audioContext = null // Contexto de audio para análisis
    this.analyser = null // Analizador de audio
    this.audioData = null // Buffer para datos de audio
    this.volumeCheckInterval = null // Intervalo para comprobar volumen

    // Inicializar sistema al crear instancia
    this.initSpeechSystem()
  }

  // Agregar getter y setter para isListening
  get isListening() {
    return this._isListening || false
  }

  set isListening(value) {
    this._isListening = value
  }

  /**
   * Detecta si el usuario está en un dispositivo móvil
   * @returns {boolean} True si es un dispositivo móvil
   */
  isMobileDevice() {
    return (
      typeof navigator !== "undefined" &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    )
  }

  /**
   * Detecta específicamente si es un dispositivo Android
   * @returns {boolean} True si es un dispositivo Android
   */
  isAndroidDevice() {
    return typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)
  }

  /**
   * Inicializa el sistema de síntesis de voz
   * @returns {boolean} - true si se inició correctamente, false en caso contrario
   */
  initSpeechSystem() {
    try {
      // Verificar si la API está disponible
      if (typeof window === "undefined" || !window.speechSynthesis) {
        return false
      }

      // Aplicar configuración específica para dispositivos móviles
      if (this.isMobileDevice()) {
        this.silenceThreshold = 15000
        this.speakingTimeout = 60000

        if (this.isAndroidDevice()) {
          this.volumeThreshold = 2
        }
      }

      // Precalentar el sistema una vez durante la inicialización
      this.preloadSpeechSynthesis()

      return true
    } catch (error) {
      console.error("Error al inicializar el sistema de voz:", error)
      return false
    }
  }

  /**
   * Verifica si el sistema está actualmente hablando
   * @returns {boolean} - true si está hablando, false si no
   */
  checkIfSpeaking() {
    return typeof window !== "undefined" && window.speechSynthesis && window.speechSynthesis.speaking
  }

  /**
   * Detiene cualquier síntesis de voz en curso
   */
  cancelSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return

    try {
      // Cancelar cualquier síntesis en curso
      window.speechSynthesis.cancel()

      // Limpiar temporizadores
      if (this.resumeInterval) {
        clearInterval(this.resumeInterval)
        this.resumeInterval = null
      }

      if (this.utteranceTimeoutId) {
        clearTimeout(this.utteranceTimeoutId)
        this.utteranceTimeoutId = null
      }

      this.isSpeaking = false
      this.currentUtterance = null
    } catch (error) {
      console.error("Error al cancelar síntesis de voz:", error)
    }
  }

  /**
   * Utiliza la API de síntesis de voz para leer un texto
   * @param {string} text - Texto a leer
   * @param {Function} onStarted - Callback cuando inicia la síntesis
   * @param {Function} onEnded - Callback cuando termina la síntesis
   * @param {Function} onError - Callback en caso de error
   * @returns {Function} - Función para cancelar la síntesis
   */
  speakText(text, onStarted, onEnded, onError) {
    if (!text || text.trim() === "") {
      if (onError) onError("Texto vacío")
      return () => {}
    }

    if (typeof window === "undefined" || !window.speechSynthesis) {
      if (onError) onError("Speech Synthesis no está disponible en este navegador")
      return () => {}
    }

    // Si ya estamos hablando, cancelar primero (reducido a 200ms)
    if (this.isSpeaking) {
      this.cancelSpeech()

      setTimeout(() => {
        this.speakText(text, onStarted, onEnded, onError)
      }, 200)

      return () => {}
    }

    try {
      // Marcar que estamos hablando ahora
      this.isSpeaking = true

      // Crear el objeto de síntesis
      const utterance = new SpeechSynthesisUtterance(text)
      this.currentUtterance = utterance

      // Configurar parámetros básicos
      utterance.lang = "es-ES"
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Seleccionar una voz en español si está disponible
      if (window.speechSynthesis.getVoices) {
        const voices = window.speechSynthesis.getVoices()
        const spanishVoice = voices.find((voice) => voice.lang.includes("es") && !voice.name.includes("Google"))

        if (spanishVoice) {
          utterance.voice = spanishVoice
        }
      }

      // Configurar eventos
      utterance.onstart = () => {
        if (onStarted) onStarted()
      }

      utterance.onend = () => {
        this.isSpeaking = false

        // Limpiar temporizadores
        if (this.utteranceTimeoutId) {
          clearTimeout(this.utteranceTimeoutId)
          this.utteranceTimeoutId = null
        }

        // Llamar al callback inmediatamente sin pausa artificial
        if (onEnded) onEnded()
      }

      utterance.onerror = (event) => {
        this.isSpeaking = false

        // Limpiar temporizadores
        if (this.resumeInterval) {
          clearInterval(this.resumeInterval)
          this.resumeInterval = null
        }

        if (this.utteranceTimeoutId) {
          clearTimeout(this.utteranceTimeoutId)
          this.utteranceTimeoutId = null
        }

        if (onError) onError(event.error || "Error desconocido")
      }

      // Cancelar cualquier síntesis previa
      window.speechSynthesis.cancel()

      // Iniciar la síntesis inmediatamente sin retraso
      window.speechSynthesis.speak(utterance)

      // *** WORKAROUND CRÍTICO PARA CHROME ***
      // Soluciona el problema donde la síntesis se detiene después de 15 segundos
      this.resumeInterval = setInterval(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause()
          window.speechSynthesis.resume()
        } else {
          clearInterval(this.resumeInterval)
          this.resumeInterval = null
        }
      }, 10000)

      // Workaround para el caso donde onend no se dispara
      // Cálculo mejorado del tiempo máximo basado en la longitud del texto
      // Aproximadamente 100ms por carácter con un mínimo de 8 segundos
      const maxSpeakingTime = Math.max(8000, text.length * 100)
      this.utteranceTimeoutId = setTimeout(() => {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel()
          this.isSpeaking = false

          if (onEnded) onEnded()
        }

        if (this.resumeInterval) {
          clearInterval(this.resumeInterval)
          this.resumeInterval = null
        }
      }, maxSpeakingTime)

      return () => {
        this.cancelSpeech()
      }
    } catch (error) {
      this.isSpeaking = false
      if (onError) onError(error.message || "Error desconocido")
      return () => {}
    }
  }

  /**
   * Inicializa el reconocimiento de voz
   * @param {string} language - Idioma para el reconocimiento
   * @returns {boolean} - true si se inicializó correctamente, false en caso contrario
   */
  init(language = "es-ES") {
    try {
      // Si ya tenemos una instancia, detenerla primero
      this.stop()

      this.recognitionLang = language
      this.finalTranscript = ""
      this.interimTranscript = ""
      this.hasSpeechDetected = false
      this.hasSoundDetected = false

      // Crear reconocimiento según disponibilidad en navegador
      const SpeechRecognition =
        typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)

      if (!SpeechRecognition) {
        if (this.onErrorCallback) {
          this.onErrorCallback("API no soportada")
        }
        return false
      }

      this.recognition = new SpeechRecognition()

      // Configurar reconocimiento con opciones mejoradas
      this.recognition.continuous = true // Reconocimiento continuo para una mejor experiencia
      this.recognition.interimResults = true // Obtener resultados mientras el usuario habla
      this.recognition.maxAlternatives = 3 // Obtener más alternativas para mejorar precisión
      this.recognition.lang = language

      // Manejar resultados con análisis mejorado
      this.recognition.onresult = (event) => {
        // Procesar resultados
        this.interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            // Analizar todas las alternativas para escoger la mejor
            let bestAlternative = event.results[i][0].transcript
            let highestConfidence = event.results[i][0].confidence

            // Recorrer las alternativas para encontrar la de mayor confianza
            for (let j = 1; j < event.results[i].length; j++) {
              if (event.results[i][j].confidence > highestConfidence) {
                bestAlternative = event.results[i][j].transcript
                highestConfidence = event.results[i][j].confidence
              }
            }

            finalTranscript += bestAlternative
          } else {
            this.interimTranscript += event.results[i][0].transcript
          }
        }

        if (finalTranscript) {
          this.finalTranscript += " " + finalTranscript
          this.finalTranscript = this.finalTranscript.trim()
        }

        // Notificar resultados
        if (this.onResultCallback) {
          this.onResultCallback(this.finalTranscript, event.results[event.resultIndex].isFinal, this.interimTranscript)
        }
      }

      // Evento cuando termina el reconocimiento (mejorado)
      this.recognition.onend = () => {
        // Detener análisis de audio si está activo
        this.stopAudioAnalysis()

        const finalizeRecognition = () => {
          this._isListening = false
          this.hasSpeechDetected = false
          this.hasSoundDetected = false

          // Notificar finalización con el resultado completo
          if (this.onEndCallback) {
            this.onEndCallback(this.finalTranscript)
          }

          // Resetear intentos de reinicio
          this.restartAttempts = 0
        }

        // Si estábamos escuchando activamente y hay un temporizador de silencio
        // o si se detectó voz, esperamos un poco más antes de finalizar
        if ((this._isListening && this.silenceTimer) || this.hasSpeechDetected) {
          // Esperar un poco más antes de considerar realmente finalizado
          // para capturar posibles fragmentos finales
          setTimeout(finalizeRecognition, 1000)
        } else {
          finalizeRecognition()
        }
      }

      this.recognition.onerror = (event) => {
        // No marcar como no escuchando inmediatamente para ciertos errores
        if (event.error !== "no-speech" && event.error !== "audio-capture") {
          this._isListening = false
        }

        // Manejo de errores mejorado
        if (event.error === "no-speech") {
          // Para errores de no-speech, intentamos reiniciar si estamos dentro del límite de intentos
          if (this.restartAttempts < this.maxRestartAttempts) {
            this.restartAttempts++

            if (this.onErrorCallback) {
              this.onErrorCallback("waiting")
            }

            // Intentar reiniciar tras un breve retraso
            setTimeout(() => {
              if (!this._isListening) {
                // Solo si no estamos escuchando activamente
                try {
                  this.startRecognition()
                } catch (e) {
                  if (this.onErrorCallback) {
                    this.onErrorCallback("error_restart")
                  }
                }
              }
            }, 1500) // 1.5s para dar más tiempo
          } else {
            if (this.onErrorCallback) {
              this.onErrorCallback("max_restarts")
            }
          }
        } else if (this.onErrorCallback) {
          // Para otros errores, enviamos el mensaje original
          this.onErrorCallback(event.error)
        }
      }

      this.recognition.onnomatch = () => {
        // Considerar reiniciar el reconocimiento
        if (this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++

          setTimeout(() => {
            try {
              this.startRecognition()
            } catch (e) {
              // Error silencioso
            }
          }, 1000)
        }
      }

      this.recognition.onaudiostart = () => {
        // Iniciar análisis de audio si es posible
        this.setupAudioAnalysis()
      }

      this.recognition.onsoundstart = () => {
        this.hasSoundDetected = true
        console.log("Some sound is being detected")
      }

      this.recognition.onsoundend = () => {
        console.log("Sound has stopped being detected")
      }

      this.recognition.onspeechstart = () => {
        this.hasSpeechDetected = true
        this.resetSilenceTimer() // Reiniciar el temporizador de silencio
        console.log("Speech has been detected")
      }

      this.recognition.onspeechend = () => {
        console.log("Speech has stopped being detected")
        // Iniciar un temporizador para permitir pausas naturales en el habla
        // sin detener prematuramente el reconocimiento
        this.resetSilenceTimer(true)
      }

      this.recognition.onaudioend = () => {
        console.log("Audio capturing ended")
      }

      this.recognition.onstart = () => {
        console.log("Recognition service has started")
      }

      return true
    } catch (error) {
      console.error("Error al inicializar reconocimiento de voz:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback("Error al inicializar: " + error.message)
      }
      return false
    }
  }

  /**
   * Configura el análisis de audio para mejor detección de voz
   */
  setupAudioAnalysis() {
    // Solo configurar si tenemos acceso al stream
    if (!this.microphoneStream) return

    try {
      // Crear contexto de audio si no existe
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return

        this.audioContext = new AudioContext()
      }

      // Crear analizador de audio
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8 // Suavizado para reducir fluctuaciones

      // Conectar el stream de micrófono al analizador
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream)
      source.connect(this.analyser)

      // Preparar buffer para datos
      this.audioData = new Uint8Array(this.analyser.frequencyBinCount)

      // Iniciar monitoreo de volumen
      this.startVolumeMonitoring()
    } catch (error) {
      console.error("Error al configurar análisis de audio:", error)
    }
  }

  /**
   * Inicia el monitoreo de volumen para mejor detección de voz
   */
  startVolumeMonitoring() {
    // Detener monitoreo previo si existe
    this.stopVolumeMonitoring()

    // Contadores para mejorar la precisión de detección
    let consecutiveSilenceFrames = 0
    let consecutiveVoiceFrames = 0

    // Iniciar nuevo intervalo de monitoreo
    this.volumeCheckInterval = setInterval(() => {
      if (!this.analyser || !this.audioData) return

      try {
        // Obtener datos de frecuencia actual
        this.analyser.getByteFrequencyData(this.audioData)

        // Calcular volumen promedio con enfoque mejorado
        // Centrarse en las frecuencias de voz humana (aproximadamente 300-3000 Hz)
        let sum = 0
        let count = 0

        // El rango exacto depende de fftSize y sampleRate
        // Este es un aproximado genérico
        const lowerIndex = Math.floor(this.audioData.length / 8) // ~300Hz
        const upperIndex = Math.floor(this.audioData.length / 2.5) // ~3000Hz

        for (let i = lowerIndex; i < upperIndex && i < this.audioData.length; i++) {
          sum += this.audioData[i]
          count++
        }

        const averageVolume = count > 0 ? sum / count : 0

        // Umbral de detección de voz ajustado
        if (averageVolume > this.volumeThreshold) {
          consecutiveVoiceFrames++
          consecutiveSilenceFrames = 0

          // Necesitamos al menos 3 frames consecutivos con voz para confirmar
          if (consecutiveVoiceFrames >= 3) {
            // Se detectó voz, resetear temporizador de silencio
            this.hasSpeechDetected = true
            this.resetSilenceTimer()
          }
        } else {
          consecutiveSilenceFrames++
          consecutiveVoiceFrames = 0
        }
      } catch (error) {
        console.error("Error en monitoreo de volumen:", error)
      }
    }, 100) // Comprobar cada 100ms para mayor precisión
  }

  /**
   * Detiene el monitoreo de volumen
   */
  stopVolumeMonitoring() {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval)
      this.volumeCheckInterval = null
    }
  }

  /**
   * Detiene el análisis de audio
   */
  stopAudioAnalysis() {
    this.stopVolumeMonitoring()

    // No cerrar el AudioContext aquí, solo desconectar el analizador
    // El AudioContext se cerrará solo en el método dispose()
    if (this.audioContext && this.analyser) {
      try {
        // Desconectar el analizador si existe
        this.analyser.disconnect()
      } catch (error) {
        console.warn("Error al desconectar el analizador:", error)
      }
    }

    this.audioData = null
  }

  /**
   * Reinicia el temporizador de silencio
   * @param {boolean} isSpeechEnd - Indica si se llama desde el evento speechend
   */
  resetSilenceTimer(isSpeechEnd = false) {
    // Limpiar temporizador existente
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }

    // Si se detectó el final del habla, usar un umbral más largo
    // para dar más tiempo a pausas naturales
    const threshold = isSpeechEnd
      ? this.silenceThreshold * 1.5
      : // 50% más tiempo después de detectar final de habla
        this.silenceThreshold

    // Configurar nuevo temporizador
    this.silenceTimer = setTimeout(() => {
      // Verificar si realmente ha habido silencio prolongado antes de detener
      if (this._isListening && !this.hasSpeechDetected) {
        console.log("Silencio prolongado detectado, deteniendo reconocimiento")
        this.stop()
      } else if (this._isListening && this.hasSpeechDetected && !this.finalTranscript) {
        // Se detectó habla pero no tenemos resultados finales aún
        // Dar tiempo adicional antes de detener
        console.log("Extendiendo tiempo de escucha después de detectar voz")
        setTimeout(() => {
          if (this._isListening) {
            this.stop()
          }
        }, 2000)
      }
    }, threshold)
  }

  /**
   * Método interno para iniciar el reconocimiento (usado para reintentos)
   * @returns {boolean} - true si se inició correctamente, false en caso contrario
   */
  startRecognition() {
    if (!this.recognition) return false

    try {
      // Reiniciar indicadores de detección de sonido y habla
      this.hasSpeechDetected = false
      this.hasSoundDetected = false

      // Iniciar el reconocimiento
      this.recognition.start()
      this._isListening = true

      // Iniciar temporizador de silencio
      this.resetSilenceTimer()

      // Configurar temporizador de tiempo máximo de espera
      // con verificación inteligente de actividad
      setTimeout(() => {
        if (this._isListening) {
          // Verificar si hay actividad o si se ha detectado voz
          if (!this.finalTranscript && !this.interimTranscript && !this.hasSpeechDetected) {
            console.log("Tiempo máximo de espera alcanzado sin actividad vocal detectada")
            this.stop()
          } else if (this.hasSpeechDetected && !this.finalTranscript) {
            // Se detectó habla pero aún no hay resultados finales
            // Extender el tiempo para permitir completar el reconocimiento
            console.log("Extendiendo tiempo de espera porque se detectó voz")
            setTimeout(() => {
              if (this._isListening && !this.finalTranscript) {
                console.log("Finalizando después de la extensión de tiempo")
                this.stop()
              }
            }, this.speakingTimeout / 2) // Mitad del tiempo original como extensión
          }
        }
      }, this.speakingTimeout)

      return true
    } catch (error) {
      console.error("Error al iniciar reconocimiento:", error)
      this._isListening = false
      return false
    }
  }

  /**
   * Solicita permiso para usar el micrófono con opciones mejoradas
   * @returns {Promise<boolean>} - Promise que resuelve a true si se otorgó permiso, false en caso contrario
   */
  async requestMicrophonePermission() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (this.permissionCallback) {
        this.permissionCallback(false, "API no soportada")
      }
      return false
    }

    try {
      // Solicitar acceso al micrófono con configuración óptima para reconocimiento de voz
      const constraints = {
        audio: {
          echoCancellation: true, // Eliminar eco
          noiseSuppression: true, // Suprimir ruido de fondo
          autoGainControl: true, // Ajustar volumen automáticamente
          channelCount: 1, // Mono para mejor reconocimiento de voz
          sampleRate: 48000, // Alta calidad de muestreo
          sampleSize: 16, // 16 bits por muestra para mejor calidad
        },
      }

      // En dispositivos móviles, ajustar configuración
      if (this.isMobileDevice()) {
        constraints.audio.echoCancellation = this.isAndroidDevice() ? true : false
        constraints.audio.noiseSuppression = this.isAndroidDevice() ? true : false
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      // Almacenar la referencia al stream para poder detenerlo después
      this.microphoneStream = stream
      this.permissionGranted = true

      // Notificar que el permiso fue concedido si hay un callback
      if (this.permissionCallback) {
        this.permissionCallback(true)
      }

      return true
    } catch (error) {
      this.permissionGranted = false
      // Notificar que el permiso fue denegado si hay un callback
      if (this.permissionCallback) {
        this.permissionCallback(false, error.message)
      }

      return false
    }
  }

  /**
   * Establece el callback para cuando cambia el estado del permiso del micrófono
   * @param {Function} callback - Función a llamar cuando cambia el estado del permiso
   */
  onPermissionChange(callback) {
    this.permissionCallback = callback
  }

  /**
   * Configura los tiempos de espera para el reconocimiento de voz
   * @param {Object} options - Opciones de configuración
   * @param {number} options.silenceThreshold - Tiempo en ms para considerar silencio (por defecto 3000ms)
   * @param {number} options.speakingTimeout - Tiempo máximo de espera para una respuesta (por defecto 8000ms)
   */
  configureTimings(options = {}) {
    if (options.silenceThreshold && typeof options.silenceThreshold === "number") {
      this.silenceThreshold = options.silenceThreshold
    }

    if (options.speakingTimeout && typeof options.speakingTimeout === "number") {
      this.speakingTimeout = options.speakingTimeout
    }
  }

  /**
   * Inicia el reconocimiento de voz, solicitando permisos si es necesario
   * @param {Object} options - Opciones opcionales para la configuración
   * @returns {Promise<boolean>} - Promise que resuelve a true si se inició correctamente
   */
  async start(options = {}) {
    try {
      // Actualizar configuración si se proporcionan opciones
      if (options.silenceThreshold || options.speakingTimeout) {
        this.configureTimings(options)
      }

      // Detener cualquier reconocimiento previo primero
      this.stop()

      // Pequeña pausa para asegurar que el reconocimiento anterior se detuvo correctamente
      await new Promise((resolve) => setTimeout(resolve, 700))

      // Verificar y solicitar permiso si no ha sido otorgado
      if (!this.permissionGranted) {
        const permissionGranted = await this.requestMicrophonePermission()
        if (!permissionGranted) {
          if (this.onErrorCallback) {
            this.onErrorCallback("No se otorgó permiso para usar el micrófono")
          }
          return false
        }
      }

      if (!this.recognition) {
        const initialized = this.init(options.language || this.recognitionLang)
        if (!initialized) return false
      }

      // Reiniciar transcripciones
      this.finalTranscript = ""
      this.interimTranscript = ""

      // Resetear contador de intentos
      this.restartAttempts = 0

      return this.startRecognition()
    } catch (error) {
      console.error("Error al iniciar reconocimiento de voz:", error)
      if (this.onErrorCallback) {
        this.onErrorCallback("Error al iniciar: " + error.message)
      }
      return false
    }
  }

  /**
   * Detiene el reconocimiento de voz
   * @returns {boolean} - true si se detuvo correctamente, false en caso contrario
   */
  stop() {
    try {
      // Limpiar temporizador de silencio
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer)
        this.silenceTimer = null
      }

      // Detener análisis de audio
      this.stopAudioAnalysis()

      if (this.recognition && this._isListening) {
        try {
          this.recognition.stop()
          this._isListening = false

          // También detener el stream del micrófono si existe
          if (this.microphoneStream) {
            this.microphoneStream.getTracks().forEach((track) => track.stop())
          }

          return true
        } catch (error) {
          console.error("Error al detener reconocimiento:", error)
          this._isListening = false
          return false
        }
      }
      return false
    } catch (error) {
      console.error("Error al detener reconocimiento de voz:", error)
      this._isListening = false
      return false
    }
  }

  /**
   * Establece el callback para cuando se recibe un resultado
   * @param {Function} callback - Función a llamar con el resultado
   */
  onResult(callback) {
    this.onResultCallback = callback
  }

  /**
   * Establece el callback para cuando termina el reconocimiento
   * @param {Function} callback - Función a llamar al terminar
   */
  onEnd(callback) {
    this.onEndCallback = callback
  }

  /**
   * Establece el callback para cuando ocurre un error
   * @param {Function} callback - Función a llamar en caso de error
   */
  onError(callback) {
    this.onErrorCallback = callback
  }

  /**
   * Verifica si el navegador soporta reconocimiento de voz
   * @returns {boolean} - true si es soportado, false si no
   */
  isSupportedByBrowser() {
    return typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
  }

  /**
   * Devuelve información sobre las capacidades de reconocimiento de voz
   * @returns {Object} - Objeto con información de capacidades
   */
  getRecognitionCapabilities() {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return { isSupported: false }
    }

    return {
      isSupported: this.isSupportedByBrowser(),
      isMobile: this.isMobileDevice(),
      isAndroid: this.isAndroidDevice(),
      browser: navigator.userAgent,
      usesWebkit: "webkitSpeechRecognition" in window,
      usesStandard: "SpeechRecognition" in window,
      audioContext: typeof window.AudioContext !== "undefined" || typeof window.webkitAudioContext !== "undefined",
      mediaDevices: !!navigator.mediaDevices,
    }
  }

  /**
   * Ajusta la sensibilidad del reconocimiento de voz
   * @param {Object} options - Opciones de sensibilidad
   * @param {string} options.preset - Preset de sensibilidad ('high', 'medium', 'low', 'veryLow')
   * @param {number} options.silenceThreshold - Tiempo en ms para considerar silencio (3000-30000)
   * @param {number} options.speakingTimeout - Tiempo máximo de espera para una respuesta (5000-60000)
   * @returns {Object} - Configuración aplicada
   */
  setSensitivity(options = {}) {
    // Valores predefinidos para diferentes sensibilidades
    const sensitivities = {
      high: { silenceThreshold: 3000, speakingTimeout: 15000, volumeThreshold: 3 },
      medium: { silenceThreshold: 5000, speakingTimeout: 30000, volumeThreshold: 5 },
      low: { silenceThreshold: 10000, speakingTimeout: 45000, volumeThreshold: 7 },
      veryLow: { silenceThreshold: 15000, speakingTimeout: 60000, volumeThreshold: 10 },
    }

    let config = { ...sensitivities.medium } // Valor por defecto

    // Si se proporciona un preset de sensibilidad
    if (options.preset && sensitivities[options.preset]) {
      config = { ...sensitivities[options.preset] }
    }

    // Sobrescribir con valores específicos si se proporcionan
    if (options.silenceThreshold) config.silenceThreshold = options.silenceThreshold
    if (options.speakingTimeout) config.speakingTimeout = options.speakingTimeout
    if (options.volumeThreshold) config.volumeThreshold = options.volumeThreshold

    // Aplicar configuración
    this.silenceThreshold = config.silenceThreshold
    this.speakingTimeout = config.speakingTimeout
    this.volumeThreshold = config.volumeThreshold

    return config
  }

  /**
   * Configura timing específico para distintos dispositivos
   * @param {Object} config - Configuración de tiempos
   */
  setTimingConfig(config) {
    if (!config) return

    if (config.silenceThreshold) this.silenceThreshold = config.silenceThreshold
    if (config.speakingTimeout) this.speakingTimeout = config.speakingTimeout
    if (config.volumeThreshold) this.volumeThreshold = config.volumeThreshold
  }

  /**
   * Activa modo específico para Android y dispositivos móviles
   * @param {boolean} isActive - Si activar o no el modo móvil
   */
  setMobileMode(isActive) {
    if (isActive) {
      // Configuración optimizada para dispositivos móviles
      this.silenceThreshold = 7000 // Tiempo más largo para móviles
      this.volumeThreshold = 3 // Umbral más bajo para mayor sensibilidad

      if (this.recognition) {
        // Ajustes específicos para reconocimiento en móviles
        this.recognition.maxAlternatives = 2 // Menos alternativas para ahorrar recursos
        this.recognition.interimResults = true // Mantener resultados intermedios para mejor UX
      }

      // Si es Android, aplicar ajustes específicos
      if (this.isAndroidDevice()) {
        this.silenceThreshold = 8000 // Android necesita más tiempo por latencia
        this.volumeThreshold = 2 // Android tiene sensibilidad diferente
      }
    } else {
      // Configuración para escritorio
      this.silenceThreshold = 5000 // Valor por defecto
      this.volumeThreshold = 4 // Valor por defecto

      if (this.recognition) {
        this.recognition.maxAlternatives = 3 // Más alternativas en escritorio
      }
    }
  }

  /**
   * Método auxiliar para precalentar el sistema de síntesis de voz
   * @returns {boolean} - true si se pudo precalentar, false en caso contrario
   */
  preloadSpeechSynthesis() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return false
    }

    try {
      // Crear un mensaje mínimo para activar el sistema
      const warmupUtterance = new SpeechSynthesisUtterance(" ")
      warmupUtterance.volume = 0 // Silenciar
      window.speechSynthesis.speak(warmupUtterance)
      window.speechSynthesis.cancel() // Cancelar inmediatamente

      // Precarga de voces para mejorar la primera síntesis
      if (window.speechSynthesis.getVoices && window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Las voces están cargadas
          window.speechSynthesis.onvoiceschanged = null
        }
      }

      return true
    } catch (error) {
      console.error("Error al precalentar síntesis de voz:", error)
      return false
    }
  }

  /**
   * Método auxiliar para la primera síntesis
   * @param {string} text - Texto a leer
   * @param {Function} onStarted - Callback cuando inicia la síntesis
   * @param {Function} onEnded - Callback cuando termina la síntesis
   * @param {Function} onError - Callback en caso de error
   */
  firstSpeech(text, onStarted, onEnded, onError) {
    this.preloadSpeechSynthesis()
    // Hablar inmediatamente sin espera
    this.speakText(text, onStarted, onEnded, onError)
  }

  /**
   * Libera recursos cuando el servicio ya no se necesita
   */
  dispose() {
    this.stop()
    this.cancelSpeech()

    // Limpiar todos los temporizadores e intervalos
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer)
      this.silenceTimer = null
    }

    if (this.utteranceTimeoutId) {
      clearTimeout(this.utteranceTimeoutId)
      this.utteranceTimeoutId = null
    }

    if (this.resumeInterval) {
      clearInterval(this.resumeInterval)
      this.resumeInterval = null
    }

    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval)
      this.volumeCheckInterval = null
    }

    // Cerrar contexto de audio
    if (this.audioContext) {
      try {
        // Verificar si el contexto no está ya cerrado antes de intentar cerrarlo
        if (this.audioContext.state !== "closed" && typeof this.audioContext.close === "function") {
          this.audioContext.close()
        }
      } catch (error) {
        console.warn("Error al cerrar AudioContext:", error)
      }
    }

    // Eliminar referencias
    this.recognition = null
    this.analyser = null
    this.audioData = null
    this.audioContext = null
    this.microphoneStream = null
    this.currentUtterance = null

    // Eliminar callbacks
    this.onResultCallback = null
    this.onEndCallback = null
    this.onErrorCallback = null
    this.permissionCallback = null
  }
}

// Exportar una instancia única del servicio
const audioService = new AudioService()
export default audioService
