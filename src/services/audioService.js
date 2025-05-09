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
    
    // Callbacks
    this.onResultCallback = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;
    
    // Configuración mejorada para el reconocimiento de voz
    this.silenceThreshold = 2500; // Tiempo en ms para considerar silencio (aumentado para móviles)
    this.speakingTimeout = 12000;  // Tiempo en ms para esperar respuesta (aumentado para móviles)
    this.volumeThreshold = 7; // umbral de volumen para considerar que hay voz (reducido para mayor sensibilidad)
    this.restartAttempts = 0;     // Contador de intentos de reinicio
    this.maxRestartAttempts = 8;  // Máximo número de reintentos
    this.silenceTimer = null;     // Timer para detectar silencio
    this.audioContext = null;     // Contexto de audio para análisis
    this.analyser = null;         // Analizador de audio
    this.audioData = null;        // Buffer para datos de audio
    this.volumeCheckInterval = null; // Intervalo para comprobar volumen
    
    // Inicializar sistema al crear instancia
    this.initSpeechSystem();
  }
  
  /**
   * Detecta si el usuario está en un dispositivo móvil
   * @returns {boolean} True si es un dispositivo móvil
   */
  isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  /**
   * Detecta específicamente si es un dispositivo Android
   * @returns {boolean} True si es un dispositivo Android
   */
  isAndroidDevice() {
    return /Android/i.test(navigator.userAgent);
  }

  /**
   * Inicializa el sistema de síntesis y precarga las voces
   */
  initSpeechSystem() {
    // Verificar si la API está disponible
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return false;
    }
    
    // Aplicar configuración específica para dispositivos móviles
    if (this.isMobileDevice()) {
      this.silenceThreshold = 15000; // Dar aún más tiempo en móviles antes de considerar silencio
      this.speakingTimeout = 30000; // Mayor tiempo máximo de espera en móviles
      
      if (this.isAndroidDevice()) {
        this.volumeThreshold = 2; // Umbral aún más bajo para Android
      }
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
        utterance.voice = spanishVoice;
      } else if (voices.length > 0) {
        utterance.voice = voices[0];
      }
      
      // Configurar eventos
      utterance.onstart = () => {
        if (onStarted) onStarted();
      };
      
      utterance.onend = () => {
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
      this.isSpeaking = false;
      if (onError) onError(error.message || 'Error desconocido');
      return () => {};
    }
  }

  /**
   * Inicializa el reconocimiento de voz
   * @param {string} language - Idioma para el reconocimiento
   */
  init(language = 'es-ES') {
    // Si ya tenemos una instancia, detenerla primero
    this.stop();
    
    this.recognitionLang = language;
    this.finalTranscript = '';
    this.interimTranscript = '';
    
    // Crear reconocimiento según disponibilidad en navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (this.onErrorCallback) {
        this.onErrorCallback('API no soportada');
      }
      return false;
    }
    
    this.recognition = new SpeechRecognition();
    
    // Configurar reconocimiento
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = language;
    
    // Guardar referencia al objeto para usar en las funciones de callback
    const self = this;
    
    // Manejar resultados
    this.recognition.onresult = function(event) {
      // Procesar resultados
      self.interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          self.interimTranscript += event.results[i][0].transcript;
        }
      }
      
      if (finalTranscript) {
        self.finalTranscript += ' ' + finalTranscript;
        self.finalTranscript = self.finalTranscript.trim();
      }
      
      // Notificar resultados
      if (self.onResultCallback) {
        self.onResultCallback(
          self.finalTranscript,
          event.results[event.resultIndex].isFinal,
          self.interimTranscript
        );
      }
    };
    
    this.recognition.onend = function() {
      // Detener análisis de audio si está activo
      self.stopAudioAnalysis();
      
      // Si estábamos escuchando activamente y hay un temporizador de silencio,
      // esperamos un poco más antes de considerar que realmente terminó
      if (self.isListening && self.silenceTimer) {
        // Esperar un poco más antes de considerar realmente finalizado
        setTimeout(() => {
          self.isListening = false;
          
          // Notificar finalización
          if (self.onEndCallback) {
            self.onEndCallback(self.finalTranscript);
          }
          
          // Resetear intentos de reinicio
          self.restartAttempts = 0;
        }, 1000);
      } else {
        self.isListening = false;
        
        // Notificar finalización
        if (self.onEndCallback) {
          self.onEndCallback(self.finalTranscript);
        }
        
        // Resetear intentos de reinicio
        self.restartAttempts = 0;
      }
    };
    
    this.recognition.onerror = function(event) {
      // No marcar como no escuchando inmediatamente para ciertos errores
      if (event.error !== 'no-speech' && event.error !== 'audio-capture') {
        self.isListening = false;
      }
      
      // Manejo de errores mejorado
      if (event.error === 'no-speech') {
        // Para errores de no-speech, intentamos reiniciar si estamos dentro del límite de intentos
        if (self.restartAttempts < self.maxRestartAttempts) {
          self.restartAttempts++;
          
          if (self.onErrorCallback) {
            self.onErrorCallback('waiting');
          }
          
          // Intentar reiniciar tras un breve retraso
          setTimeout(() => {
            if (!self.isListening) { // Solo si no estamos escuchando activamente
              try {
                self.startRecognition();
              } catch (e) {
                if (self.onErrorCallback) {
                  self.onErrorCallback('error_restart');
                }
              }
            }
          }, 15000);  // Incrementado a 1.5s para dar más tiempo
        } else {
          if (self.onErrorCallback) {
            self.onErrorCallback('max_restarts');
          }
        }
      } else if (self.onErrorCallback) {
        // Para otros errores, enviamos el mensaje original
        self.onErrorCallback(event.error);
      }
    };
    
    this.recognition.onnomatch = function() {
      // Considerar reiniciar el reconocimiento
      if (self.restartAttempts < self.maxRestartAttempts) {
        self.restartAttempts++;
        
        setTimeout(() => {
          try {
            self.startRecognition();
          } catch (e) {
            // Error silencioso
          }
        }, 1000);
      }
    };
    
    this.recognition.onaudiostart = function() {
      // Iniciar análisis de audio si es posible
      self.setupAudioAnalysis();
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
      // Error silencioso
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
    
    if (this.analyser) {
      this.analyser = null;
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
      // Si seguimos escuchando, es tiempo de considerar que el usuario ha terminado
      if (this.isListening) {
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
            // No detener directamente, sino revisar si hay actividad
            if (!this.finalTranscript && !this.interimTranscript) {
              this.stop();
            }
          }
        }, this.speakingTimeout);
        
        return true;
      } catch (error) {
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
        this.permissionGranted = false;
        // Notificar que el permiso fue denegado si hay un callback
        if (this.permissionCallback) {
          this.permissionCallback(false, error.message);
        }
        
        return false;
      }
    } else {
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

  /**
   * Configura timing específico para distintos dispositivos
   * @param {Object} config - Configuración de tiempos
   */
  setTimingConfig(config) {
    if (config.silenceThreshold) this.silenceThreshold = config.silenceThreshold;
    if (config.speakingTimeout) this.speakingTimeout = config.speakingTimeout;
    if (config.volumeThreshold) this.volumeThreshold = config.volumeThreshold;
  }

  /**
   * Activa modo específico para Android y dispositivos móviles
   * @param {boolean} isActive - Si activar o no el modo móvil
   */
  setMobileMode(isActive) {
    if (isActive) {
      this.silenceThreshold = 3500; // Tiempo más largo para móviles
      this.volumeThreshold = 5; // Umbral más bajo para Android
    } else {
      this.silenceThreshold = 2500; // Valor por defecto
      this.volumeThreshold = 7; // Valor por defecto
    }
  }
}

// Exportar una instancia única del servicio
const audioService = new AudioService();
export default audioService;