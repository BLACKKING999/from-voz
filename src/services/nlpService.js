import nlp from 'compromise';

/**
 * Servicio de procesamiento de lenguaje natural para mejorar las interacciones por voz
 * Utiliza compromise.js, una biblioteca ligera de NLP para el navegador
 */

// Nota: No se importa el plugin para español porque no se encuentra disponible en la versión actual

/**
 * Extraer nombre de una frase con procesamiento avanzado de lenguaje natural
 * @param {string} text - Texto del cual extraer el nombre
 * @returns {string} - Nombre extraído o valor por defecto
 */
export const extractName = (text) => {
  if (!text || typeof text !== 'string') {
    return 'Estimado participante';
  }

  // Procesar el texto con NLP
  const doc = nlp(text);
  
  // Verificar si es una pregunta
  if (doc.questions().length > 0) {
    console.log('NLP: Se detectó una pregunta en lugar de un nombre');
    return null;
  }
  
  // Intentar extraer nombre propio (mejor precisión que regex)
  const people = doc.people().out('array');
  if (people.length > 0) {
    console.log('NLP: Nombre extraído usando reconocimiento de entidades:', people[0]);
    return people[0];
  }
  
  // Extraer frases de presentación
  const presentationPhrases = ['me llamo', 'mi nombre es', 'soy', 'yo soy', 
    'puedes llamarme', 'puede llamarme', 'llámame', 'llamame'];
  
  let cleanedText = text.trim();
  for (const phrase of presentationPhrases) {
    if (text.toLowerCase().includes(phrase)) {
      // Extraer texto después de la frase
      const parts = text.toLowerCase().split(phrase);
      if (parts.length > 1 && parts[1].trim()) {
        cleanedText = parts[1].trim();
        break;
      }
    }
  }
  
  // Eliminar palabras comunes y saludos
  const commonWords = ['gracias', 'por favor', 'hola', 'buenos días', 'buenas tardes', 'señor', 'señora'];
  commonWords.forEach(word => {
    cleanedText = cleanedText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  
  // Eliminar múltiples espacios y puntuación
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  cleanedText = cleanedText.replace(/[.,;:!?]/g, '').trim();
  
  if (!cleanedText) {
    return 'Estimado participante';
  }
  
  // Tomar las primeras palabras (máximo 3) como nombre
  const words = cleanedText.split(' ');
  const nameWords = words.slice(0, Math.min(3, words.length));
  
  // Capitalizar cada palabra del nombre
  return nameWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Analiza el sentimiento de un texto (positivo, negativo, neutral)
 * @param {string} text - Texto a analizar
 * @returns {Object} - Objeto con el sentimiento y su intensidad
 */
export const analyzeSentiment = (text) => {
  if (!text) return { sentiment: 'neutral', score: 0 };
  
  const doc = nlp(text);
  // compromise no tiene análisis de sentimiento incorporado
  // utilizamos una versión simplificada basada en palabras positivas/negativas
  
  const positiveWords = ['bueno', 'excelente', 'genial', 'perfecto', 'me gusta', 'sí', 'si', 'claro'];
  const negativeWords = ['malo', 'terrible', 'horrible', 'pésimo', 'no me gusta', 'no', 'nunca'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  const lowerText = text.toLowerCase();
  
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) positiveScore++;
  });
  
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) negativeScore++;
  });
  
  const score = (positiveScore - negativeScore) / 5; // Normalizar a un rango aproximado de -1 a 1
  
  let sentiment = 'neutral';
  if (score > 0.2) sentiment = 'positive';
  else if (score < -0.2) sentiment = 'negative';
  
  return { sentiment, score };
};

/**
 * Analiza una respuesta de texto para determinar si es afirmativa o negativa
 * @param {string} text - Texto a analizar
 * @returns {Object} - Resultado del análisis
 */
const analyzeYesNo = (text) => {
  if (!text) return { isYes: false, isNo: false, confidence: 0 };
  
  // Palabras afirmativas en español
  const yesWords = ['sí', 'si', 'claro', 'por supuesto', 'afirmativo', 'efectivamente', 
                   'exacto', 'correcto', 'ok', 'vale', 'bueno', 'cierto'];
  
  // Palabras negativas en español
  const noWords = ['no', 'nunca', 'jamás', 'negativo', 'para nada', 'en absoluto', 
                  'de ninguna manera', 'nada', 'tampoco'];
  
  // Buscar coincidencias
  let yesCount = 0;
  let noCount = 0;
  
  yesWords.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      yesCount++;
    }
  });
  
  noWords.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      noCount++;
    }
  });
  
  // Determinar resultado
  const isYes = yesCount > 0 && yesCount > noCount;
  const isNo = noCount > 0 && noCount >= yesCount;
  
  // Calcular confianza (0-1)
  let confidence = 0;
  if (isYes) {
    confidence = Math.min(yesCount / 3, 1);
  } else if (isNo) {
    confidence = Math.min(noCount / 3, 1);
  }
  
  return { isYes, isNo, confidence };
};

/**
 * Extrae números de un texto
 * @param {string} text - Texto a analizar
 * @returns {Array} - Lista de números encontrados
 */
const extractNumbers = (text) => {
  if (!text) return [];
  
  const doc = nlp(text);
  const numbers = doc.numbers().out('array');
  
  // Intentar extraer números como dígitos
  const digitMatches = text.match(/\d+/g) || [];
  
  // Combinar resultados y eliminar duplicados
  const allNumbers = [...numbers, ...digitMatches];
  const uniqueNumbers = [...new Set(allNumbers)];
  
  return uniqueNumbers.map(num => {
    // Intentar convertir a número
    const parsed = parseFloat(num);
    return isNaN(parsed) ? num : parsed;
  });
};

