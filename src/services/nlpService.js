import nlp from "compromise"

/**
 * Servicio de procesamiento de lenguaje natural para mejorar las interacciones por voz
 * Utiliza compromise.js, una biblioteca ligera de NLP para el navegador
 * Mejorado para manejar los tipos de preguntas del esquema de MongoDB: 'open', 'single', 'multiple', 'rating', 'yesno'
 */

// Nota: No se importa el plugin para español porque no se encuentra disponible en la versión actual

// Optimizar la función normalizeText para mejor rendimiento y compatibilidad
function normalizeText(text) {
  if (!text) return ""

  try {
    // Usar normalización NFD para descomponer caracteres acentuados
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Eliminar diacríticos
      .toLowerCase() // Convertir a minúsculas para mejor comparación
      .trim() // Eliminar espacios al inicio y final
  } catch (error) {
    // Fallback para navegadores que no soportan normalize
    return text.toLowerCase().trim()
  }
}

// Mejorar la función cleanPunctuation para manejar más casos
function cleanPunctuation(text) {
  if (!text) return ""

  return text
    .replace(/[.,;:!?¡¿'"()[\]{}«»""'']+/g, " ") // Más signos de puntuación
    .replace(/\s+/g, " ") // Reemplazar múltiples espacios con uno solo
    .trim()
}

/**
 * Extraer nombre de una frase con procesamiento avanzado de lenguaje natural
 * @param {string} text - Texto del cual extraer el nombre
 * @returns {string} - Nombre extraído o valor por defecto
 */
export const extractName = (text) => {
  if (!text || typeof text !== "string") {
    return "Estimado participante"
  }

  try {
    // Procesar el texto con NLP
    const doc = nlp(text)

    // Verificar si es una pregunta o comando - mejorado
    if (doc.questions().length > 0) {
      console.log("NLP: Se detectó una pregunta en lugar de un nombre")
      return null
    }

    // Verificar si contiene palabras clave que indican que no es un nombre
    const lowerText = text.toLowerCase()
    const negativeIndicators = ["no sé", "no se", "no quiero", "no te importa", "anónimo", "anonimo", "ninguno"]

    for (const indicator of negativeIndicators) {
      if (lowerText.includes(indicator)) {
        console.log("NLP: Se detectó una negativa a dar el nombre")
        return "Anónimo"
      }
    }

    // Intentar extraer nombre propio (mejor precisión que regex)
    const people = doc.people().out("array")
    if (people.length > 0) {
      console.log("NLP: Nombre extraído usando reconocimiento de entidades:", people[0])
      return people[0]
    }

    // Extraer frases de presentación - mejorado con Map para mejor rendimiento
    const presentationPhrases = new Map([
      ["me llamo", true],
      ["mi nombre es", true],
      ["soy", true],
      ["yo soy", true],
      ["puedes llamarme", true],
      ["puede llamarme", true],
      ["llámame", true],
      ["llamame", true],
      ["dime", true],
      ["me dicen", true],
      ["me conocen como", true],
    ])

    let cleanedText = text.trim()
    const normalizedText = normalizeText(text)

    // Buscar frases de presentación de manera más eficiente
    for (const [phrase, _] of presentationPhrases) {
      const normalizedPhrase = normalizeText(phrase)
      if (normalizedText.includes(normalizedPhrase)) {
        // Extraer texto después de la frase
        const parts = normalizedText.split(normalizedPhrase)
        if (parts.length > 1 && parts[1].trim()) {
          cleanedText = parts[1].trim()
          break
        }
      }
    }

    // Eliminar palabras comunes y saludos - mejorado con Set para búsqueda O(1)
    const commonWords = new Set([
      "gracias",
      "por favor",
      "hola",
      "buenos dias",
      "buenas tardes",
      "señor",
      "señora",
      "buenas noches",
      "estimado",
      "estimada",
      "querido",
      "querida",
      "don",
      "doña",
      "doctor",
      "doctora",
      "profesor",
      "profesora",
      "licenciado",
      "licenciada",
    ])

    const normalizedCleanedText = normalizeText(cleanedText)
    const words = normalizedCleanedText.split(/\s+/)
    const filteredWords = words.filter((word) => !commonWords.has(word) && word.length > 1)

    // Si no quedan palabras después de filtrar
    if (filteredWords.length === 0) {
      return "Estimado participante"
    }

    // Eliminar múltiples espacios y puntuación
    cleanedText = cleanPunctuation(filteredWords.join(" "))

    if (!cleanedText) {
      return "Estimado participante"
    }

    // Tomar las primeras palabras (máximo 3) como nombre
    const nameWords = cleanedText
      .split(" ")
      .filter((word) => word.length > 0)
      .slice(0, 3)

    // Capitalizar cada palabra del nombre
    return nameWords.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ")
  } catch (error) {
    console.error("Error al extraer nombre:", error)
    return "Estimado participante"
  }
}

/**
 * Analiza el sentimiento de un texto (positivo, negativo, neutral)
 * @param {string} text - Texto a analizar
 * @returns {Object} - Objeto con el sentimiento y su intensidad
 */
export const analyzeSentiment = (text) => {
  if (!text) return { sentiment: "neutral", score: 0 }

  try {
    const doc = nlp(text)

    // Usar Map para mejor rendimiento en búsqueda
    const positiveWords = new Map([
      ["bueno", 1],
      ["excelente", 1.5],
      ["genial", 1.2],
      ["perfecto", 1.5],
      ["me gusta", 1],
      ["si", 0.8],
      ["claro", 0.8],
      ["fantastico", 1.3],
      ["magnifico", 1.3],
      ["estupendo", 1.2],
      ["maravilloso", 1.3],
      ["satisfecho", 1],
      ["feliz", 1.2],
      ["alegre", 1],
      ["contento", 1],
      ["positivo", 0.9],
      ["agradable", 0.8],
      ["bien", 0.7],
      ["favorable", 0.8],
    ])

    const negativeWords = new Map([
      ["malo", 1],
      ["terrible", 1.5],
      ["horrible", 1.5],
      ["pesimo", 1.3],
      ["no me gusta", 1],
      ["no", 0.8],
      ["nunca", 0.9],
      ["desagradable", 1.2],
      ["deficiente", 1],
      ["decepcionante", 1.2],
      ["insatisfactorio", 1.1],
      ["triste", 1],
      ["enojado", 1.2],
      ["frustrado", 1.1],
      ["molesto", 1],
      ["insuficiente", 0.9],
      ["mediocre", 1],
      ["mal", 0.8],
      ["peor", 1.2],
    ])

    let positiveScore = 0
    let negativeScore = 0

    const lowerText = text.toLowerCase()
    const normalizedText = normalizeText(lowerText)
    const words = normalizedText.split(/\s+/)

    // Análisis más eficiente por palabras
    for (const word of words) {
      if (word.length < 2) continue // Ignorar palabras muy cortas

      // Verificar palabras positivas con su peso
      if (positiveWords.has(word)) {
        positiveScore += positiveWords.get(word)
      }

      // Verificar palabras negativas con su peso
      if (negativeWords.has(word)) {
        negativeScore += negativeWords.get(word)
      }
    }

    // Buscar frases completas para mayor precisión
    for (const [phrase, weight] of positiveWords.entries()) {
      if (phrase.includes(" ") && normalizedText.includes(phrase)) {
        positiveScore += weight * 1.5 // Mayor peso para frases completas
      }
    }

    for (const [phrase, weight] of negativeWords.entries()) {
      if (phrase.includes(" ") && normalizedText.includes(phrase)) {
        negativeScore += weight * 1.5 // Mayor peso para frases completas
      }
    }

    // Ajustar por negaciones que invierten el sentimiento
    const negations = new Set(["no", "nunca", "tampoco", "ni"])

    // Buscar patrones de negación seguidos de palabras
    for (const negation of negations) {
      const regex = new RegExp(`\\b${negation}\\s+\\w+`, "gi")
      const matches = lowerText.match(regex)

      if (matches) {
        for (const match of matches) {
          const words = match.split(/\s+/)
          if (words.length < 2) continue

          const negatedWord = words[1]
          const normalizedNegatedWord = normalizeText(negatedWord)

          // Si niega una palabra positiva, reducir positivo y aumentar negativo
          if (positiveWords.has(normalizedNegatedWord)) {
            positiveScore = Math.max(0, positiveScore - positiveWords.get(normalizedNegatedWord))
            negativeScore += 0.5
          }

          // Si niega una palabra negativa, reducir negativo y aumentar positivo
          if (negativeWords.has(normalizedNegatedWord)) {
            negativeScore = Math.max(0, negativeScore - negativeWords.get(normalizedNegatedWord))
            positiveScore += 0.5
          }
        }
      }
    }

    // Normalizar a un rango aproximado de -1 a 1
    const totalScore = positiveScore + negativeScore
    const score = totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0

    let sentiment = "neutral"
    if (score > 0.2) sentiment = "positive"
    else if (score < -0.2) sentiment = "negative"

    return { sentiment, score }
  } catch (error) {
    console.error("Error al analizar sentimiento:", error)
    return { sentiment: "neutral", score: 0 }
  }
}

/**
 * Analiza una respuesta de texto para determinar si es afirmativa o negativa
 * @param {string} text - Texto a analizar
 * @returns {Object} - Resultado del análisis
 */
const analyzeYesNo = (text) => {
  if (!text) return { isYes: false, isNo: false, confidence: 0 }

  try {
    // Debug info - importante para identificar problemas
    console.log("analyzeYesNo recibió texto:", text);

    // Definir palabras afirmativas (todas en minúscula para facilitar la comparación)
    const yesWords = new Set([
      // Palabras básicas de afirmación (las más comunes primero y en minúscula)
      "sí", "si", "s", "claro", "afirmativo", "por supuesto", 
      "efectivamente", "exacto", "correcto", "ok", "vale",
      
      // Expresiones coloquiales
      "bueno", "cierto", "verdad", "desde luego", "así es", 
      "sin duda", "obviamente", "naturalmente", "dale", "órale",
      
      // Expresiones informales
      "va", "venga", "vamos", "ándale", "seguro", 
      "sale", "va que va", "va bien", "de acuerdo", "estoy de acuerdo",
      
      // Afirmaciones enfáticas
      "clarísimo", "totalmente", "absolutamente", "completamente", "definitivamente",
      "indudablemente", "innegablemente", "positivamente", "ciertamente", "sin lugar a dudas",
      
      // Respuestas formales
      "en efecto", "efectivamente", "precisamente", "justamente", "evidentemente",
      "indiscutiblemente", "incuestionablemente", "con certeza", "sin problema", "confirmo",
      
      // Expresiones regionales
      "ajá", "simón", "nel pastel", "ya tú sabes", "chévere",
      "dale pues", "pos sí", "faltaba más", "cómo no", "claro que sí",
      
      // Frases coloquiales
      "por supuestísimo", "ya lo creo", "ni hablar", "no hay duda", "por descontado",
      "como dices", "dalo por hecho", "ya está", "no se hable más", "sin rechistar",
      
      // Expresiones formales adicionales
      "concedido", "aprobado", "aceptado", "confirmado", "ratificado",
      "autorizado", "garantizado", "asegurado", "verificado", "validado",
      
      // Expresiones cotidianas
      "bien dicho", "tal cual", "así mismo", "eso es", "exactamente",
      "así es", "como no", "ya ves", "entendido", "captado",
      
      // Expresiones de consentimiento
      "adelante", "procede", "sigue", "continúa", "prosigue",
      "avanza", "en marcha", "vamos allá", "hagámoslo", "empecemos"
    ])

    // Palabras negativas en español (todas en minúsculas)
    const noWords = new Set([
      "no",
      "nunca",
      "jamás",
      "jamas",
      "negativo",
      "para nada",
      "en absoluto",
      "de ninguna manera",
      "nada",
      "tampoco",
      "ni hablar",
      "que va",
      "de ningun modo",
      "de ningún modo",
      "ni modo",
      "ni por asomo",
      "ni pensarlo",
      "ni de broma",
      "ni se te ocurra",
      "ni se diga",
      "ni de chiste",
      "ni lo sueñes",
    ])

    // Log para debug
    console.log("Conjunto de palabras afirmativas:", [...yesWords].slice(0, 5));
    
    // Buscar coincidencias y acumular peso para analizar respuestas
    let yesWeight = 0 // Para calcular confianza
    let noWeight = 0 // Para calcular confianza

    // Normalizar el texto para comparación
    const lowerText = text.toLowerCase()
    const normalizedText = normalizeText(lowerText)
    console.log("Texto normalizado para análisis:", normalizedText);
    
    // Verificaciones directas para casos comunes
    if (normalizedText === "si" || normalizedText === "sí" || normalizedText === "s") {
      console.log("Detección directa de 'sí' simple");
      return { isYes: true, isNo: false, confidence: 1, isTie: false };
    }
    
    if (normalizedText === "no" || normalizedText === "n") {
      console.log("Detección directa de 'no' simple");
      return { isYes: false, isNo: true, confidence: 1, isTie: false };
    }
    
    // Dividir en palabras para análisis detallado
    const words = normalizedText.split(/\s+/)
    console.log("Palabras a analizar:", words);

    // Análisis por palabras individuales
    for (const word of words) {
      if (word.length < 2) continue // Ignorar palabras muy cortas

      // Verificar palabras afirmativas
      if (yesWords.has(word)) {
        console.log(`Palabra afirmativa encontrada: '${word}'`);
        yesWeight += 1
        // Más peso si está al inicio
        if (words[0] === word) {
          yesWeight += 0.5
        }
      }

      // Verificar palabras negativas
      if (noWords.has(word)) {
        console.log(`Palabra negativa encontrada: '${word}'`);
        noWeight += 1
        // Más peso si está al inicio
        if (words[0] === word) {
          noWeight += 0.5
        }
      }
    }

    // Analizar frases completas para casos especiales
    const complexPatterns = [
      { pattern: "no.*si", isNo: false, isYes: true, weight: 1.5 },
      { pattern: "si.*no", isNo: true, isYes: false, weight: 1.5 },
      { pattern: "no.*claro", isNo: true, isYes: false, weight: 1.2 },
      { pattern: "claro que no", isNo: true, isYes: false, weight: 2 },
      { pattern: "por supuesto que no", isNo: true, isYes: false, weight: 2 },
      { pattern: "que si", isNo: false, isYes: true, weight: 1.5 },
      { pattern: "dije que si", isNo: false, isYes: true, weight: 2 },
      { pattern: "dije que no", isNo: true, isYes: false, weight: 2 },
    ]

    for (const { pattern, isNo: patternIsNo, isYes: patternIsYes, weight } of complexPatterns) {
      if (new RegExp(pattern, "i").test(normalizedText)) {
        console.log(`Patrón especial encontrado: '${pattern}'`);
        if (patternIsYes) yesWeight += weight
        if (patternIsNo) noWeight += weight
      }
    }
    
    console.log(`Pesos calculados - Afirmativo: ${yesWeight}, Negativo: ${noWeight}`);

    // Verificación adicional para casos en que solo se dice "sí" o "no"
    if (normalizedText.includes("si") || normalizedText.includes("sí")) {
      console.log("Incluye 'sí' - ajustando peso afirmativo");
      // Asegurar que tenga al menos algo de peso positivo
      yesWeight = Math.max(yesWeight, 1);
    }
    
    if (normalizedText.includes("no")) {
      console.log("Incluye 'no' - ajustando peso negativo");
      // Asegurar que tenga al menos algo de peso negativo
      noWeight = Math.max(noWeight, 1);
    }

    // Regla más simple: si hay algún peso afirmativo y no hay peso negativo, es "sí"
    if (yesWeight > 0 && noWeight === 0) {
      console.log("Detección simple: es afirmativo");
      return {
        isYes: true,
        isNo: false,
        confidence: Math.min(yesWeight / 2, 1),
        isTie: false
      };
    }
    
    // Si hay algún peso negativo y no hay peso afirmativo, es "no"
    if (noWeight > 0 && yesWeight === 0) {
      console.log("Detección simple: es negativo");
      return {
        isYes: false,
        isNo: true,
        confidence: Math.min(noWeight / 2, 1),
        isTie: false
      };
    }
    
    // Si hay ambos pesos, decidir por el mayor
    if (yesWeight > 0 && noWeight > 0) {
      if (yesWeight > noWeight) {
        console.log("Detección de conflicto: mayor peso afirmativo");
        return {
          isYes: true,
          isNo: false,
          confidence: Math.min((yesWeight - noWeight) / 2, 0.8),
          isTie: false
        };
      } else {
        console.log("Detección de conflicto: mayor peso negativo");
        return {
          isYes: false,
          isNo: true,
          confidence: Math.min((noWeight - yesWeight) / 2, 0.8),
          isTie: false
        };
      }
    }
    
    // Si no se detectó nada, no es ni sí ni no
    console.log("No se detectó ni sí ni no");
    return {
      isYes: false,
      isNo: false,
      confidence: 0,
      isTie: false
    }
  } catch (error) {
    console.error("Error al analizar respuesta sí/no:", error)
    return { isYes: false, isNo: false, confidence: 0 }
  }
}

/**
 * Extrae números de un texto
 * @param {string} text - Texto a analizar
 * @returns {Array} - Lista de números encontrados
 */
const extractNumbers = (text) => {
  if (!text) return []

  try {
    const doc = nlp(text)
    const numbers = doc.numbers().out("array")

    // Intentar extraer números como dígitos con regex mejorado
    const digitMatches = text.match(/\b\d+(\.\d+)?\b/g) || []

    // Mapa optimizado de números textuales en español
    const spanishNumbers = {
      uno: 1,
      dos: 2,
      tres: 3,
      cuatro: 4,
      cinco: 5,
      seis: 6,
      siete: 7,
      ocho: 8,
      nueve: 9,
      diez: 10,
      once: 11,
      doce: 12,
      trece: 13,
      catorce: 14,
      quince: 15,
      dieciséis: 16,
      diecisiete: 17,
      dieciocho: 18,
      diecinueve: 19,
      veinte: 20,
    }

    const textualNumbers = []
    const lowerText = text.toLowerCase()

    // Búsqueda más eficiente de números textuales
    for (const [word, value] of Object.entries(spanishNumbers)) {
      // Usar regex para encontrar palabras completas
      const regex = new RegExp(`\\b${word}\\b`, "i")
      if (regex.test(lowerText)) {
        textualNumbers.push(value)
      }
    }

    // Combinar resultados y eliminar duplicados
    const allNumbers = [...numbers, ...digitMatches, ...textualNumbers]
    const uniqueNumbers = [...new Set(allNumbers)]

    return uniqueNumbers.map((num) => {
      // Intentar convertir a número
      const parsed = Number.parseFloat(num)
      return isNaN(parsed) ? num : parsed
    })
  } catch (error) {
    console.error("Error al extraer números:", error)
    return []
  }
}

/**
 * Determina la opción más probable de una lista basada en la respuesta
 * @param {string} text - Texto de respuesta
 * @param {Array} options - Lista de opciones
 * @returns {Object} - Opción seleccionada y nivel de confianza
 */
const findBestMatchingOption = (text, options) => {
  if (!text || !options || options.length === 0) {
    return { selected: null, confidence: 0 }
  }

  try {
    const normalizedText = normalizeText(text.toLowerCase())

    // Buscar coincidencias exactas primero (por número o texto completo)
    const numbers = extractNumbers(normalizedText)

    // Si hay un número que corresponde a un índice válido
    if (numbers.length > 0) {
      const index = numbers[0] - 1 // Restar 1 porque los usuarios suelen contar desde 1
      if (index >= 0 && index < options.length) {
        return { selected: options[index], confidence: 0.9 }
      }
    }

    // Buscar coincidencias por texto
    let bestMatch = null
    let highestConfidence = 0

    // Preprocesar opciones para mejorar rendimiento
    const normalizedOptions = options.map((option) => ({
      original: option,
      normalized: normalizeText(option.toLowerCase()),
      words: normalizeText(option.toLowerCase())
        .split(/\s+/)
        .filter((w) => w.length > 2),
    }))

    const textWords = normalizedText.split(/\s+/).filter((w) => w.length > 2)

    for (let i = 0; i < normalizedOptions.length; i++) {
      const { original, normalized, words } = normalizedOptions[i]

      // 1. Coincidencia exacta
      if (normalizedText === normalized) {
        return { selected: original, confidence: 1.0 }
      }

      // 2. Verificar si la opción está contenida en el texto
      if (normalizedText.includes(normalized)) {
        const confidence = Math.min(normalized.length / normalizedText.length + 0.3, 1.0)
        if (confidence > highestConfidence) {
          highestConfidence = confidence
          bestMatch = original
        }
      }
      // 3. Verificar si el texto está contenido en la opción
      else if (normalized.includes(normalizedText)) {
        const confidence = Math.min((normalizedText.length / normalized.length) * 0.8, 0.8) // Penalización
        if (confidence > highestConfidence) {
          highestConfidence = confidence
          bestMatch = original
        }
      }
      // 4. Análisis de palabras en común - optimizado
      else {
        // Contar palabras coincidentes
        let matchingWords = 0
        for (const word of textWords) {
          if (words.some((oWord) => oWord.includes(word) || word.includes(oWord))) {
            matchingWords++
          }
        }

        if (matchingWords > 0) {
          const confidence = Math.min((matchingWords / Math.max(textWords.length, words.length)) * 0.7, 0.7)
          if (confidence > highestConfidence) {
            highestConfidence = confidence
            bestMatch = original
          }
        }
      }

      // 5. Si el texto menciona el número de la opción como "opción 1" o similar
      const optionReferences = [`opcion ${i + 1}`, `alternativa ${i + 1}`, `la ${i + 1}`, `el ${i + 1}`]

      for (const ref of optionReferences) {
        const normalizedRef = normalizeText(ref)
        if (normalizedText.includes(normalizedRef)) {
          const confidence = 0.85
          if (confidence > highestConfidence) {
            highestConfidence = confidence
            bestMatch = original
          }
        }
      }
    }

    return { selected: bestMatch, confidence: highestConfidence }
  } catch (error) {
    console.error("Error al encontrar la mejor opción:", error)
    return { selected: null, confidence: 0 }
  }
}

/**
 * Extrae múltiples opciones seleccionadas de un texto
 * @param {string} text - Texto de respuesta
 * @param {Array} options - Lista de opciones disponibles
 * @returns {Array} - Lista de opciones seleccionadas con su nivel de confianza
 */
const extractMultipleOptions = (text, options) => {
  if (!text || !options || options.length === 0) {
    return []
  }

  const normalizedText = text.toLowerCase()
  const results = []

  // Extraer números que podrían ser índices
  const numbers = extractNumbers(normalizedText)
  const selectedIndices = numbers
    .filter((num) => Number.isInteger(num) && num >= 1 && num <= options.length)
    .map((num) => num - 1) // Ajustar índice

  // Agregar opciones por índice numérico
  selectedIndices.forEach((index) => {
    results.push({
      selected: options[index],
      confidence: 0.9,
    })
  })

  // Buscar coincidencias por texto para cada opción
  options.forEach((option, index) => {
    // Evitar duplicados si ya fue agregado por índice
    if (selectedIndices.includes(index)) {
      return
    }

    const optionText = option.toLowerCase()

    // Coincidencia por texto
    if (normalizedText.includes(optionText)) {
      const confidence = Math.min(optionText.length / normalizedText.length + 0.2, 0.9)
      results.push({
        selected: option,
        confidence,
      })
    }
  })

  // Buscar referencias a "todas", "ninguna", etc.
  const allOptions = ["todas", "todas las opciones", "todas las anteriores"]
  const noOptions = ["ninguna", "ninguna de las anteriores", "ninguna opción"]

  for (const all of allOptions) {
    if (normalizedText.includes(all)) {
      return options.map((option) => ({
        selected: option,
        confidence: 0.95,
      }))
    }
  }

  for (const none of noOptions) {
    if (normalizedText.includes(none)) {
      return []
    }
  }

  return results
}

/**
 * Analiza la intención del usuario a partir de su respuesta
 * @param {string} text - Texto de entrada
 * @returns {Object} - Objeto con la intención detectada y confianza
 */
export const analyzeIntent = (text) => {
  if (!text) return { intent: "unknown", confidence: 0 }

  try {
    const doc = nlp(text)

    // Detectar si es una pregunta
    if (doc.questions().length > 0) {
      return { intent: "question", confidence: 0.9 }
    }

    // Usar Sets para búsqueda más eficiente
    const affirmations = new Set([
      "si",
      "sí",
      "claro",
      "por supuesto",
      "afirmativo",
      "correcto",
      "exacto",
      "ok",
      "vale",
    ])
    const negations = new Set(["no", "nope", "negativo", "para nada", "en absoluto", "nunca", "jamas", "jamás"])

    const lowerText = text.toLowerCase()
    const normalizedText = normalizeText(lowerText)
    const words = normalizedText.split(/\s+/)

    // Verificar comandos específicos - optimizado con Map
    const commands = new Map([
      ["help", new Set(["ayuda", "ayudame", "necesito ayuda", "como funciona"])],
      ["repeat", new Set(["repite", "repetir", "otra vez", "no entendi", "no escuche", "vuelve a decir"])],
      ["skip", new Set(["saltar", "siguiente", "omitir", "pasar", "siguiente pregunta"])],
      ["back", new Set(["atras", "anterior", "volver", "regresar", "pregunta anterior"])],
      ["stop", new Set(["detener", "parar", "terminar", "finalizar", "acabar", "salir"])],
    ])

    // Verificar comandos
    for (const [intent, phrases] of commands.entries()) {
      for (const phrase of phrases) {
        const normalizedPhrase = normalizeText(phrase)
        if (normalizedText.includes(normalizedPhrase)) {
          return { intent, confidence: 0.9 }
        }
      }
    }

    // Verificar afirmaciones/negaciones por palabras
    for (const word of words) {
      if (affirmations.has(word)) {
        return { intent: "affirmation", confidence: 0.85 }
      }
      if (negations.has(word)) {
        return { intent: "negation", confidence: 0.85 }
      }
    }

    // Detectar números (para preguntas de calificación)
    const numbers = doc.numbers().out("array")
    if (numbers.length > 0) {
      return { intent: "number", value: numbers[0], confidence: 0.9 }
    }

    // Detectar si es un texto de lista (para opciones múltiples)
    const listPatterns = new Set([", ", " y ", " e ", " ni ", " tambien ", " ademas "])

    for (const pattern of listPatterns) {
      const normalizedPattern = normalizeText(pattern)
      if (normalizedText.includes(normalizedPattern)) {
        return { intent: "list", confidence: 0.75 }
      }
    }

    return { intent: "statement", confidence: 0.5 }
  } catch (error) {
    console.error("Error al analizar intención:", error)
    return { intent: "unknown", confidence: 0 }
  }
}

/**
 * Procesa la respuesta para una pregunta según su tipo
 * @param {string} text - Respuesta del usuario
 * @param {string} questionType - Tipo de pregunta ('open', 'single', 'multiple', 'rating', 'yesno')
 * @param {Array} options - Opciones disponibles para preguntas de selección
 * @returns {*} - Respuesta procesada según el tipo de pregunta
 */
export const processResponse = (text, questionType, options = []) => {
  if (!text) return null

  try {
    const intent = analyzeIntent(text)
    console.log("NLP: Intención detectada:", intent)

    switch (questionType) {
      case "yesno":
        // Usar directamente el resultado del análisis de sí/no sin considerar el nivel de confianza
        const yesNoResult = analyzeYesNo(text)
        console.log("NLP: Respuesta sí/no analizada:", yesNoResult)
        
        // Si detectamos claramente un sí o un no, usarlo directamente
        if (yesNoResult.isYes) return true
        if (yesNoResult.isNo) return false
        
        // Solo como respaldo en casos extremos donde el análisis principal no detecta nada
        if (intent.intent === "affirmation") return true
        if (intent.intent === "negation") return false
        
        // Incluso en casos ambiguos, intentar dar una respuesta razonable
        const sentiment = analyzeSentiment(text)
        return sentiment.sentiment === "positive"

      case "rating":
        if (intent.intent === "number" && intent.value >= 1 && intent.value <= 5) {
          return intent.value
        }
        // Extraer número del texto
        const numbers = extractNumbers(text)
        if (numbers.length > 0) {
          const num = Number.parseInt(numbers[0])
          // Limitar al rango 1-5
          return Math.max(1, Math.min(5, num))
        }

        // Mapear expresiones comunes a valores numéricos - usando Map para mejor rendimiento
        const ratingMap = new Map([
          ["muy mal", 1],
          ["mal", 2],
          ["regular", 3],
          ["bien", 4],
          ["muy bien", 5],
          ["excelente", 5],
          ["pésimo", 1],
          ["terrible", 1],
          ["bueno", 4],
          ["aceptable", 3],
          ["deficiente", 2],
        ])

        const lowerText = text.toLowerCase()
        for (const [phrase, value] of ratingMap.entries()) {
          if (lowerText.includes(phrase)) {
            return value
          }
        }

        // Si no se encuentra un valor numérico, usar análisis de sentimiento
        const sentimentResult = analyzeSentiment(text)
        if (sentimentResult.sentiment === "positive") {
          return 4 // Valor positivo por defecto
        } else if (sentimentResult.sentiment === "negative") {
          return 2 // Valor negativo por defecto
        } else {
          return 3 // Valor neutral por defecto
        }

      case "multiple":
        if (!options || options.length === 0) {
          return text.trim() // Si no hay opciones, devolver el texto
        }
        return extractMultipleOptions(text, options)

      case "open":
      default:
        // Limpiar el texto para obtener la respuesta más relevante
        return text.trim()
    }
  } catch (error) {
    console.error("Error al procesar respuesta:", error)
    return text.trim() // En caso de error, devolver el texto original
  }
}

/**
 * Genera una respuesta personalizada basada en el sentimiento del usuario
 * @param {string} userText - Texto del usuario
 * @param {Array} possibleResponses - Array de posibles respuestas
 * @returns {string} - Respuesta seleccionada
 */
export const generateAdaptiveResponse = (userText, possibleResponses) => {
  const sentiment = analyzeSentiment(userText)

  // Clasificar respuestas según el sentimiento
  const positiveResponses = possibleResponses.filter((r) => r.tone === "positive")
  const neutralResponses = possibleResponses.filter((r) => r.tone === "neutral")
  const negativeResponses = possibleResponses.filter((r) => r.tone === "supportive")

  // Seleccionar respuesta apropiada según el sentimiento del usuario
  let selectedResponses
  if (sentiment.sentiment === "positive") {
    selectedResponses = positiveResponses.length ? positiveResponses : neutralResponses
  } else if (sentiment.sentiment === "negative") {
    selectedResponses = negativeResponses.length ? negativeResponses : neutralResponses
  } else {
    selectedResponses = neutralResponses.length ? neutralResponses : positiveResponses
  }

  // Si no hay respuestas del tipo adecuado, usar cualquiera
  if (!selectedResponses.length) {
    selectedResponses = possibleResponses
  }

  // Elegir aleatoriamente entre las respuestas apropiadas, con mayor probabilidad para las más relevantes
  selectedResponses.sort((a, b) => {
    // Dar prioridad a respuestas con más contexto
    const aHasContext = a.context && userText.toLowerCase().includes(a.context.toLowerCase())
    const bHasContext = b.context && userText.toLowerCase().includes(b.context.toLowerCase())

    if (aHasContext && !bHasContext) return -1
    if (!aHasContext && bHasContext) return 1

    return 0
  })

  // Si hay respuestas con contexto relevante, priorizar esas
  const contextualized = selectedResponses.filter(
    (r) => r.context && userText.toLowerCase().includes(r.context.toLowerCase()),
  )

  if (contextualized.length > 0) {
    const randomIndex = Math.floor(Math.random() * Math.min(contextualized.length, 3))
    return contextualized[randomIndex].text
  }

  // Elegir entre las respuestas generales
  const randomIndex = Math.floor(Math.random() * selectedResponses.length)
  return selectedResponses[randomIndex].text
}

/**
 * Verifica si una respuesta es válida según el tipo de pregunta
 * @param {string} text - Texto de respuesta
 * @param {string} questionType - Tipo de pregunta
 * @param {Array} options - Opciones disponibles para preguntas de selección
 * @returns {Object} - Validez de la respuesta y mensaje de error
 */
export const validateResponse = (text, questionType, options = []) => {
  if (!text) {
    return { isValid: false, message: "No se detectó ninguna respuesta." }
  }

  try {
    switch (questionType) {
      case "yesno":
        // Simplificar la validación: solo usamos analyzeYesNo para ver si detectó un sí o un no
        const yesNoResult = analyzeYesNo(text)
        
        // Si es un sí o un no según el análisis, es válido
        if (yesNoResult.isYes || yesNoResult.isNo) {
          return { isValid: true }
        }
        
        // Si el análisis principal no detectó nada, podemos seguir considerando válidas 
        // respuestas que contengan palabras básicas
        const normalizedText = normalizeText(text.toLowerCase())
        const singleWords = normalizedText.split(/\s+/)
        
        // Palabras básicas que siempre indican respuesta válida
        if (singleWords.includes("si") || singleWords.includes("sí") || 
            singleWords.includes("no") || singleWords.includes("claro") ||
            singleWords.includes("afirmativo") || singleWords.includes("negativo")) {
          return { isValid: true }
        }
        
        // Mensaje para cuando no se detectó una respuesta clara
        return {
          isValid: false,
          message: "No se pudo determinar si tu respuesta es afirmativa o negativa. Por favor, responde con sí o no.",
        }

      case "rating":
        const numbers = extractNumbers(text)
        if (numbers.length === 0) {
          return {
            isValid: false,
            message: "Por favor, proporciona una calificación numérica del 1 al 5.",
          }
        }

        const rating = Number.parseInt(numbers[0])
        if (isNaN(rating) || rating < 1 || rating > 5) {
          return {
            isValid: false,
            message: "La calificación debe ser un número entre 1 y 5.",
          }
        }
        return { isValid: true }

      case "single":
        if (!options || options.length === 0) {
          return { isValid: true } // Sin opciones, cualquier respuesta es válida
        }

        const bestMatch = findBestMatchingOption(text, options)
        if (!bestMatch.selected || bestMatch.confidence < 0.4) {
          return {
            isValid: false,
            message: "No pude identificar una opción válida. Por favor, elige una de las opciones disponibles.",
          }
        }
        return { isValid: true }

      case "multiple":
        if (!options || options.length === 0) {
          return { isValid: true } // Sin opciones, cualquier respuesta es válida
        }

        const selectedOptions = extractMultipleOptions(text, options)
        if (selectedOptions.length === 0) {
          return {
            isValid: false,
            message: "No pude identificar ninguna opción seleccionada. Por favor, elige al menos una opción.",
          }
        }
        return { isValid: true }

      case "open":
        // Para preguntas abiertas, validar el largo mínimo
        if (text.trim().length < 2) {
          return {
            isValid: false,
            message: "Por favor, proporciona una respuesta más detallada.",
          }
        }
        return { isValid: true }

      default:
        return { isValid: true }
    }
  } catch (error) {
    console.error("Error al validar respuesta:", error)
    return { isValid: true, message: "Hubo un problema al validar tu respuesta, pero la aceptaremos." }
  }
}
