import nlp from 'compromise';

/**
 * Servicio de procesamiento de lenguaje natural para mejorar las interacciones por voz
 * Utiliza compromise.js, una biblioteca ligera de NLP para el navegador
 * Mejorado para manejar los tipos de preguntas del esquema de MongoDB: 'open', 'single', 'multiple', 'rating', 'yesno'
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
  
  const positiveWords = ['bueno', 'excelente', 'genial', 'perfecto', 'me gusta', 'sí', 'si', 'claro',
                         'fantástico', 'magnífico', 'estupendo', 'maravilloso', 'satisfecho', 'feliz',
                         'alegre', 'contento', 'positivo', 'agradable', 'bien', 'favorable'];
  
  const negativeWords = ['malo', 'terrible', 'horrible', 'pésimo', 'no me gusta', 'no', 'nunca',
                         'desagradable', 'deficiente', 'decepcionante', 'insatisfactorio', 'triste',
                         'enojado', 'frustrado', 'molesto', 'insuficiente', 'mediocre', 'mal', 'peor'];
  
  let positiveScore = 0;
  let negativeScore = 0;
  
  const lowerText = text.toLowerCase();
  
  // Buscar palabras positivas y calcular su peso según la posición y repetición
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const count = matches.length;
      positiveScore += count;
      
      // Dar mayor peso si está al inicio o final de la frase
      if (lowerText.startsWith(word) || lowerText.endsWith(word)) {
        positiveScore += 0.5;
      }
    }
  });
  
  // Buscar palabras negativas
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      const count = matches.length;
      negativeScore += count;
      
      // Dar mayor peso si está al inicio o final de la frase
      if (lowerText.startsWith(word) || lowerText.endsWith(word)) {
        negativeScore += 0.5;
      }
    }
  });
  
  // Ajustar por negaciones que invierten el sentimiento
  const negations = ['no', 'nunca', 'tampoco', 'ni'];
  negations.forEach(negation => {
    const negPattern = new RegExp(`${negation}\\s+\\w+`, 'gi');
    const matches = lowerText.match(negPattern);
    
    if (matches) {
      // Por cada coincidencia de negación, verificar si afecta a palabras de sentimiento
      matches.forEach(match => {
        const negatedWord = match.split(/\s+/)[1];
        
        // Si niega una palabra positiva, reducir el positivo y aumentar el negativo
        if (positiveWords.some(word => negatedWord && negatedWord.includes(word))) {
          positiveScore = Math.max(0, positiveScore - 1);
          negativeScore += 0.5;
        }
        
        // Si niega una palabra negativa, reducir el negativo y aumentar el positivo
        if (negativeWords.some(word => negatedWord && negatedWord.includes(word))) {
          negativeScore = Math.max(0, negativeScore - 1);
          positiveScore += 0.5;
        }
      });
    }
  });
  
  // Normalizar a un rango aproximado de -1 a 1
  const totalScore = positiveScore + negativeScore;
  const score = totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0;
  
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
                   'exacto', 'correcto', 'ok', 'vale', 'bueno', 'cierto', 'verdad',
                   'desde luego', 'así es', 'sin duda', 'obviamente', 'naturalmente'];
  
  // Palabras negativas en español
  const noWords = ['no', 'nunca', 'jamás', 'negativo', 'para nada', 'en absoluto', 
                  'de ninguna manera', 'nada', 'tampoco', 'ni hablar', 'qué va',
                  'en absoluto', 'de ningún modo'];
  
  // Buscar coincidencias
  let yesCount = 0;
  let noCount = 0;
  let yesWeight = 0;
  let noWeight = 0;
  
  const lowerText = text.toLowerCase();
  
  // Analizar palabras afirmativas con peso
  yesWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      yesCount += matches.length;
      
      // Más peso a expresiones completas
      if (word.includes(' ')) {
        yesWeight += matches.length * 1.5;
      } else {
        yesWeight += matches.length;
      }
      
      // Más peso si está al inicio
      if (lowerText.startsWith(word)) {
        yesWeight += 0.5;
      }
    }
  });
  
  // Analizar palabras negativas con peso
  noWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      noCount += matches.length;
      
      // Más peso a expresiones completas
      if (word.includes(' ')) {
        noWeight += matches.length * 1.5;
      } else {
        noWeight += matches.length;
      }
      
      // Más peso si está al inicio
      if (lowerText.startsWith(word)) {
        noWeight += 0.5;
      }
    }
  });
  
  // Analizar frases mixtas que pueden ser confusas
  const complexPatterns = [
    {pattern: 'no.*sí', isNo: false, isYes: true, weight: 1.5},
    {pattern: 'sí.*no', isNo: true, isYes: false, weight: 1.5},
    {pattern: 'no.*claro', isNo: true, isYes: false, weight: 1.2},
    {pattern: 'claro que no', isNo: true, isYes: false, weight: 2},
    {pattern: 'por supuesto que no', isNo: true, isYes: false, weight: 2}
  ];
  
  complexPatterns.forEach(({pattern, isNo: patternIsNo, isYes: patternIsYes, weight}) => {
    if (new RegExp(pattern, 'i').test(lowerText)) {
      if (patternIsYes) yesWeight += weight;
      if (patternIsNo) noWeight += weight;
    }
  });
  
  // Determinar resultado
  const isYes = yesWeight > 0 && yesWeight > noWeight;
  const isNo = noWeight > 0 && noWeight >= yesWeight;
  
  // Calcular confianza (0-1)
  let confidence = 0;
  if (isYes) {
    confidence = Math.min(yesWeight / 3, 1);
  } else if (isNo) {
    confidence = Math.min(noWeight / 3, 1);
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
  const digitMatches = text.match(/\d+(\.\d+)?/g) || [];
  
  // Extraer números textuales en español
  const spanishNumbers = {
    'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
    'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9, 'diez': 10,
    'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14, 'quince': 15,
    'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19, 'veinte': 20
  };
  
  const textualNumbers = [];
  const lowerText = text.toLowerCase();
  
  Object.entries(spanishNumbers).forEach(([word, value]) => {
    if (lowerText.includes(word)) {
      textualNumbers.push(value);
    }
  });
  
  // Combinar resultados y eliminar duplicados
  const allNumbers = [...numbers, ...digitMatches, ...textualNumbers];
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
  
  // Buscar coincidencias por texto
  let bestMatch = null;
  let highestConfidence = 0;
  
  options.forEach((option, index) => {
    const optionText = option.toLowerCase();
    
    // 1. Coincidencia exacta
    if (normalizedText === optionText) {
      return { selected: option, confidence: 1.0 };
    }
    
    // 2. Verificar si la opción está contenida en el texto
    if (normalizedText.includes(optionText)) {
      const confidence = Math.min(optionText.length / normalizedText.length + 0.3, 1.0);
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = option;
      }
    } 
    // 3. Verificar si el texto está contenido en la opción
    else if (optionText.includes(normalizedText)) {
      const confidence = Math.min(normalizedText.length / optionText.length * 0.8, 0.8); // Penalización
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = option;
      }
    }
    // 4. Análisis de palabras en común
    else {
      const textWords = normalizedText.split(/\s+/);
      const optionWords = optionText.split(/\s+/);
      
      // Contar palabras coincidentes
      let matchingWords = 0;
      textWords.forEach(word => {
        if (word.length > 2 && optionWords.some(oWord => oWord.includes(word) || word.includes(oWord))) {
          matchingWords++;
        }
      });
      
      if (matchingWords > 0) {
        const confidence = Math.min(matchingWords / Math.max(textWords.length, optionWords.length) * 0.7, 0.7);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = option;
        }
      }
    }
    
    // 5. Si el texto menciona el número de la opción como "opción 1" o similar
    const optionReferences = [
      `opción ${index + 1}`, 
      `opcion ${index + 1}`, 
      `alternativa ${index + 1}`,
      `la ${index + 1}`,
      `el ${index + 1}`
    ];
    
    for (const ref of optionReferences) {
      if (normalizedText.includes(ref)) {
        const confidence = 0.85;
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = option;
        }
      }
    }
  });
  
  return { selected: bestMatch, confidence: highestConfidence };
};

/**
 * Extrae múltiples opciones seleccionadas de un texto
 * @param {string} text - Texto de respuesta
 * @param {Array} options - Lista de opciones disponibles
 * @returns {Array} - Lista de opciones seleccionadas con su nivel de confianza
 */
