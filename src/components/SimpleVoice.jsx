import React, { useState, useEffect, useRef } from 'react';

/**
 * Componente mejorado para síntesis de voz confiable
 */
const SimpleVoice = ({ text, onEnd, autoSpeak = true }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  const synth = useRef(window.speechSynthesis).current;
  const utteranceRef = useRef(null);
  
  // Función principal para hablar texto
  const speak = () => {
    // Validar texto y disponibilidad de síntesis
    if (!text || !text.trim()) {
      console.warn('SimpleVoice: Se intentó sintetizar texto vacío');
      if (onEnd) setTimeout(onEnd, 100);
      return;
    }
    
    if (!synth) {
      console.error('SimpleVoice: API de síntesis de voz no disponible');
      setError('Su navegador no soporta la síntesis de voz');
      if (onEnd) setTimeout(onEnd, 100);
      return;
    }
    
    try {
      // Limpiar síntesis anterior
      synth.cancel();
      
      // Log de depuración
      console.log('SimpleVoice: Iniciando síntesis para:', text);
      
      // Crear y configurar nuevo utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      
      // Configurar idioma en español
      utterance.lang = 'es-ES';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Intentar seleccionar una voz en español
      setTimeout(() => {
        const voices = synth.getVoices();
        const spanishVoice = voices.find(voice => 
          voice.lang.includes('es') || voice.name.includes('Spanish')
        );
        
        if (spanishVoice) {
          console.log('SimpleVoice: Usando voz española:', spanishVoice.name);
          utterance.voice = spanishVoice;
        } else if (voices.length > 0) {
          console.log('SimpleVoice: No se encontró voz española, usando:', voices[0].name);
          utterance.voice = voices[0];
        }
        
        // Configurar eventos
        utterance.onstart = () => {
          console.log('SimpleVoice: Síntesis iniciada');
          setIsSpeaking(true);
          setError(null);
        };
        
        utterance.onend = () => {
          console.log('SimpleVoice: Síntesis finalizada con éxito');
          setIsSpeaking(false);
          if (onEnd) setTimeout(onEnd, 300);
        };
        
        utterance.onerror = (event) => {
          console.error('SimpleVoice: Error en síntesis:', event);
          setIsSpeaking(false);
          setError('Error en la síntesis de voz');
          if (onEnd) setTimeout(onEnd, 300);
        };
        
        // Iniciar síntesis
        synth.speak(utterance);
        
        // Workaround para Chrome (bug de pausa después de 15s)
        const intervalId = setInterval(() => {
          if (synth.speaking) {
            console.log('SimpleVoice: Aplicando workaround para Chrome');
            synth.pause();
            synth.resume();
          } else {
            clearInterval(intervalId);
          }
        }, 10000);
        
        // Workaround para navegadores que no disparan onend
        const maxDuration = Math.max(5000, text.length * 80);
        const timeoutId = setTimeout(() => {
          if (isSpeaking && utteranceRef.current === utterance) {
            console.log('SimpleVoice: Fallback por timeout después de', maxDuration, 'ms');
            setIsSpeaking(false);
            if (onEnd) onEnd();
          }
        }, maxDuration);
        
        // Guardar IDs para limpieza
        utterance.intervalId = intervalId;
        utterance.timeoutId = timeoutId;
      }, 100); // Pequeño retraso para asegurar que las voces estén cargadas
      
    } catch (error) {
      console.error('SimpleVoice: Error al configurar síntesis:', error);
      setIsSpeaking(false);
      setError('Error al configurar la síntesis de voz');
      if (onEnd) setTimeout(onEnd, 100);
    }
  };
  
  // Limpieza de recursos
  const cleanup = () => {
    if (utteranceRef.current) {
      if (utteranceRef.current.intervalId) 
        clearInterval(utteranceRef.current.intervalId);
      if (utteranceRef.current.timeoutId) 
        clearTimeout(utteranceRef.current.timeoutId);
    }
    
    if (synth) {
      synth.cancel();
    }
  };
  
  // Efecto para hablar automáticamente cuando cambia el texto
  useEffect(() => {
    if (autoSpeak && text) {
      speak();
    }
    
    return cleanup;
  }, [text]);
  
  // Efecto de limpieza al desmontar
  useEffect(() => {
    return cleanup;
  }, []);
  
  return (
    <div className={`voice-synthesis ${isSpeaking ? 'speaking' : ''}`}>
      {error && (
        <div className="text-red-500 text-sm mb-2" role="alert">
          {error}
        </div>
      )}
      {isSpeaking && (
        <div className="text-green-500 text-sm animate-pulse">
          Hablando...
        </div>
      )}
    </div>
  );
};

export default SimpleVoice;