/**
 * Determina la opción más probable de una lista basada en la respuesta
 * @param {string} text - Texto de respuesta
 * @param {Array} options - Lista de opciones
 * @returns {Object} - Opción seleccionada y nivel de confianza
 */
const findBestMatchingOption = (text, options) => {
  if (!text || !options || options.length === 0) {
    return { selected: null, confidence: 0 };
  }
  
  const normalizedText = text.toLowerCase();
  
  // Buscar coincidencias exactas primero (por número o texto completo)
  const numbers = extractNumbers(normalizedText);
  
  // Si hay un número que corresponde a un índice válido
  if (numbers.length > 0) {
    const index = numbers[0] - 1; // Restar 1 porque los usuarios suelen contar desde 1
    if (index >= 0 && index < options.length) {
      return { selected: options[index], confidence: 0.9 };
    }
  }
  
  // Buscar por texto
  let bestMatch = null;
  let highestConfidence = 0;
  
  options.forEach(option => {
    const optionText = option.toLowerCase();
    
    // Calcular similitud simple basada en inclusión
    if (normalizedText.includes(optionText)) {
      const confidence = optionText.length / normalizedText.length;
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = option;
      }
    } else if (optionText.includes(normalizedText)) {
      const confidence = normalizedText.length / optionText.length * 0.8; // Penalización
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = option;
      }
    }
  });
  
  return { selected: bestMatch, confidence: highestConfidence };
};

/**
 * Analiza la intención del usuario a partir de su respuesta
 * @param {string} text - Texto de entrada
 * @returns {Object} - Objeto con la intención detectada y confianza
 */
export const analyzeIntent = (text) => {
  if (!text) return { intent: 'unknown', confidence: 0 };
  
  const doc = nlp(text);
  
  // Detectar si es una pregunta
  if (doc.questions().length > 0) {
    return { intent: 'question', confidence: 0.9 };
  }
  
  // Detectar afirmación/negación
  const affirmations = ['sí', 'si', 'claro', 'por supuesto', 'afirmativo', 'correcto', 'exacto'];
  const negations = ['no', 'nope', 'negativo', 'para nada', 'en absoluto', 'nunca'];
  
  const lowerText = text.toLowerCase();
  
  for (const word of affirmations) {
    if (lowerText.includes(word)) {
      return { intent: 'affirmation', confidence: 0.85 };
    }
  }
  
  for (const word of negations) {
    if (lowerText.includes(word)) {
      return { intent: 'negation', confidence: 0.85 };
    }
  }
  
  // Detectar números (para preguntas de calificación)
  const numbers = doc.numbers().out('array');
  if (numbers.length > 0) {
    return { intent: 'number', value: numbers[0], confidence: 0.9 };
  }
  
  return { intent: 'statement', confidence: 0.5 };
};

/**
 * Procesa la respuesta para una pregunta según su tipo
 * @param {string} text - Respuesta del usuario
 * @param {string} questionType - Tipo de pregunta ('yesno', 'rating', 'text')
 * @returns {*} - Respuesta procesada (boolean, number o string)
 */
export const processResponse = (text, questionType) => {
  if (!text) return null;
  
  const intent = analyzeIntent(text);
  console.log('NLP: Intención detectada:', intent);
  
  switch (questionType) {
    case 'yesno':
      if (intent.intent === 'affirmation') return true;
      if (intent.intent === 'negation') return false;
      // Analizar el texto para encontrar afirmación/negación más compleja
      const yesNoResult = analyzeYesNo(text);
      return yesNoResult.isYes;
      
    case 'rating':
      if (intent.intent === 'number' && intent.value >= 1 && intent.value <= 5) {
        return intent.value;
      }
      // Extraer número del texto
      const numbers = extractNumbers(text);
      if (numbers.length > 0) {
        let num = parseInt(numbers[0]);
        // Limitar al rango 1-5
        return Math.max(1, Math.min(5, num));
      }
      return null;
      
    case 'text':
    default:
      // Limpiar el texto para obtener la respuesta más relevante
      return text.trim();
  }
};

/**
 * Genera una respuesta personalizada basada en el sentimiento del usuario
 * @param {string} userText - Texto del usuario
 * @param {Array} possibleResponses - Array de posibles respuestas
 * @returns {string} - Respuesta seleccionada
 */
export const generateAdaptiveResponse = (userText, possibleResponses) => {
  const sentiment = analyzeSentiment(userText);
  
  // Clasificar respuestas según el sentimiento
  const positiveResponses = possibleResponses.filter(r => r.tone === 'positive');
  const neutralResponses = possibleResponses.filter(r => r.tone === 'neutral');
  const negativeResponses = possibleResponses.filter(r => r.tone === 'supportive');
  
  // Seleccionar respuesta apropiada según el sentimiento del usuario
  let selectedResponses;
  if (sentiment.sentiment === 'positive') {
    selectedResponses = positiveResponses.length ? positiveResponses : neutralResponses;
  } else if (sentiment.sentiment === 'negative') {
    selectedResponses = negativeResponses.length ? negativeResponses : neutralResponses;
  } else {
    selectedResponses = neutralResponses.length ? neutralResponses : positiveResponses;
  }
  
  // Si no hay respuestas del tipo adecuado, usar cualquiera
  if (!selectedResponses.length) {
    selectedResponses = possibleResponses;
  }
  
  // Elegir aleatoriamente entre las respuestas apropiadas
  const randomIndex = Math.floor(Math.random() * selectedResponses.length);
  return selectedResponses[randomIndex].text;
};

export default {
  extractName,
  analyzeIntent,
  processResponse,
  analyzeSentiment,
  generateAdaptiveResponse,
  analyzeYesNo,
  extractNumbers,
  findBestMatchingOption
};