const extractMultipleOptions = (text, options) => {
  if (!text || !options || options.length === 0) {
    return [];
  }
  
  const normalizedText = text.toLowerCase();
  const results = [];
  
  // Extraer números que podrían ser índices
  const numbers = extractNumbers(normalizedText);
  const selectedIndices = numbers
    .filter(num => Number.isInteger(num) && num >= 1 && num <= options.length)
    .map(num => num - 1); // Ajustar índice
  
  // Agregar opciones por índice numérico
  selectedIndices.forEach(index => {
    results.push({
      selected: options[index],
      confidence: 0.9
    });
  });
  
  // Buscar coincidencias por texto para cada opción
  options.forEach((option, index) => {
    // Evitar duplicados si ya fue agregado por índice
    if (selectedIndices.includes(index)) {
      return;
    }
    
    const optionText = option.toLowerCase();
    
    // Coincidencia por texto
    if (normalizedText.includes(optionText)) {
      const confidence = Math.min(optionText.length / normalizedText.length + 0.2, 0.9);
      results.push({
        selected: option,
        confidence
      });
    }
  });
  
  // Buscar referencias a "todas", "ninguna", etc.
  const allOptions = ['todas', 'todas las opciones', 'todas las anteriores'];
  const noOptions = ['ninguna', 'ninguna de las anteriores', 'ninguna opción'];
  
  for (const all of allOptions) {
    if (normalizedText.includes(all)) {
      return options.map(option => ({
        selected: option,
        confidence: 0.95
      }));
    }
  }
  
  for (const none of noOptions) {
    if (normalizedText.includes(none)) {
      return [];
    }
  }
  
  return results;
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
  const affirmations = ['sí', 'si', 'claro', 'por supuesto', 'afirmativo', 'correcto', 'exacto', 'ok', 'vale'];
  const negations = ['no', 'nope', 'negativo', 'para nada', 'en absoluto', 'nunca', 'jamás'];
  
  const lowerText = text.toLowerCase();
  
  // Verificar comandos específicos
  const commands = {
    'help': ['ayuda', 'ayúdame', 'necesito ayuda', 'cómo funciona'],
    'repeat': ['repite', 'repetir', 'otra vez', 'no entendí', 'no escuché', 'vuelve a decir'],
    'skip': ['saltar', 'siguiente', 'omitir', 'pasar', 'siguiente pregunta'],
    'back': ['atrás', 'anterior', 'volver', 'regresar', 'pregunta anterior'],
    'stop': ['detener', 'parar', 'terminar', 'finalizar', 'acabar', 'salir']
  };
  
  for (const [intent, phrases] of Object.entries(commands)) {
    for (const phrase of phrases) {
      if (lowerText.includes(phrase)) {
        return { intent, confidence: 0.9 };
      }
    }
  }
  
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
  
  // Detectar si es un texto de lista (para opciones múltiples)
  const listPatterns = [', ', ' y ', ' e ', ' ni ', ' también ', ' además '];
  let isListLike = false;
  
  for (const pattern of listPatterns) {
    if (lowerText.includes(pattern)) {
      isListLike = true;
      break;
    }
  }
  
  if (isListLike) {
    return { intent: 'list', confidence: 0.75 };
  }
  
  return { intent: 'statement', confidence: 0.5 };
};

