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
  
  // Referencias para controlar el flujo
  const hasInitializedRef = useRef(false);
  const hasPlayedWelcomeRef = useRef(false);
  const speakTimeoutRef = useRef(null);
  const questionSpeakingRef = useRef(false);
  const [surveyLoaded, setSurveyLoaded] = useState(false);
  
  // Estados
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState([]);
  const [respondentName, setRespondentName] = useState('');
  const [nameAsked, setNameAsked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [conversationState, setConversationState] = useState('idle'); // idle, speaking, listening, processing
  const [conversationMessage, setConversationMessage] = useState('');
  const [micPermission, setMicPermission] = useState('unknown'); // 'unknown', 'granted', 'denied'
  const [status, setStatus] = useState('');
  const [currentTransitionPhrase, setCurrentTransitionPhrase] = useState('');
  const [currentFarewellPhrase, setCurrentFarewellPhrase] = useState("");

  
  // Cargar la encuesta
  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const data = await SurveyService.getPublicSurvey(surveyId);
        setSurvey(data);
        // Inicializar respuestas vacías
        setResponses(new Array(data.questions.length).fill(''));
      } catch (error) {
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
      hasInitializedRef.current = false;
      hasPlayedWelcomeRef.current = false;
      questionSpeakingRef.current = false;
      
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [surveyId]);
  
  // Detectar si es un dispositivo móvil, especialmente Android
  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };
  
  const isAndroidDevice = () => {
    return /Android/i.test(navigator.userAgent);
  };
  
  // Configurar tiempos específicos para dispositivos móviles
  useEffect(() => {
    if (isMobileDevice()) {
      // Configuración específica para dispositivos móviles
      const mobileConfig = {
        silenceThreshold: 3000, // 3 segundos sin hablar para terminar (más tiempo en móviles)
        speakingTimeout: 15000, // 15 segundos máximo de espera
        volumeThreshold: isAndroidDevice() ? 2 : 3 // Umbral más bajo para Android (más sensible)
      };
      
      // Aplicar configuración optimizada para móviles
      audioService.setTimingConfig(mobileConfig);
      
      // Si es Android, usar una configuración de reconocimiento más agresiva
      if (isAndroidDevice()) {
        audioService.setMobileMode(true);
      }
    }
  }, []);
  
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
    "No te me adelantes, que la sorpresa está por explotar."
  ];

  // Función para obtener una frase de transición aleatoria
  const getRandomTransitionPhrase = () => {
    const randomIndex = Math.floor(Math.random() * transitionPhrases.length);
    return transitionPhrases[randomIndex];
  };

  // Iniciar la encuesta una vez que está cargada y tenemos permiso del micrófono
  useEffect(() => {
    // Solo iniciar si tenemos encuesta, voz habilitada, permiso, y no hemos iniciado antes
    if (survey && voiceEnabled && micPermission === 'granted' && !hasInitializedRef.current && !loading) {
      hasInitializedRef.current = true;
      
      // Dar un mensaje de bienvenida y preguntar el nombre
      if (survey.welcomeMessage && !hasPlayedWelcomeRef.current) {
        hasPlayedWelcomeRef.current = true;
        speakText(survey.welcomeMessage, () => {
          // Preguntar el nombre después de la bienvenida
          askForName();
        });
      } else {
        // Si no hay mensaje de bienvenida, preguntar directamente el nombre
        askForName();
      }
    }
  }, [survey, voiceEnabled, micPermission, loading]);
  
  // Función para preguntar el nombre al usuario
  const askForName = () => {
    if (!nameAsked) {
      setNameAsked(true);
      speakText('¿Podrías decirme tu nombre, por favor?', () => {
        listenForName();
      });
    } else {
      // Si ya se preguntó el nombre, continuar con la primera pregunta
      speakCurrentQuestion();
    }
  };
  
  // Escuchar el nombre del usuario
  const listenForName = () => {
    if (!voiceEnabled) return;
    
    audioService.init('es-ES');
    
    audioService.onResult((transcript, isFinal) => {
      setCurrentResponse(transcript);
      setStatus(isFinal ? 'Procesando...' : 'Escuchando...');
    });
    
    audioService.onEnd((finalTranscript) => {
      setIsListening(false);
      setConversationState('processing');
      setConversationMessage('Procesando nombre...');
      
      // Extraer el nombre usando nlpService
      if (finalTranscript && finalTranscript.trim() !== '') {
        const extractedName = nlpService.extractName(finalTranscript);
        if (extractedName && extractedName !== 'Estimado participante') {
          setRespondentName(extractedName);
          setCurrentResponse('');
          speakText(`Gracias, ${extractedName}. Comenzaremos con la primera pregunta.`, () => {
            speakCurrentQuestion();
          });
        } else {
          setRespondentName('Anónimo');
          setCurrentResponse('');
          speakText('No pude entender tu nombre. Te llamaré Anónimo por ahora. Comencemos con la primera pregunta.', () => {
            speakCurrentQuestion();
          });
        }
      } else {
        setRespondentName('Anónimo');
        setCurrentResponse('');
        speakText('No escuché tu nombre. Te llamaré Anónimo por ahora. Comencemos con la primera pregunta.', () => {
          speakCurrentQuestion();
        });
      }
    });
    
    audioService.onError((errorMessage) => {
      setIsListening(false);
      setConversationState('error');
      setConversationMessage(`Error: ${errorMessage}`);
      // En caso de error, seguir con el nombre anónimo
      setRespondentName('Anónimo');
      speakText('Hubo un problema al captar tu nombre. Te llamaré Anónimo por ahora. Comencemos con la primera pregunta.', () => {
        speakCurrentQuestion();
      });
    });
    
    try {
      audioService.start();
      setIsListening(true);
      setConversationState('listening');
      setConversationMessage('Escuchando tu nombre...');
    } catch (error) {
      setRespondentName('Anónimo');
      speakText('No pude activar el micrófono. Te llamaré Anónimo por ahora. Comencemos con la primera pregunta.', () => {
        speakCurrentQuestion();
      });
    }
  };
  
  // Solicitar permiso del micrófono
  const requestMicrophonePermission = async () => {
    setConversationState('requesting_permission');
    setConversationMessage('Solicitando permiso para el micrófono...');
    
    try {
      const permissionGranted = await audioService.requestMicrophonePermission();
      
      if (permissionGranted) {
        setMicPermission('granted');
        setConversationMessage('Permiso concedido. Iniciando encuesta por voz...');
      } else {
        setMicPermission('denied');
        setConversationState('permission_denied');
        setConversationMessage('Se necesita acceso al micrófono para usar la función de voz');
      }
    } catch (error) {
      setMicPermission('denied');
      setConversationState('error');
      setConversationMessage('Error al solicitar permiso del micrófono');
    }
  };
  
  // Función para hablar el texto usando el servicio de audio
  const speakText = (text, onEndCallback) => {
    if (!voiceEnabled) {
      if (onEndCallback) onEndCallback();
      return;
    }
    
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
    setIsListening(false);
    
    // Pequeña pausa antes de hablar
    speakTimeoutRef.current = setTimeout(() => {
      setConversationState('speaking');
      setConversationMessage('Hablando: ' + text.substring(0, 30) + (text.length > 30 ? '...' : ''));
      
      audioService.speakText(
        text,
        () => {
          if (text.includes('Pregunta')) {
            questionSpeakingRef.current = true;
          }
        },
        () => {
          setConversationState('idle');
          
          // Marcar que ya no está hablando la pregunta
          if (questionSpeakingRef.current) {
            questionSpeakingRef.current = false;
          }
          
          // Llamar al callback después de hablar, si existe
          if (onEndCallback) {
            onEndCallback();
          }
        },
        (error) => {
          setConversationState('error');
          setConversationMessage(`Error: ${error}`);
          
          // En caso de error, intentar continuar
          if (onEndCallback) {
            onEndCallback();
          }
        }
      );
    }, 300);
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
    
    speakText(questionText, null);
  };
  
  // Función para iniciar la escucha de la respuesta del usuario
  const startListening = async () => {
    if (!voiceEnabled) return;
    
    // Si está hablando la pregunta, esperar a que termine
    if (questionSpeakingRef.current) {
      setConversationMessage('Espera a que termine de leer la pregunta...');
      return;
    }
    
    if (!audioService.isSupportedByBrowser()) {
      setError('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    if (micPermission !== 'granted') {
      await requestMicrophonePermission();
      return;
    }
    
    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Inicializar el reconocimiento de voz con el idioma español
    audioService.init('es-ES');
    
    audioService.onResult((transcript, isFinal) => {
      setCurrentResponse(transcript);
      setStatus(isFinal ? 'Procesando...' : 'Escuchando...');
    });
    
    audioService.onEnd((finalTranscript) => {
      setIsListening(false);
      setConversationState('processing');
      setConversationMessage('Reconocimiento finalizado');
      
      // Guardar la respuesta
      if (finalTranscript && finalTranscript.trim() !== '') {
        // Guardar respuesta en el array de respuestas
        const updatedResponses = [...responses];
        updatedResponses[currentQuestionIndex] = finalTranscript;
        setResponses(updatedResponses);
        
        // Actualizar respuesta actual mostrada
        setCurrentResponse(finalTranscript);
      }
    });
    
    audioService.onError((errorMessage) => {
      setIsListening(false);
      setConversationState('error');
      setConversationMessage(`Error: ${errorMessage}`);
    });
    
    try {
      const started = await audioService.start();
      if (started) {
        setIsListening(true);
        setConversationState('listening');
        setConversationMessage('Escuchando tu respuesta...');
      } else {
        setError('No se pudo iniciar el reconocimiento de voz');
        setConversationState('idle');
      }
    } catch (error) {
      setError(`Error al iniciar reconocimiento: ${error.message || 'Error desconocido'}`);
      setConversationState('idle');
    }
  };
  
  // Detener la escucha de voz
  const stopListening = () => {
    if (isListening) {
      audioService.stop();
      setIsListening(false);
      setConversationState('idle');
      setConversationMessage('Escucha detenida');
    }
  };
  
  // Navegar a la siguiente pregunta
  const goToNextQuestion = () => {
    // Guardar la respuesta actual
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = currentResponse;
    setResponses(updatedResponses);
    
    // Parar la escucha si está activa
    if (isListening) {
      audioService.stop();
      setIsListening(false);
    }
    
    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    
    // Avanzar a la siguiente pregunta o mostrar confirmación
    if (currentQuestionIndex < survey.questions.length - 1) {
      // Primero actualizamos el índice
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setCurrentResponse(responses[nextIndex] || '');
      
      // Si es la segunda pregunta o posterior, seleccionamos una frase de transición aleatoria
      if (nextIndex >= 1) {
        const randomPhrase = getRandomTransitionPhrase();
        setCurrentTransitionPhrase(randomPhrase);
        
        // Esperamos a que React actualice el estado y luego leemos la nueva pregunta con la frase de transición
        setTimeout(() => {
          if (voiceEnabled) {
            // Primero decimos la frase de transición y luego la pregunta
            speakText(randomPhrase, () => {
              // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
              const nextQuestion = survey.questions[nextIndex];
              if (nextQuestion) {
                let questionText = `Pregunta ${nextIndex + 1}: ${nextQuestion.text}`;
                
                // Agregar información sobre opciones si es pregunta de opción múltiple
                if (nextQuestion.type === 'multiple_choice' && nextQuestion.options) {
                  questionText += '. Las opciones son: ';
                  questionText += nextQuestion.options.map((option, idx) => 
                    `Opción ${idx + 1}: ${option}`
                  ).join(', ');
                }
                
                speakText(questionText, null);
              }
            });
          }
        }, 300);
      } else {
        // Si es la primera pregunta, no mostramos frase de transición
        setTimeout(() => {
          if (voiceEnabled) {
            // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
            const nextQuestion = survey.questions[nextIndex];
            if (nextQuestion) {
              let questionText = `Pregunta ${nextIndex + 1}: ${nextQuestion.text}`;
              
              // Agregar información sobre opciones si es pregunta de opción múltiple
              if (nextQuestion.type === 'multiple_choice' && nextQuestion.options) {
                questionText += '. Las opciones son: ';
                questionText += nextQuestion.options.map((option, idx) => 
                  `Opción ${idx + 1}: ${option}`
                ).join(', ');
              }
              
              speakText(questionText, null);
            }
          }
        }, 300);
      }
      
    } else {
      // Si es la última pregunta, mostrar confirmación
      setShowConfirmation(true);
      if (voiceEnabled) {
        speakText('Hemos terminado todas las preguntas. Ahora te mostraré un resumen de tus respuestas para que las confirmes.', () => {
          speakConfirmationSummary();
        });
      }
    }
  };
  
  // Navegar a la pregunta anterior
  const goToPreviousQuestion = () => {
    if (currentQuestionIndex <= 0) return;
    
    // Guardar la respuesta actual
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = currentResponse;
    setResponses(updatedResponses);
    
    // Parar la escucha si está activa
    if (isListening) {
      audioService.stop();
      setIsListening(false);
    }
    
    // Detener cualquier síntesis de voz en curso
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    if (speakTimeoutRef.current) {
      clearTimeout(speakTimeoutRef.current);
      speakTimeoutRef.current = null;
    }
    
    // Ir a la pregunta anterior
    const prevIndex = currentQuestionIndex - 1;
    setCurrentQuestionIndex(prevIndex);
    setCurrentResponse(responses[prevIndex] || '');
    
    // Esperamos a que React actualice el estado y luego leemos la nueva pregunta
    setTimeout(() => {
      if (voiceEnabled) {
        // Obtener directamente la pregunta del array para asegurarnos de leer la correcta
        const prevQuestion = survey.questions[prevIndex];
        if (prevQuestion) {
          let questionText = `Pregunta ${prevIndex + 1}: ${prevQuestion.text}`;
          
          // Agregar información sobre opciones si es pregunta de opción múltiple
          if (prevQuestion.type === 'multiple_choice' && prevQuestion.options) {
            questionText += '. Las opciones son: ';
            questionText += prevQuestion.options.map((option, idx) => 
              `Opción ${idx + 1}: ${option}`
            ).join(', ');
          }
          
          speakText(questionText, null);
        }
      }
    }, 300);
  };
  
  // Leer el resumen de confirmación
  const speakConfirmationSummary = () => {
    if (!voiceEnabled || !showConfirmation) return;
    
    let summaryText = 'Resumen de tus respuestas: ';
    
    survey.questions.forEach((question, index) => {
      summaryText += `Pregunta ${index + 1}: ${question.text}. Tu respuesta: ${responses[index] || "Sin respuesta"}. `;
    });
    
    summaryText += '¿Deseas enviar estas respuestas o volver para revisar alguna?';
    
    speakText(summaryText, null);
  };
  
  // Escuchar la confirmación del usuario - activada por botón
  const listenForConfirmation = () => {
    if (!voiceEnabled) return;
    
    // Iniciar escucha directamente
    setConversationState('waiting');
    setConversationMessage('Esperando confirmación...');
    
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
      
      // Analizar respuesta
      setTimeout(() => {
        try {
          // Utilizar el servicio NLP para analizar respuesta
          const result = nlpService.analyzeIntent(finalTranscript.toLowerCase());
          
          // Usar el resultado del análisis NLP para determinar la intención
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
            speakText('De acuerdo, volvamos a revisar las preguntas.', null);
          } else {
            // Respuesta no clara
            setConversationState('unclear');
            setConversationMessage('No entendí tu respuesta, intenta de nuevo o usa los botones');
          }
        } catch (error) {
          // Fallback simple en caso de error
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
            setConversationMessage('No entendí tu respuesta, intenta de nuevo o usa los botones');
          }
        }
      }, 100);
    });
    
    audioService.onError((errorMessage) => {
      setIsListening(false);
      setConversationState('error');
      setConversationMessage(`Error al escuchar: ${errorMessage}`);
    });
    
    // Iniciar el reconocimiento de voz
    audioService.start();
    setIsListening(true);
    setConversationState('listening');
    setConversationMessage('Escuchando tu confirmación...');
    
    // Reproducir un sonido para indicar que está listo
    try {
      const beep = new Audio('/assets/sounds/listen-beep.mp3');
      beep.volume = 0.9;
      beep.play();
    } catch (error) {
      // No se pudo reproducir el sonido de inicio de escucha
    }
  };
  
  // Enviar todas las respuestas
  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Preparar objeto de respuesta
      const responseData = {
        surveyId: survey._id,
        respondentName: respondentName || 'Anónimo',
        userAgent: navigator.userAgent,
        answers: survey.questions.map((question, index) => ({
          questionId: question._id,
          value: responses[index] || ''
        }))
      };
      
      // Enviar respuesta a la API
      await ResponseService.submitResponse(responseData);
      
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
  "Listo, ¡nos vemos en la próxima!"
];
// Función para obtener una frase de despedida aleatoria
const getRandomFarewellPhrase = () => {
  const randomIndex = Math.floor(Math.random() * farewellPhrases.length);
  return farewellPhrases[randomIndex];
};

