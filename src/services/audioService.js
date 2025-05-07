/**
 * Servicio de audio mejorado para encuestas por voz
 * Implementa síntesis y reconocimiento de voz con temporizaciones naturales
 * y mejor detección de voz humana
 */

class AudioService {
  constructor() {
    // Variables de estado para síntesis de voz
    this.cachedVoices = null;
    this.isSpeaking = false;
    this.currentUtterance = null;
    this.resumeInterval = null;
    this.utteranceTimeoutId = null;
    
    // Variables para reconocimiento de voz
    this.recognition = null;
    this.isListening = false;
    this.recognitionLang = 'es-ES';
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.microphoneStream = null;
    this.permissionGranted = false;
    this.permissionCallback = null;
    
    // Configuración mejorada para el reconocimiento de voz
    this.silenceThreshold = 15000; // Tiempo en ms para considerar silencio
    this.speakingTimeout = 30000;  // Tiempo en ms para esperar respuesta
    this.restartAttempts = 0;     // Contador de intentos de reinicio
    this.maxRestartAttempts = 3;  // Máximo número de reintentos
    this.silenceTimer = null;     // Timer para detectar silencio
    this.audioContext = null;     // Contexto de audio para análisis
    this.analyser = null;         // Analizador de audio
    this.audioData = null;        // Buffer para datos de audio
    this.volumeCheckInterval = null; // Intervalo para comprobar volumen
    
    // Inicializar sistema al crear instancia
    this.initSpeechSystem();
  }
  
  /**
   * Inicializa el sistema de síntesis y precarga las voces
   */
  initSpeechSystem() {
    // Verificar si la API está disponible
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.error('AudioService: Speech Synthesis no está disponible en este navegador');
      return false;
    }
  
    // Obtener y cachear las voces disponibles
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.cachedVoices = voices;
        
       
        // Buscar voces en español
        const spanishVoices = voices.filter(v => 
          v.lang.includes('es') || 
          v.name.toLowerCase().includes('spanish')
        );
        