/**
 * Procesa la respuesta para una pregunta según su tipo
 * @param {string} text - Respuesta del usuario
 * @param {string} questionType - Tipo de pregunta ('open', 'single', 'multiple', 'rating', 'yesno')
 * @param {Array} options - Opciones disponibles para preguntas de selección
 * @returns {*} - Respuesta procesada según el tipo de pregunta
 */
export const processResponse = (text, questionType, options = []) => {
  if (!text) return null;
  
  const intent = analyzeIntent(text);
  console.log('NLP: Intención detectada:', intent);
  
  switch (questionType) {
    case 'yesno':
      if (intent.intent === 'affirmation') return true;
      if (intent.intent === 'negation') return false;
      // Analizar el texto para encontrar afirmación/negación más compleja
      const yesNoResult = analyzeYesNo(text);
      if (yesNoResult.confidence >= 0.5) {
        return yesNoResult.isYes;
      }
      // Si la confianza es baja, intentar con análisis de sentimiento
      const sentiment = analyzeSentiment(text);
      return sentiment.sentiment === 'positive';
      
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
      
      // Mapear expresiones comunes a valores numéricos
      const ratingMap = {
        'muy mal': 1,
        'mal': 2,
        'regular': 3,
        'bien': 4,
        'muy bien': 5,
        'excelente': 5,
        'pésimo': 1,
        'terrible': 1,
        'bueno': 4,
        'aceptable': 3,
        'deficiente': 2
      };
      
      const lowerText = text.toLowerCase();
      for (const [phrase, value] of Object.entries(ratingMap)) {
        if (lowerText.includes(phrase)) {
          return value;
        }
      }
      
      // Si no se encuentra un valor numérico, usar análisis de sentimiento
      const sentimentResult = analyzeSentiment(text);
      if (sentimentResult.sentiment === 'positive') {
        return 4; // Valor positivo por defecto
      } else if (sentimentResult.sentiment === 'negative') {
        return 2; // Valor negativo por defecto
      } else {
        return 3; // Valor neutral por defecto
      }
      
    case 'multiple':
      if (!options || options.length === 0) {
        return text.trim(); // Si no hay opciones, devolver el texto
      }
      return extractMultipleOptions(text, options);
      
    case 'open':
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
  
  // Elegir aleatoriamente entre las respuestas apropiadas, con mayor probabilidad para las más relevantes
  selectedResponses.sort((a, b) => {
    // Dar prioridad a respuestas con más contexto
    const aHasContext = a.context && userText.toLowerCase().includes(a.context.toLowerCase());
    const bHasContext = b.context && userText.toLowerCase().includes(b.context.toLowerCase());
    
    if (aHasContext && !bHasContext) return -1;
    if (!aHasContext && bHasContext) return 1;
    
    return 0;
  });
  
  // Si hay respuestas con contexto relevante, priorizar esas
  const contextualized = selectedResponses.filter(r => 
    r.context && userText.toLowerCase().includes(r.context.toLowerCase())
  );
  
  if (contextualized.length > 0) {
    const randomIndex = Math.floor(Math.random() * Math.min(contextualized.length, 3));
    return contextualized[randomIndex].text;
  }
  
  // Elegir entre las respuestas generales
  const randomIndex = Math.floor(Math.random() * selectedResponses.length);
  return selectedResponses[randomIndex].text;
};

/**
 * Verifica si una respuesta es válida según el tipo de pregunta
 * @param {string} text - Texto de respuesta
 * @param {string} questionType - Tipo de pregunta
 * @param {Array} options - Opciones disponibles para preguntas de selección
 * @returns {Object} - Validez de la respuesta y mensaje de error
 */
export const validateResponse = (text, questionType, options = []) => {
  if (!text) {
    return { isValid: false, message: 'No se detectó ninguna respuesta.' };
  }
  
  switch (questionType) {
    case 'yesno':
      const yesNoResult = analyzeYesNo(text);
      if (yesNoResult.confidence < 0.4) {
        return { 
          isValid: false, 
          message: 'No se pudo determinar si su respuesta es afirmativa o negativa. Por favor, responda con sí o no.'
        };
      }
      return { isValid: true };
      
    case 'rating':
      const numbers = extractNumbers(text);
      if (numbers.length === 0) {
        return { 
          isValid: false, 
          message: 'Por favor, proporcione una calificación numérica del 1 al 5.' 
        };
      }
      
      const rating = parseInt(numbers[0]);
      if (isNaN(rating) || rating < 1 || rating > 5) {
        return { 
          isValid: false, 
          message: 'La calificación debe ser un número entre 1 y 5.' 
        };
      }
      return { isValid: true };
      
    case 'single':
      if (!options || options.length === 0) {
        return { isValid: true }; // Sin opciones, cualquier respuesta es válida
      }
      
      const bestMatch = findBestMatchingOption(text, options);
      if (!bestMatch.selected || bestMatch.confidence < 0.4) {
        return { 
          isValid: false, 
          message: 'No se pudo identificar una opción válida. Por favor, elija una de las opciones disponibles.' 
        };
      }
      return { isValid: true };
      
    case 'multiple':
      if (!options || options.length === 0) {
        return { isValid: true }; // Sin opciones, cualquier respuesta es válida
      }
      
      const selectedOptions = extractMultipleOptions(text, options);
      if (selectedOptions.length === 0) {
        return { 
          isValid: false, 
          message: 'No se pudo identificar ninguna opción seleccionada. Por favor, elija al menos una opción.' 
        };
      }
      return { isValid: true };
      
    case 'open':
      // Para preguntas abiertas, validar el largo mínimo
      if (text.trim().length < 2) {
        return { 
          isValid: false, 
          message: 'Por favor, proporcione una respuesta más detallada.' 
        };
      }
      return { isValid: true };
      
    default:
      return { isValid: true };
  }
};