const randomFarewell = getRandomFarewellPhrase();
setCurrentFarewellPhrase(randomFarewell);


      // Mensaje de despedida
      if (voiceEnabled) {
        speakText(randomFarewell, () => {
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
        {respondentName && <p className="text-sm font-semibold">Nombre: {respondentName}</p>}
        
        {/* Controles de voz */}
        <div className="mb-3 flex flex-wrap justify-center gap-2">
          {micPermission === 'unknown' ? (
            <button
              onClick={requestMicrophonePermission}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Permitir micrófono para continuar
            </button>
          ) : micPermission === 'denied' ? (
            <p className="text-red-600 mb-2">Se necesita acceso al micrófono para usar la función de voz.</p>
          ) : (
            <>
              <button
                onClick={isListening ? stopListening : startListening}
                className={`px-4 py-2 ${isListening ? 'bg-red-600' : 'bg-blue-600'} text-white rounded-md`}
                disabled={conversationState === 'speaking'}
              >
                {isListening ? 'Detener escucha' : 'Registrar respuesta'}
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`px-4 py-2 ${voiceEnabled ? 'bg-gray-700' : 'bg-gray-400'} text-white rounded-md`}
              >
                {voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
              </button>
            </>
          )}
        </div>
        
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
          
          {/* Controles específicos para confirmación */}
          <div className="mt-4 flex justify-center gap-2">
            {isListening ? (
              <>
                <p className="text-center text-green-700 animate-pulse">
                  Di "confirmar" para enviar o "revisar" para volver
                </p>
                <button
                  onClick={stopListening}
                  className="px-3 py-1 bg-red-600 text-white rounded ml-2"
                >
                  Detener escucha
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={listenForConfirmation}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                  disabled={isSubmitting}
                >
                  Responder por voz
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setConversationState('reviewing');
                    setConversationMessage('Revisando preguntas...');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded"
                  disabled={isSubmitting}
                >
                  Revisar
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-green-600 text-white rounded"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando...' : 'Confirmar'}
                </button>
              </>
            )}
          </div>
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
          
          {/* Mostrar frase de transición si existe y estamos en la pregunta 2 o superior */}
          {currentQuestionIndex >= 1 && currentTransitionPhrase && (
            <div className="my-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-blue-700 font-medium">{currentTransitionPhrase}</p>
            </div>
          )}
          
          {/* Respuesta actual */}
          <div className={`mt-3 p-3 ${isListening ? 'bg-green-50 border border-green-200 animate-pulse' : 'bg-gray-50 border border-gray-200'} rounded-md`}>
            <p className="text-sm font-medium text-gray-700 mb-1">Tu respuesta:</p>
            <p className="min-h-10">
              {isListening 
                ? <span className="text-green-600">{currentResponse || "Escuchando..."}</span>
                : currentResponse || "(Sin respuesta)"}
            </p>
          </div>
          
          {/* Botones de navegación */}
          <div className="flex justify-between mt-4">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              ← Anterior
            </button>
            <button
              onClick={goToNextQuestion}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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