        if (spanishVoices.length > 0) {
          console.log('AudioService: Voces en español disponibles:', 
            spanishVoices.map(v => `${v.name} (${v.lang})`).join(', ')
          );
        } else {
          console.warn('AudioService: No se encontraron voces en español');
        }
      }
    };
  
    // Chrome requiere este evento
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  
    // Intentar cargar las voces inmediatamente también
    loadVoices();
  
    return true;
  }

  /**
   * Verifica si el sistema está actualmente hablando
   */
  checkIfSpeaking() {
    return window.speechSynthesis && window.speechSynthesis.speaking;
  }

  /**
   * Detiene cualquier síntesis de voz en curso
   */
  cancelSpeech() {
    if (!window.speechSynthesis) return;
    
    // Cancelar cualquier síntesis en curso
    window.speechSynthesis.cancel();
    
    // Limpiar temporizadores
    if (this.resumeInterval) {
      clearInterval(this.resumeInterval);
      this.resumeInterval = null;
    }
    
    if (this.utteranceTimeoutId) {
      clearTimeout(this.utteranceTimeoutId);
      this.utteranceTimeoutId = null;
    }
    
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  /**
   * Habla el texto dado usando técnicas avanzadas para mejorar la confiabilidad
   * Incluye manejo de tiempos naturales entre frases
   */
  speakText(text, onStarted, onEnded, onError) {
    if (!text || text.trim() === '') {
      if (onError) onError('Texto vacío');
      return () => {};
    }
    
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      if (onError) onError('Speech Synthesis no está disponible en este navegador');
      return () => {};
    }
    
    // Si ya estamos hablando, crear una cola temporal
    if (this.isSpeaking) {
      console.log('AudioService: Ya estamos hablando, esperando...');
      // Cancelamos la síntesis actual y esperamos un momento antes de comenzar la nueva
      this.cancelSpeech();
      
      // Esperar 500ms para asegurar que termine la síntesis anterior
      setTimeout(() => {
        this.speakText(text, onStarted, onEnded, onError);
      }, 500);
      
      return () => {};
    }
    
    try {
      // Marcar que estamos hablando ahora
      this.isSpeaking = true;
      
      // Crear el objeto de síntesis
      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;
      
      // Configurar parámetros básicos
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;     // Velocidad normal
      utterance.pitch = 1.0;    // Tono normal
      utterance.volume = 1.0;   // Volumen máximo
      
      // Obtener voces y seleccionar una voz en español si está disponible
      const voices = this.cachedVoices || window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(voice => 
        voice.lang.includes('es') || 
        voice.name.toLowerCase().includes('spanish')
      );
      
      if (spanishVoice) {
        console.log(`AudioService: Usando voz ${spanishVoice.name}`);
        utterance.voice = spanishVoice;
      } else if (voices.length > 0) {
        console.log(`AudioService: No hay voces en español, usando ${voices[0].name}`);
        utterance.voice = voices[0];
      }
      
      // Configurar eventos
      utterance.onstart = () => {
        console.log('AudioService: Síntesis iniciada');
        if (onStarted) onStarted();
      };
      
      utterance.onend = () => {
        console.log('AudioService: Síntesis completada');
        this.isSpeaking = false;
        
        // Limpiar temporizadores
        if (this.resumeInterval) {
          clearInterval(this.resumeInterval);
          this.resumeInterval = null;
        }
        
        if (this.utteranceTimeoutId) {
          clearTimeout(this.utteranceTimeoutId);
          this.utteranceTimeoutId = null;
        }
        
        // Esperar un momento antes de llamar al callback para simular una pausa natural
        setTimeout(() => {
          if (onEnded) onEnded();
        }, 500); // Aumentado de 300ms a 500ms para una pausa más natural
      };
      
      utterance.onerror = (event) => {
        console.error('AudioService: Error en síntesis:', event);
        this.isSpeaking = false;
        
        // Limpiar temporizadores
        if (this.resumeInterval) {
          clearInterval(this.resumeInterval);
          this.resumeInterval = null;
        }
        
        if (this.utteranceTimeoutId) {
          clearTimeout(this.utteranceTimeoutId);
          this.utteranceTimeoutId = null;
        }
        
        if (onError) onError(event.error || 'Error desconocido');
      };
      
      // Cancelar cualquier síntesis previa
      window.speechSynthesis.cancel();
      
      // Iniciar síntesis después de una breve pausa para evitar conflictos
      setTimeout(() => {
        // Iniciar la síntesis
        window.speechSynthesis.speak(utterance);
        
        // *** WORKAROUNDS CRÍTICOS ***
        
        // 1. Workaround para el problema de Chrome donde la síntesis se detiene después de ~15s
        this.resumeInterval = setInterval(() => {
          if (window.speechSynthesis.speaking) {
            console.log('AudioService: Aplicando workaround de pausa/resume');
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          } else {
            clearInterval(this.resumeInterval);
            this.resumeInterval = null;
          }
        }, 10000);
        
        // 2. Workaround para el caso donde onend no se dispara
        // Tiempo basado en la longitud del texto (125ms por caracter) con un mínimo de 8 segundos
        // Aumentado para dar más tiempo a la síntesis
        const maxSpeakingTime = Math.max(8000, text.length * 125);
        this.utteranceTimeoutId = setTimeout(() => {
          if (window.speechSynthesis.speaking) {
            console.log(`AudioService: Detectado posible bloqueo después de ${maxSpeakingTime}ms, forzando finalización`);
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            
            if (onEnded) onEnded();
          }
          
          if (this.resumeInterval) {
            clearInterval(this.resumeInterval);
            this.resumeInterval = null;
          }
        }, maxSpeakingTime);
      }, 150); // Aumentado de 100ms a 150ms para mayor estabilidad
      
      return () => {
        this.cancelSpeech();
      };
    } catch (error) {
      console.error('AudioService: Error general:', error);
      this.isSpeaking = false;
      if (onError) onError(error.message || 'Error desconocido');
      return () => {};
    }
  }

  /**
   * Inicializa el reconocimiento de voz con configuración mejorada
   * @param {string} language - Idioma para el reconocimiento (por defecto es español)
   */
  init(language = 'es-ES') {
    if (!this.isSupportedByBrowser()) {
      console.error('El reconocimiento de voz no está soportado en este navegador');
      return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configurar opciones con valores mejorados
    this.recognition.lang = language;
    this.recognition.continuous = true;  // Cambiado a true para mantener escuchando
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3; // Obtener múltiples alternativas para mejor precisión
    
    // Configurar eventos
    this.recognition.onresult = (event) => {
      // Resetear el temporizador de silencio cuando hay actividad
      this.resetSilenceTimer();
      
      // Procesar resultados de reconocimiento
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Actualizar variables de estado
      this.interimTranscript = interimTranscript;
      
      if (finalTranscript) {
        this.finalTranscript += ' ' + finalTranscript;
        this.finalTranscript = this.finalTranscript.trim();
      }
      
      // Notificar resultados
      if (this.onResultCallback) {
        this.onResultCallback(
          this.finalTranscript,
          event.results[event.resultIndex].isFinal,
          this.interimTranscript
        );
      }
    };
    
    this.recognition.onend = () => {
      console.log('AudioService: Reconocimiento finalizado');
      
      // Detener análisis de audio si está activo
      this.stopAudioAnalysis();
      
      // Si estábamos escuchando activamente y hay un temporizador de silencio,
      // esperamos un poco más antes de considerar que realmente terminó
      if (this.isListening && this.silenceTimer) {
        console.log('AudioService: Esperando un poco más antes de finalizar...');
        
        // Esperar un poco más antes de considerar realmente finalizado
        setTimeout(() => {
          this.isListening = false;
          
          // Notificar finalización
          if (this.onEndCallback) {
            this.onEndCallback(this.finalTranscript);
          }
          
          // Resetear intentos de reinicio
          this.restartAttempts = 0;
        }, 1000);
      } else {
        this.isListening = false;
        
        // Notificar finalización
        if (this.onEndCallback) {
          this.onEndCallback(this.finalTranscript);
        }
        
        // Resetear intentos de reinicio
        this.restartAttempts = 0;
      }
    };
    
    this.recognition.onerror = (event) => {
      console.log('AudioService: Error de reconocimiento:', event.error);
      
      // No marcar como no escuchando inmediatamente para ciertos errores
      if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
        this.isListening = false;
      }
      
      // Manejo de errores mejorado
      if (event.error === 'no-speech') {
        // Para errores de no-speech, intentamos reiniciar si estamos dentro del límite de intentos
        if (this.restartAttempts < this.maxRestartAttempts) {
          this.restartAttempts++;
          
          console.log(`AudioService: Reintentando reconocimiento (intento ${this.restartAttempts}/${this.maxRestartAttempts})`);
          
          if (this.onErrorCallback) {
            this.onErrorCallback('waiting');
          }
          
          // Intentar reiniciar tras un breve retraso
          setTimeout(() => {
            if (!this.isListening) { // Solo si no estamos escuchando activamente
              try {
                this.startRecognition();
              } catch (e) {
                console.error('Error al reiniciar reconocimiento:', e);
                
                if (this.onErrorCallback) {
                  this.onErrorCallback('error_restart');
                }
              }
            }
          }, 15000);  // Incrementado a 1.5s para dar más tiempo
        } else {
          console.log('AudioService: Máximo de reintentos alcanzado');
          
          if (this.onErrorCallback) {
            this.onErrorCallback('max_restarts');
          }
        }
      } else if (this.onErrorCallback) {
        // Para otros errores, enviamos el mensaje original
        this.onErrorCallback(event.error);
      }
    };
    
    this.recognition.onnomatch = () => {
      console.log('AudioService: No se pudo encontrar una coincidencia');
      
      // Considerar reiniciar el reconocimiento
      if (this.restartAttempts < this.maxRestartAttempts) {
        this.restartAttempts++;
        
        setTimeout(() => {
          try {
            this.startRecognition();
          } catch (e) {
            console.error('Error al reiniciar tras no coincidencia:', e);
          }
        }, 1000);
      }
    };
    
    this.recognition.onaudiostart = () => {
      console.log('AudioService: Audio detectado, reconocimiento activo');
      // Iniciar análisis de audio si es posible
      this.setupAudioAnalysis();
    };
    
    return true;
  }

  /**
   * Configura el análisis de audio para mejor detección de voz
   */
  setupAudioAnalysis() {
    // Solo configurar si tenemos acceso al stream
    if (!this.microphoneStream) return;
    
    try {
      // Crear contexto de audio si no existe
      if (!this.audioContext) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContext();
      }
      
      // Crear analizador de audio
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      // Conectar el stream de micrófono al analizador
      const source = this.audioContext.createMediaStreamSource(this.microphoneStream);
      source.connect(this.analyser);
      
      // Preparar buffer para datos
      this.audioData = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Iniciar monitoreo de volumen
      this.startVolumeMonitoring();
    } catch (error) {
      console.error('Error al configurar análisis de audio:', error);
    }
  }

  /**
   * Inicia el monitoreo de volumen para mejor detección de voz
   */
  startVolumeMonitoring() {
    // Detener monitoreo previo si existe
    this.stopVolumeMonitoring();
    
    // Iniciar nuevo intervalo de monitoreo
    this.volumeCheckInterval = setInterval(() => {
      if (!this.analyser || !this.audioData) return;
      
      // Obtener datos de frecuencia actual
      this.analyser.getByteFrequencyData(this.audioData);
      
      // Calcular volumen promedio
      let sum = 0;
      for (let i = 0; i < this.audioData.length; i++) {
        sum += this.audioData[i];
      }
      const averageVolume = sum / this.audioData.length;
      
      // Umbral de detección de voz (ajustable)
      const voiceThreshold = 20;
      
      if (averageVolume > voiceThreshold) {
        // Se detectó voz, resetear temporizador de silencio
        this.resetSilenceTimer();
      }
      
      // Log de debug cada cierto tiempo
      if (Math.random() < 0.05) { // Solo loggear aproximadamente 5% del tiempo
        console.log(`AudioService: Volumen promedio: ${averageVolume.toFixed(2)}`);
      }
    }, 200); // Comprobar cada 200ms
  }

  /**
   * Detiene el monitoreo de volumen
   */
  stopVolumeMonitoring() {
    if (this.volumeCheckInterval) {
      clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
  }

  /**
   * Detiene el análisis de audio
   */
  stopAudioAnalysis() {
    this.stopVolumeMonitoring();
    
    // Liberar recursos de audio
    if (this.audioContext && this.audioContext.state !== 'closed') {
      // No cerramos el contexto para poder reutilizarlo, solo desconectamos
      if (this.analyser) {
        this.analyser.disconnect();
        this.analyser = null;
      }
    }
    
    this.audioData = null;
  }

  /**
   * Reinicia el temporizador de silencio
   */
  resetSilenceTimer() {
    // Limpiar temporizador existente
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    // Configurar nuevo temporizador
    this.silenceTimer = setTimeout(() => {
      console.log(`AudioService: Silencio detectado después de ${this.silenceThreshold}ms`);
      
      // Si seguimos escuchando, es tiempo de considerar que el usuario ha terminado
      if (this.isListening) {
        console.log('AudioService: Deteniendo reconocimiento por silencio prolongado');
        this.stop();
      }
    }, this.silenceThreshold);
  }

  /**
   * Método interno para iniciar el reconocimiento (usado para reintentos)
   */
  startRecognition() {
    if (this.recognition) {
      try {
        this.recognition.start();
        this.isListening = true;
        
        // Iniciar temporizador de silencio
        this.resetSilenceTimer();
        
        // Configurar temporizador de tiempo máximo de espera
        setTimeout(() => {
          if (this.isListening) {
            console.log(`AudioService: Tiempo máximo de espera (${this.speakingTimeout}ms) alcanzado`);
            // No detener directamente, sino revisar si hay actividad
            if (!this.finalTranscript && !this.interimTranscript) {
              console.log('AudioService: No se detectó voz, deteniendo');
              this.stop();
            }
          }
        }, this.speakingTimeout);
        
        return true;
      } catch (error) {
        console.error('Error al iniciar reconocimiento:', error);
        this.isListening = false;
        return false;
      }
    }
    return false;
  }

  /**
   * Solicita permiso para usar el micrófono con opciones mejoradas
   * @returns {Promise<boolean>} - Promise que resuelve a true si se otorgó permiso, false en caso contrario
   */
  async requestMicrophonePermission() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        // Solicitar acceso al micrófono con configuración óptima
        const constraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1  // Mono para mejor reconocimiento de voz
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Almacenar la referencia al stream para poder detenerlo después
        this.microphoneStream = stream;
        this.permissionGranted = true;
        
        // Notificar que el permiso fue concedido si hay un callback
        if (this.permissionCallback) {
          this.permissionCallback(true);
        }
        
        return true;
      } catch (error) {
        console.error('Error al solicitar permiso para el micrófono:', error);
        
        this.permissionGranted = false;
        // Notificar que el permiso fue denegado si hay un callback
        if (this.permissionCallback) {
          this.permissionCallback(false, error.message);
        }
        
        return false;
      }
    } else {
      console.error('getUserMedia no está soportado en este navegador');
      return false;
    }
  }

  /**
   * Establece el callback para cuando cambia el estado del permiso del micrófono
   * @param {Function} callback - Función a llamar cuando cambia el estado del permiso
   */
  onPermissionChange(callback) {
    this.permissionCallback = callback;
  }

  /**
   * Configura los tiempos de espera para el reconocimiento de voz
   * @param {Object} options - Opciones de configuración
   * @param {number} options.silenceThreshold - Tiempo en ms para considerar silencio (por defecto 3000ms)
   * @param {number} options.speakingTimeout - Tiempo máximo de espera para una respuesta (por defecto 8000ms)
   */
  configureTimings(options = {}) {
    if (options.silenceThreshold && typeof options.silenceThreshold === 'number') {
      this.silenceThreshold = options.silenceThreshold;
    }
    
    if (options.speakingTimeout && typeof options.speakingTimeout === 'number') {
      this.speakingTimeout = options.speakingTimeout;
    }
    
    console.log(`AudioService: Tiempos configurados - Silencio: ${this.silenceThreshold}ms, Espera máxima: ${this.speakingTimeout}ms`);
  }

  /**
   * Inicia el reconocimiento de voz, solicitando permisos si es necesario
   * @param {Object} options - Opciones opcionales para la configuración
   * @returns {Promise<boolean>} - Promise que resuelve a true si se inició correctamente
   */
  async start(options = {}) {
    // Actualizar configuración si se proporcionan opciones
    if (options.silenceThreshold || options.speakingTimeout) {
      this.configureTimings(options);
    }
    
    // Detener cualquier reconocimiento previo primero
    this.stop();
    
    // Pequeña pausa para asegurar que el reconocimiento anterior se detuvo correctamente
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Verificar y solicitar permiso si no ha sido otorgado
    if (!this.permissionGranted) {
      const permissionGranted = await this.requestMicrophonePermission();
      if (!permissionGranted) {
        if (this.onErrorCallback) {
          this.onErrorCallback('No se otorgó permiso para usar el micrófono');
        }
        return false;
      }
    }
    
    if (!this.recognition) {
      const initialized = this.init(options.language || this.recognitionLang);
      if (!initialized) return false;
    }
    
    // Reiniciar transcripciones
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // Resetear contador de intentos
    this.restartAttempts = 0;
    
    console.log('AudioService: Iniciando reconocimiento de voz');
    return this.startRecognition();
  }

  /**
   * Detiene el reconocimiento de voz
   */
  stop() {
    // Limpiar temporizador de silencio
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    // Detener análisis de audio
    this.stopAudioAnalysis();
    
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
        this.isListening = false;
        
        // También detener el stream del micrófono si existe
        if (this.microphoneStream) {
          this.microphoneStream.getTracks().forEach(track => track.stop());
        }
        
        return true;
      } catch (error) {
        console.error('Error al detener el reconocimiento de voz:', error);
        this.isListening = false;
        return false;
      }
    }
    return false;
  }

  /**
   * Establece el callback para cuando se recibe un resultado
   * @param {Function} callback - Función a llamar con el resultado
   */
  onResult(callback) {
    this.onResultCallback = callback;
  }

  /**
   * Establece el callback para cuando termina el reconocimiento
   * @param {Function} callback - Función a llamar al terminar
   */
  onEnd(callback) {
    this.onEndCallback = callback;
  }

  /**
   * Establece el callback para cuando ocurre un error
   * @param {Function} callback - Función a llamar en caso de error
   */
  onError(callback) {
    this.onErrorCallback = callback;
  }

  /**
   * Verifica si el navegador soporta reconocimiento de voz
   * @returns {boolean} - true si es soportado, false si no
   */
  isSupportedByBrowser() {
    return typeof window !== 'undefined' && 
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  }
  
  /**
   * Ajusta la sensibilidad del reconocimiento de voz
   * @param {Object} options - Opciones de sensibilidad
   * @param {number} options.silenceThreshold - Tiempo en ms para considerar silencio (3000-10000)
   * @param {number} options.speakingTimeout - Tiempo máximo de espera para una respuesta (5000-30000)
   */
  setSensitivity(options = {}) {
    // Valores predefinidos para diferentes sensibilidades
    const sensitivities = {
      high: { silenceThreshold: 10000, speakingTimeout: 15000 },
      medium: { silenceThreshold: 10000, speakingTimeout: 45000 },
      low: { silenceThreshold: 10000, speakingTimeout: 15000 },
      veryLow: { silenceThreshold: 30000, speakingTimeout: 45000 }
    };
    
    let config = { ...sensitivities.medium };  // Valor por defecto
    
    // Si se proporciona un preset de sensibilidad
    if (options.preset && sensitivities[options.preset]) {
      config = { ...sensitivities[options.preset] };
    }
    
    // Sobrescribir con valores específicos si se proporcionan
    if (options.silenceThreshold) config.silenceThreshold = options.silenceThreshold;
    if (options.speakingTimeout) config.speakingTimeout = options.speakingTimeout;
    
    // Aplicar configuración
    this.configureTimings(config);
    
    return config;
  }
}

// Exportar una instancia única del servicio
const audioService = new AudioService();
export default audioService;
