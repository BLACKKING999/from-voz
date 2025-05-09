import React, { useState, useEffect, useRef } from 'react';
import SimpleVoice from '../components/SimpleVoice';
import audioService from '../services/audioService';

const VoiceTest = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('Hola, soy tu asistente virtual. ¿En qué puedo ayudarte hoy?');
  const [recognizedText, setRecognizedText] = useState('');
  const [status, setStatus] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [voicesAvailable, setVoicesAvailable] = useState([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [micPermission, setMicPermission] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const [conversation, setConversation] = useState([]);
  const conversationRef = useRef([]);
  const lastUtteranceRef = useRef('');  // Almacena la última frase hablada por el sistema

  useEffect(() => {
    // Inicializar el sistema de voz y comprobar compatibilidad
    const speechSystemInitialized = audioService.initSpeechSystem();
    const recognitionSupported = audioService.isSupportedByBrowser();
    
    setSpeechSupported(speechSystemInitialized);
    setRecognitionSupported(recognitionSupported);
    
    // Obtener lista de voces disponibles
    setTimeout(() => {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        // Comentamos esta variable ya que no se usa en el resto del componente
        // eslint-disable-next-line no-unused-vars
        const spanishVoices = voices.filter(v => 
          v.lang.includes('es') || 
          v.name.toLowerCase().includes('spanish')
        );
        setVoicesAvailable(spanishVoices.length > 0 ? spanishVoices : voices);
      }
    }, 500);
    
    // Configurar el callback para cambios en el permiso del micrófono
    audioService.onPermissionChange((granted, errorMsg) => {
      setMicPermission(granted ? 'granted' : 'denied');
      if (!granted && errorMsg) {
        setStatus(`Error de permiso: ${errorMsg}`);
      }
    });
    
    // Agregar el mensaje inicial al historial de conversación
    addToConversation('system', text);
    
    // Hablar el mensaje inicial automáticamente después de un breve retraso
    const timer = setTimeout(() => {
      handleSpeak();
    }, 1000);
    
    return () => {
      // Limpiar al desmontar
      clearTimeout(timer);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (isListening) {
        audioService.stop();
      }
    };
  }, [text, isListening, handleSpeak, addToConversation]); // Añadimos las dependencias necesarias

  // Función para añadir mensajes al historial de conversación
  const addToConversation = (speaker, message) => {
    const newMessage = {
      id: Date.now(),
      speaker,
      message,
      timestamp: new Date().toISOString()
    };
    
    const updatedConversation = [...conversationRef.current, newMessage];
    conversationRef.current = updatedConversation;
    setConversation(updatedConversation);
  };
  
  // Función para iniciar la síntesis de voz
  const handleSpeak = () => {
    if (!text.trim()) {
      setStatus('El texto no puede estar vacío');
      return;
    }
    
    // Guardar la última frase para evitar repetición
    lastUtteranceRef.current = text;
    
    setIsSpeaking(true);
    setStatus('Hablando...');
    
    // Añadir el mensaje del sistema a la conversación
    if (!conversation.some(item => item.message === text && item.speaker === 'system')) {
      addToConversation('system', text);
    }
    
    audioService.speakText(
      text,
      () => {
        setStatus('Hablando...');
      },
      () => {
        setIsSpeaking(false);
        setStatus('Listo para escuchar');
        // Iniciar automáticamente la escucha después de hablar
        if (recognitionSupported && micPermission === 'granted') {
          startVoiceRecognition();
        } else if (recognitionSupported && micPermission === 'unknown') {
          // Solicitar permiso si aún no se ha solicitado
          requestMicrophonePermission();
        }
      },
      (error) => {
        setIsSpeaking(false);
        setStatus(`Error: ${error}`);
      }
    );
  };

  // Función para detener la síntesis de voz
  // eslint-disable-next-line no-unused-vars
  const handleStop = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatus('Síntesis detenida');
    }
  };

  // Solicitar permiso para usar el micrófono
  const requestMicrophonePermission = async () => {
    setStatus('Solicitando permiso para el micrófono...');
    const granted = await audioService.requestMicrophonePermission();
    if (granted) {
      setMicPermission('granted');
      setStatus('Permiso para micrófono concedido');
      startVoiceRecognition();
    } else {
      setMicPermission('denied');
      setStatus('Se requiere permiso para el micrófono para usar esta función');
    }
  };
  
  // Simular una respuesta automática natural basada en lo que dijo el usuario
  const getAutoResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    // Respuestas comunes de conversación
    if (input.includes('hola') || input.includes('buenos días') || input.includes('buenas tardes') || input.includes('buenas noches')) {
      return '¡Hola! ¿Cómo estás hoy? ¿En qué puedo ayudarte?';
    }
    if (input.includes('cómo estás') || input.includes('como estas')) {
      return 'Estoy muy bien, gracias por preguntar. ¿Y tú cómo estás?';
    }
    if (input.includes('gracias') || input.includes('te lo agradezco')) {
      return 'De nada. Estoy aquí para ayudarte. ¿Hay algo más que necesites?';
    }
    if (input.includes('adiós') || input.includes('hasta luego') || input.includes('chao')) {
      return 'Hasta luego. Fue un placer hablar contigo. ¡Que tengas un buen día!';
    }
    if (input.includes('bien') || input.includes('excelente') || input.includes('muy bien')) {
      return 'Me alegra escuchar eso. ¿En qué puedo ayudarte hoy?';
    }
    if (input.includes('mal') || input.includes('triste') || input.includes('no muy bien')) {
      return 'Lamento escuchar eso. Espero que tu día mejore pronto. ¿Hay algo en lo que pueda ayudarte?';
    }
    
    // Respuesta genérica si no coincide con ningún patrón
    return 'Entiendo. ¿Hay algo específico en lo que pueda ayudarte hoy?';
  };

  // Iniciar reconocimiento de voz
  const startVoiceRecognition = async () => {
    if (!audioService.isSupportedByBrowser()) {
      setStatus('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    if (micPermission !== 'granted') {
      await requestMicrophonePermission();
      return;
    }
    
    audioService.init('es-ES');
    
    setRecognizedText('');
    
    audioService.onResult((transcript, isFinal) => {
      setRecognizedText(transcript);
      setStatus(isFinal ? 'Procesando...' : 'Escuchando...');
    });
    
    audioService.onEnd((finalTranscript) => {
      setIsListening(false);
      setStatus('Procesando tu mensaje...');
      
      // Verificar si se reconoció algo de texto
      if (finalTranscript && finalTranscript.trim()) {
        // Añadir el mensaje del usuario a la conversación
        addToConversation('user', finalTranscript);
        
        // Generar una respuesta automática
        setTimeout(() => {
          const response = getAutoResponse(finalTranscript);
          setText(response);
          
          // Iniciar síntesis de voz con un pequeño retraso para simular "pensamiento"
          setTimeout(handleSpeak, 500);
        }, 1000);
      } else {
        setStatus('No se detectó ningún mensaje. Puedes intentarlo de nuevo.');
      }
    });
    
    audioService.onError((errorMessage) => {
      if (errorMessage === 'no-speech') {
        setStatus('No se detectó ninguna voz. Por favor, intenta hablar de nuevo.');
      } else {
        setStatus(`Error de reconocimiento: ${errorMessage}`);
      }
      setIsListening(false);
    });
    
    try {
      const started = await audioService.start();
      if (started) {
        setIsListening(true);
        setStatus('Escuchando...');
      } else {
        setStatus('No se pudo iniciar el reconocimiento de voz');
      }
    } catch (error) {
      setStatus(`Error al iniciar reconocimiento: ${error.message || 'Error desconocido'}`);
    }
  };

  // Detener reconocimiento de voz
  const stopVoiceRecognition = () => {
    audioService.stop();
    setIsListening(false);
    setStatus('Reconocimiento detenido');
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Conversación por Voz</h1>
      
      {/* Estado del micrófono y permisos */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Estado del Sistema</h2>
            <div className="flex flex-wrap gap-3 mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${speechSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {speechSupported ? '✓ Síntesis disponible' : '✗ Síntesis no disponible'}
              </span>
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${recognitionSupported ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {recognitionSupported ? '✓ Reconocimiento disponible' : '✗ Reconocimiento no disponible'}
              </span>
              <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                micPermission === 'granted' ? 'bg-green-100 text-green-800' : 
                micPermission === 'denied' ? 'bg-red-100 text-red-800' : 
                'bg-yellow-100 text-yellow-800'}`}
              >
                {micPermission === 'granted' ? '✓ Micrófono permitido' : 
                 micPermission === 'denied' ? '✗ Micrófono bloqueado' : 
                 '? Permiso de micrófono pendiente'}
              </span>
            </div>
          </div>
          
          {/* Botones de control */}
          <div className="flex space-x-2">
            {micPermission !== 'granted' && (
              <button 
                onClick={requestMicrophonePermission}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                Permitir Micrófono
              </button>
            )}
            {!isListening && micPermission === 'granted' && (
              <button
                onClick={startVoiceRecognition}
                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
                Hablar
              </button>
            )}
            {isListening && (
              <button
                onClick={stopVoiceRecognition}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                </svg>
                Detener
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Historial de conversación */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 max-h-[400px] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Conversación</h2>
        
        {conversation.length === 0 ? (
          <div className="text-center text-gray-500 py-4">La conversación comenzará pronto...</div>
        ) : (
          <div className="space-y-4">
            {conversation.map((msg) => (
              <div 
                key={msg.id} 
                className={`p-3 rounded-lg ${msg.speaker === 'system' ? 'bg-blue-50 ml-4' : 'bg-green-50 mr-4'}`}
              >
                <div className="font-semibold text-sm text-gray-600 mb-1">
                  {msg.speaker === 'system' ? 'Asistente' : 'Tú'}
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Estado actual y texto reconocido */}
      <div className="bg-gray-50 rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Estado: <span className="font-bold">{status || "Listo"}</span>
          </span>
          {isListening && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Escuchando
            </span>
          )}
          {isSpeaking && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <span className="mr-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Hablando
            </span>
          )}
        </div>
        
        {isListening && (
          <div className="border border-gray-300 rounded-md p-3 bg-white">
            <p className="text-gray-700">
              {recognizedText || "Esperando que hables..."}
            </p>
          </div>
        )}
        
        {/* SimpleVoice (oculto visualmente pero funcional) */}
        {isSpeaking && <SimpleVoice text="" />}
      </div>
    </div>
  );
};

export default VoiceTest;
