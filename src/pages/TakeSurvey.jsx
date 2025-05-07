import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SurveyService, ResponseService } from '../services/apiService';

// Componentes
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import audioService from '../services/audioService';
// Importar servicio de procesamiento de lenguaje natural
import * as nlpService from '../services/nlpService';

const TakeSurvey = () => {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  
  // Referencias para controlar el flujo de la conversación
  const conversationActive = useRef(false);
  const speakTimeoutRef = useRef(null);
  
  // Estados
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [conversationState, setConversationState] = useState('idle'); // idle, speaking, listening, processing
  const [conversationMessage, setConversationMessage] = useState('');
  const [micPermission, setMicPermission] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const [recognizedText, setRecognizedText] = useState('');
  const [status, setStatus] = useState('');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  
  // Verificar permiso del micrófono
  const requestMicrophonePermission = async () => {
    setConversationState('requesting_permission');
    setConversationMessage('Solicitando permiso para el micrófono...');
    
    try {
      const permissionGranted = await audioService.requestMicrophonePermission();
      
      if (permissionGranted) {
        setMicPermission('granted');
        setShowPermissionDialog(false);
        setConversationMessage('Permiso concedido. Iniciando encuesta por voz...');
        
        // Pequeño retraso para iniciar la conversación
        setTimeout(() => {
          startConversation();
        }, 1000);
      } else {
        setMicPermission('denied');
        setConversationState('permission_denied');
        setConversationMessage('Se necesita acceso al micrófono para usar la función de voz');
      }
    } catch (error) {
      console.error('Error al solicitar permiso:', error);
      setMicPermission('denied');
      setConversationState('error');
      setConversationMessage('Error al solicitar permiso del micrófono');
    }
  };
  
  // Cargar la encuesta
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const data = await SurveyService.getPublicSurvey(surveyId);
        console.log('Encuesta cargada:', data);
        setSurvey(data);
        // Inicializar respuestas vacías
        setResponses(new Array(data.questions.length).fill(''));
      } catch (error) {
        console.error('Error al cargar la encuesta:', error);
        setError('No se pudo cargar la encuesta. Verifique que el ID sea correcto y que la encuesta esté activa.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSurvey();
    
    // Inicializar sistema de voz
    audioService.initSpeechSystem();
    
    // Configurar el callback para cambios en el permiso del micrófono
    audioService.onPermissionChange((granted, errorMsg) => {
      setMicPermission(granted ? 'granted' : 'denied');
      if (!granted && errorMsg) {
        setConversationMessage(`Error de permiso: ${errorMsg}`);
        setConversationState('permission_denied');
      }
    });
    
    return () => {
      // Detener cualquier síntesis y reconocimiento al desmontar
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      audioService.stop();
      conversationActive.current = false;
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [surveyId]);
  
  // Iniciar la conversación una vez que la encuesta esté cargada
  useEffect(() => {
    if (survey && voiceEnabled && !conversationActive.current) {
      // Primero verificar permiso de micrófono
      if (micPermission === 'granted') {
        startConversation();
      } else if (micPermission === 'unknown') {
        // Mostrar diálogo de permiso
        setShowPermissionDialog(true);
      }
    }
  }, [survey, voiceEnabled, micPermission]);
  
  // Función para iniciar la conversación
  const startConversation = () => {
    if (!voiceEnabled || !survey) return;
    
    conversationActive.current = true;
    
    // Dar un mensaje de bienvenida
    if (survey.welcomeMessage) {
      speakText(survey.welcomeMessage, () => {
        // Después de la bienvenida, preguntar la primera pregunta
        speakCurrentQuestion();
      });
    } else {
      // Si no hay mensaje de bienvenida, ir directamente a la primera pregunta
      speakCurrentQuestion();
    }
  };
  
  // Función para hablar el texto usando el servicio de audio con pausas naturales
  const speakText = (text, onEndCallback) => {
    if (!voiceEnabled) {
      if (onEndCallback) onEndCallback();
      return;
    }
    
    console.log('Preparando para hablar:', text);
    
    // Cancela cualquier síntesis en curso y limpia los timeouts anteriores
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    
    // Detener cualquier reconocimiento en curso para evitar conflictos
    audioService.stop();
    
    // Pausa significativa antes de comenzar a hablar (1 segundo)
    speakTimeoutRef.current = setTimeout(() => {
      setConversationState('speaking');
      setConversationMessage('Hablando: ' + text.substring(0, 30) + (text.length > 30 ? '...' : ''));
      
      // Calcular un tiempo estimado basado en la longitud del texto (125ms por carácter para ser más conservador)
      const estimatedSpeakTime = Math.max(4000, text.length * 125);
      console.log(`Tiempo estimado para hablar: ${estimatedSpeakTime}ms`);
      
      audioService.speakText(
        text,
        () => {
          console.log('Comenzando a hablar:', text);
        },
        () => {
          console.log('Terminó de hablar la frase completa');
          setConversationState('processing');
          setConversationMessage('Procesando...');
          
          // Esperar un tiempo más largo después de hablar (2 segundos) para una pausa natural
          // Esta pausa simula el tiempo que una persona tomaría para procesar lo que escuchó
          speakTimeoutRef.current = setTimeout(() => {
            setConversationState('idle');
            if (onEndCallback) {
              onEndCallback();
            }
          }, 2000);
        },
        (error) => {
          console.error('Error al hablar:', error);
          setConversationState('error');
          setConversationMessage(`Error: ${error}`);
          
          // En caso de error, esperar un poco antes de continuar
          speakTimeoutRef.current = setTimeout(() => {
            setConversationState('idle');
            if (onEndCallback) {
              onEndCallback();
            }
          }, 1500);
        }
      );
    }, 1000); // Esperar 1 segundo antes de iniciar una nueva síntesis para asegurar separación clara
  };
  
  // Función para hablar la pregunta actual
  const speakCurrentQuestion = () => {
    if (!survey || !voiceEnabled) return;
    
    const currentQuestion = survey.questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    let questionText = `Pregunta ${currentQuestionIndex + 1}: ${currentQuestion.text}`;
    
    // Agregar información sobre opciones si es pregunta de opción múltiple
    if (currentQuestion.type === 'multiple_choice' && currentQuestion.options) {
      questionText += '. Las opciones son: ';
      questionText += currentQuestion.options.map((option, idx) => 
        `Opción ${idx + 1}: ${option}`
      ).join(', ');
    }
    
    speakText(questionText, () => {
      // Después de hablar la pregunta, iniciar el reconocimiento de voz
      startListening();
    });
  };
  
  // Función para iniciar la escucha de la respuesta del usuario
  const startListening = async () => {
    if (!voiceEnabled) return;
    
    if (!audioService.isSupportedByBrowser()) {
      setError('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    if (micPermission !== 'granted') {
      await requestMicrophonePermission();
      return;
    }
    
    // Inicializar el reconocimiento de voz con el idioma español
    audioService.init('es-ES');
    
    // Limpiar cualquier texto reconocido previamente
    setRecognizedText('');
    setCurrentResponse('');
    
    audioService.onResult((transcript, isFinal) => {
      setCurrentResponse(transcript);
      setStatus(isFinal ? 'Procesando...' : 'Escuchando...');
    });
    
    audioService.onEnd((finalTranscript) => {
      setIsListening(false);
      setConversationState('processing');
      setConversationMessage('Procesando respuesta...');
      
      // Guardar la respuesta y continuar la conversación
      handleVoiceResponse(finalTranscript);
    });
    
    audioService.onError((errorMessage) => {
      console.log('Manejando error de reconocimiento:', errorMessage);
      
      // Error especial que indica que está esperando input
      if (errorMessage === 'waiting') {
        // No mostrar error, solo actualizar el estado para indicar que está esperando
        setConversationState('waiting');
        setConversationMessage('Esperando respuesta...');
        return; // No hacer nada más, el servicio reiniciará la escucha automáticamente
      }
      
      // Para otros errores, mostrar mensaje y reintentar
      console.error('Error de reconocimiento:', errorMessage);
      setError(`Error de reconocimiento: ${errorMessage}`);
      setIsListening(false);
      setConversationState('idle');
      
      // Si es un error de reconocimiento genuino, reintentar la escucha
      if (errorMessage !== 'aborted' && errorMessage !== 'no-speech') {
        speakTimeoutRef.current = setTimeout(() => {
          speakText('Hubo un problema con el reconocimiento de voz. Intentémoslo de nuevo.', () => {
            startListening();
          });
        }, 3000);
      } else {
        // Para errores menos graves, simplemente reintentar sin mensaje
        speakTimeoutRef.current = setTimeout(() => {
          startListening();
        }, 1500);
      }
    });
    
    try {
      const started = await audioService.start();
      if (started) {
        setIsListening(true);
        setConversationState('listening');
        setConversationMessage('Escuchando...');
      } else {
        setError('No se pudo iniciar el reconocimiento de voz');
        setConversationState('idle');
      }
    } catch (error) {
      setError(`Error al iniciar reconocimiento: ${error.message || 'Error desconocido'}`);
      setConversationState('idle');
    }
  };
  
  // Manejar la respuesta por voz
  const handleVoiceResponse = (response) => {
    // Limpiar cualquier error previo
    setError(null);
    
    if (!response || response.trim() === '') {
      // Si no hay respuesta, pedir que repita una vez más sin repetir muchas veces
      if (currentResponse) {
        // Si ya había algo en la respuesta actual, usamos eso en lugar de nada
        response = currentResponse;
      } else {
        speakText('No he escuchado ninguna respuesta clara. Por favor, intenta hablar más fuerte.', () => {
          startListening();
        });
        return;
      }
    }
    
    // Guardar la respuesta actual
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = response;
    setResponses(updatedResponses);
    
    // Dar feedback al usuario
    speakText(`He registrado tu respuesta: ${response}.`, () => {
      // Pasar a la siguiente pregunta o finalizar
      if (currentQuestionIndex < survey.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setCurrentResponse('');
        // Hablar la siguiente pregunta después de un breve pausa
        speakTimeoutRef.current = setTimeout(() => {
          speakCurrentQuestion();
        }, 1000);
      } else {
        // Si es la última pregunta, mostrar confirmación
        setShowConfirmation(true);
        speakText('Hemos terminado todas las preguntas. Ahora te mostraré un resumen de tus respuestas para que las confirmes.', () => {
          speakConfirmationSummary();
        });
      }
    });
  };
  
  // Leer el resumen de confirmación
  const speakConfirmationSummary = () => {
    if (!voiceEnabled || !showConfirmation) return;
    
    let summaryText = 'Resumen de tus respuestas: ';
    
    survey.questions.forEach((question, index) => {
      summaryText += `Pregunta ${index + 1}: ${question.text}. Tu respuesta: ${responses[index] || "Sin respuesta"}. `;
    });
    
    summaryText += '¿Deseas enviar estas respuestas o volver para revisar alguna?';
    
    speakText(summaryText, () => {
      // Escuchar confirmación del usuario
      listenForConfirmation();
    });
  };
  
  // Escuchar la confirmación del usuario usando NLP para mejor reconocimiento
  const listenForConfirmation = () => {
    if (!voiceEnabled) return;
    
    // Esperar un momento antes de empezar a escuchar para dar tiempo a que termine de hablar
    // y para simular un ritmo de conversación natural
    setConversationState('waiting');
    setConversationMessage('Esperando tu respuesta...');
    
    // Esperar 3 segundos antes de empezar a escuchar para una interacción más natural
    setTimeout(() => {
      audioService.init('es-ES');
      
      audioService.onResult((transcript, isFinal) => {
        // Mostrar lo que está diciendo el usuario en tiempo real
        setCurrentResponse(transcript);
        setConversationMessage(isFinal ? 'Procesando tu respuesta...' : `Escuchando: ${transcript}`);
      });
      
      audioService.onEnd((finalTranscript) => {
        setIsListening(false);
        setConversationState('processing');
        setConversationMessage('Analizando respuesta...');
        
        console.log('Respuesta final recibida:', finalTranscript);
        
        // Usar una pausa para procesar la respuesta y dar una sensación más natural
        setTimeout(() => {
          // Analizar respuesta utilizando NLP para una mejor comprensión
          try {
            // Utilizar el servicio NLP para analizar respuesta de forma más precisa
            const result = nlpService.analyzeIntent(finalTranscript.toLowerCase());
            console.log('Análisis NLP:', result);
            
            // Comprobar si la intención es afirmativa
            const isAffirmative = result.intent === 'afirmacion' || 
                              finalTranscript.toLowerCase().includes('sí') || 
                              finalTranscript.toLowerCase().includes('si') ||
                              finalTranscript.toLowerCase().includes('confirmar') ||
                              finalTranscript.toLowerCase().includes('enviar');
                              
            // Comprobar si la intención es negativa
            const isNegative = result.intent === 'negacion' || 
                            finalTranscript.toLowerCase().includes('no') ||
                            finalTranscript.toLowerCase().includes('revisar') ||
                            finalTranscript.toLowerCase().includes('volver');
            
            if (isAffirmative) {
              // Confirmado - enviar respuestas
              setConversationState('confirmed');
              setConversationMessage('Confirmado. Enviando respuestas...');
              
              speakText('Perfecto, estoy enviando tus respuestas ahora.', () => {
                handleSubmit();
              });
            } else if (isNegative) {
              // Volver a revisar
              setConversationState('reviewing');
              setConversationMessage('Volviendo a revisar las preguntas...');
              
              setShowConfirmation(false);
              speakText('De acuerdo, volvamos a revisar las preguntas. Puedes navegar entre ellas usando los botones de anterior y siguiente.', null);
            } else {
              // Respuesta no clara - pedir clarificación
              setConversationState('unclear');
              setConversationMessage('No entendí tu respuesta...');
              
              speakText('No he entendido si deseas confirmar o revisar. Por favor, dime claramente "confirmar" para enviar las respuestas o "revisar" para volver a las preguntas.', () => {
                // Intentar nuevamente después de una pausa 
                setTimeout(() => {
                  listenForConfirmation();
                }, 2000); // Esperar 2 segundos antes de volver a escuchar
              });
            }
          } catch (error) {
            console.error('Error al procesar la respuesta con NLP:', error);
            // Fallback al método simple en caso de error con NLP
            const lowerResponse = finalTranscript.toLowerCase();
            
            if (lowerResponse.includes('sí') || lowerResponse.includes('si') || 
                lowerResponse.includes('confirmar') || lowerResponse.includes('enviar')) {
              speakText('Perfecto, enviando tus respuestas.', () => {
                handleSubmit();
              });
            } else if (lowerResponse.includes('no') || lowerResponse.includes('revisar')) {
              setShowConfirmation(false);
              speakText('De acuerdo, volvamos a revisar las preguntas.', null);
            } else {
              speakText('No he entendido tu respuesta. Por favor, intenta de nuevo.', () => {
                setTimeout(() => {
                  listenForConfirmation();
                }, 2000);
              });
            }
          }
        }, 1500); // Pausa para procesar la respuesta
      });
      
      audioService.onError((errorMessage) => {
        console.error('Error en reconocimiento de voz:', errorMessage);
        setIsListening(false);
        setConversationState('error');
        setConversationMessage(`Error al escuchar: ${errorMessage}`);
        
        speakText('Hubo un problema al escuchar tu confirmación. Por favor, usa los botones en pantalla para confirmar o volver, o intenta hablar más claramente.', null);
      });
      
      // Iniciar el reconocimiento de voz
      audioService.start();
      setIsListening(true);
      setConversationState('listening');
      setConversationMessage('Escuchando tu confirmación...');
      
      // Reproducir un sonido suave para indicar que está listo para escuchar
      try {
        const beep = new Audio('/assets/sounds/listen-beep.mp3');
        beep.volume = 0.3;
        beep.play();
      } catch (error) {
        console.log('No se pudo reproducir el sonido de inicio de escucha');
      }
    }, 3000); // Pausa considerable antes de empezar a escuchar
  };
  
  // Enviar todas las respuestas
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Preparar objeto de respuesta
      const responseData = {
        surveyId: survey._id,
        responses: survey.questions.map((question, index) => ({
          questionId: question._id,
          questionText: question.text,
          responseText: responses[index] || '',
          questionType: question.type
        }))
      };
      
      // Enviar respuesta a la API
      await ResponseService.submitResponse(responseData);
      
      // Mensaje de despedida
      if (voiceEnabled) {
        speakText(survey.farewell || '¡Gracias por completar la encuesta!', () => {
          // Redirigir a página de agradecimiento
          navigate(`/thank-you`, { 
            state: { 
              message: survey.farewell || '¡Gracias por completar la encuesta!' 
            } 
          });
        });
      } else {
        // Redirigir a página de agradecimiento sin hablar
        navigate(`/thank-you`, { 
          state: { 
            message: survey.farewell || '¡Gracias por completar la encuesta!' 
          } 
        });
      }
    } catch (error) {
      console.error('Error al enviar respuestas:', error);
      setError('Ocurrió un error al enviar tus respuestas. Por favor, intenta nuevamente.');
      setIsSubmitting(false);
      
      if (voiceEnabled) {
        speakText('Ha ocurrido un error al enviar tus respuestas. Por favor, intenta nuevamente.', null);
      }
    }
  };
  
  // Renderizar pantalla de carga
  if (loading) {
    return <LoadingSpinner />;
  }
  
  // Renderizar mensaje de error
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  // Si no hay encuesta
  if (!survey) {
    return <ErrorMessage message="No se encontró la encuesta solicitada." />;
  }
  
  // Obtener la pregunta actual
  const currentQuestion = survey.questions[currentQuestionIndex];
  
  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Estado de la conversación - Simplificado */}
      <div className="mb-4 p-3 rounded-lg shadow-sm text-center bg-gray-100">
        <h2 className="text-lg font-bold mb-2">{survey.title}</h2>
        <p className="text-sm mb-3">{survey.description}</p>
        
        {micPermission === 'unknown' && (
          <button
            onClick={requestMicrophonePermission}
            className="px-4 py-2 bg-blue-600 text-white rounded-md mb-2"
          >
            Permitir micrófono para continuar
          </button>
        )}
        
        {micPermission === 'denied' && (
          <p className="text-red-600 mb-2">Se necesita acceso al micrófono para usar la función de voz.</p>
        )}
        
        <p className="font-semibold">
          {showConfirmation 
            ? "Confirmación de respuestas" 
            : `Pregunta ${currentQuestionIndex + 1} de ${survey.questions.length}`}
        </p>
        
        {conversationState !== 'idle' && (
          <p className="mt-2 text-blue-700">{conversationMessage}</p>
        )}
      </div>
      
      {/* Contenido principal (Pregunta o Confirmación) */}
      {showConfirmation ? (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-xl font-bold mb-3">Resumen de respuestas</h3>
          <div className="max-h-60 overflow-y-auto mb-3">
            {survey.questions.map((question, index) => (
              <div key={question._id} className="mb-2 pb-2 border-b border-gray-200">
                <p className="font-medium">Pregunta {index + 1}: {question.text}</p>
                <p className="pl-4">{responses[index] || "(Sin respuesta)"}</p>
              </div>
            ))}
          </div>
          {isListening ? (
            <p className="text-center text-green-700 animate-pulse">
              Di "confirmar" para enviar o "revisar" para volver
            </p>
          ) : (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConversationState('reviewing');
                  setConversationMessage('Revisando preguntas...');
                }}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded mr-2"
                disabled={isSubmitting}
              >
                Revisar
              </button>
              <button
                onClick={handleSubmit}
                className="px-3 py-1 bg-green-600 text-white rounded"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h3 className="text-xl font-bold mb-3">{currentQuestion.text}</h3>
          
          {/* Opciones para preguntas de opción múltiple */}
          {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Opciones:</p>
              <ul className="list-disc pl-5">
                {currentQuestion.options.map((option, idx) => (
                  <li key={idx} className="mb-1">{option}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Respuesta actual */}
          {isListening ? (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-center animate-pulse">
              <p><span className="font-medium">Escuchando</span>: {currentResponse || "..."}</p>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700">Tu respuesta:</p>
              <p className="p-2 bg-gray-50 rounded min-h-10">{currentResponse || "Esperando respuesta por voz..."}</p>
              <button 
                onClick={startListening}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
              >
                Responder por voz
              </button>
            </div>
          )}
          
          {/* Botones de navegación mínimos */}
          <div className="flex justify-between mt-4">
            <button
              onClick={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(currentQuestionIndex - 1);
                  setCurrentResponse(responses[currentQuestionIndex - 1]);
                }
              }}
              disabled={currentQuestionIndex === 0}
              className="px-3 py-1 text-sm rounded disabled:opacity-50"
            >
              ← Anterior
            </button>
            <button
              onClick={() => {
                const updatedResponses = [...responses];
                updatedResponses[currentQuestionIndex] = currentResponse;
                setResponses(updatedResponses);
                
                if (currentQuestionIndex < survey.questions.length - 1) {
                  setCurrentQuestionIndex(currentQuestionIndex + 1);
                  setCurrentResponse('');
                } else {
                  setShowConfirmation(true);
                }
              }}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
            >
              {currentQuestionIndex < survey.questions.length - 1 ? 'Siguiente →' : 'Revisar respuestas'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeSurvey;