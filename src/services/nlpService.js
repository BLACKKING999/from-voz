import nlp from "compromise"

/**
 * Servicio de procesamiento de lenguaje natural para mejorar las interacciones por voz
 * Utiliza compromise.js, una biblioteca ligera de NLP para el navegador
 * Mejorado para manejar los tipos de preguntas del esquema de MongoDB: 'open', 'single', 'multiple', 'rating', 'yesno'
 */

// Nota: No se importa el plugin para español porque no se encuentra disponible en la versión actual

// Optimize the normalizeText function to be more efficient
function normalizeText(text) {
  if (!text) return ""
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

// Optimize the cleanPunctuation function to handle more cases
function cleanPunctuation(text) {
  if (!text) return ""
  return text
    .replace(/[.,;:!?¡¿'"()[\]{}]+/g, " ")
    .replace(/\s+/g, " ")
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

    // Verificar si es una pregunta
    if (doc.questions().length > 0) {
      console.log("NLP: Se detectó una pregunta en lugar de un nombre")
      return null
    }

    // Intentar extraer nombre propio (mejor precisión que regex)
    const people = doc.people().out("array")
    if (people.length > 0) {
      console.log("NLP: Nombre extraído usando reconocimiento de entidades:", people[0])
      return people[0]
    }

    // Extraer frases de presentación
    const presentationPhrases = new Set([
      "me llamo",
      "mi nombre es",
      "soy",
      "yo soy",
      "puedes llamarme",
      "puede llamarme",
      "llámame",
      "llamame",
    ])

    let cleanedText = text.trim()
    const normalizedText = normalizeText(text.toLowerCase())

    for (const phrase of presentationPhrases) {
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

    // Eliminar palabras comunes y saludos
    const commonWords = new Set([
      "gracias",
      "por favor",
      "hola",
      "buenos dias",
      "buenas tardes",
      "señor",
      "señora",
      "buenas noches",
    ])

    let normalizedCleanedText = normalizeText(cleanedText.toLowerCase())

    for (const word of commonWords) {
      const normalizedWord = normalizeText(word)
      const regex = new RegExp(`\\b${normalizedWord}\\b`, "gi")
      normalizedCleanedText = normalizedCleanedText.replace(regex, "")
    }

    // Eliminar múltiples espacios y puntuación
    cleanedText = cleanPunctuation(normalizedCleanedText || cleanedText)

    if (!cleanedText) {
      return "Estimado participante"
    }

    // Tomar las primeras palabras (máximo 3) como nombre
    const words = cleanedText.split(" ").filter((word) => word.length > 0)
    const nameWords = words.slice(0, Math.min(3, words.length))

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

  const doc = nlp(text)

  const positiveWords = new Set([
    "bueno",
    "excelente",
    "genial",
    "perfecto",
    "me gusta",
    "si",
    "claro",
    "fantastico",
    "magnifico",
    "estupendo",
    "maravilloso",
    "satisfecho",
    "feliz",
    "alegre",
    "contento",
    "positivo",
    "agradable",
    "bien",
    "favorable",
  ])

  const negativeWords = new Set([
    "malo",
    "terrible",
    "horrible",
    "pesimo",
    "no me gusta",
    "no",
    "nunca",
    "desagradable",
    "deficiente",
    "decepcionante",
    "insatisfactorio",
    "triste",
    "enojado",
    "frustrado",
    "molesto",
    "insuficiente",
    "mediocre",
    "mal",
    "peor",
  ])

  let positiveScore = 0
  let negativeScore = 0

  const lowerText = text.toLowerCase()
  const normalizedText = normalizeText(lowerText)

  // Buscar palabras positivas y calcular su peso según la posición y repetición
  for (const word of positiveWords) {
    const normalizedWord = normalizeText(word)
    const regex = new RegExp(`\\b${normalizedWord}\\b`, "gi")
    const matches = normalizedText.match(regex)
    if (matches) {
      const count = matches.length
      positiveScore += count

      // Dar mayor peso si está al inicio o final de la frase
      if (normalizedText.startsWith(normalizedWord) || normalizedText.endsWith(normalizedWord)) {
        positiveScore += 0.5
      }
    }
  }

  // Buscar palabras negativas
  for (const word of negativeWords) {
    const normalizedWord = normalizeText(word)
    const regex = new RegExp(`\\b${normalizedWord}\\b`, "gi")
    const matches = normalizedText.match(regex)
    if (matches) {
      const count = matches.length
      negativeScore += count

      // Dar mayor peso si está al inicio o final de la frase
      if (normalizedText.startsWith(normalizedWord) || normalizedText.endsWith(normalizedWord)) {
        negativeScore += 0.5
      }
    }
  }

  // Ajustar por negaciones que invierten el sentimiento
  const negations = new Set(["no", "nunca", "tampoco", "ni"])
  for (const negation of negations) {
    const negPattern = new RegExp(`${negation}\\s+\\w+`, "gi")
    const matches = lowerText.match(negPattern)

    if (matches) {
      // Por cada coincidencia de negación, verificar si afecta a palabras de sentimiento
      // Extraer la lógica del bucle para evitar problemas de clousure con las variables
      const processNegations = (matches, posWordsSet, negWordsSet, posScore, negScore) => {
        let newPosScore = posScore
        let newNegScore = negScore

        matches.forEach((match) => {
          const negatedWord = match.split(/\s+/)[1]
          if (!negatedWord) return

          const normalizedNegatedWord = normalizeText(negatedWord)

          // Si niega una palabra positiva, reducir el positivo y aumentar el negativo
          for (const word of posWordsSet) {
            const normalizedWord = normalizeText(word)
            if (normalizedNegatedWord.includes(normalizedWord)) {
              newPosScore = Math.max(0, newPosScore - 1)
              newNegScore += 0.5
              break
            }
          }

          // Si niega una palabra negativa, reducir el negativo y aumentar el positivo
          for (const word of negWordsSet) {
            const normalizedWord = normalizeText(word)
            if (normalizedNegatedWord.includes(normalizedWord)) {
              newNegScore = Math.max(0, newNegScore - 1)
              newPosScore += 0.5
              break
            }
          }
        })

        return { newPosScore, newNegScore }
      }

      // Aplicar el procesamiento
      const { newPosScore, newNegScore } = processNegations(
        matches,
        positiveWords,
        negativeWords,
        positiveScore,
        negativeScore,
      )
      positiveScore = newPosScore
      negativeScore = newNegScore
    }
  }

  // Normalizar a un rango aproximado de -1 a 1
  const totalScore = positiveScore + negativeScore
  const score = totalScore > 0 ? (positiveScore - negativeScore) / totalScore : 0

  let sentiment = "neutral"
  if (score > 0.2) sentiment = "positive"
  else if (score < -0.2) sentiment = "negative"

  return { sentiment, score }
}

/**
 * Analiza una respuesta de texto para determinar si es afirmativa o negativa
 * @param {string} text - Texto a analizar
 * @returns {Object} - Resultado del análisis
 */
const analyzeYesNo = (text) => {
  if (!text) return { isYes: false, isNo: false, confidence: 0 }

  // Convertir el array de palabras afirmativas a un Set para búsqueda más eficiente
  const yesWords = new Set([
    "sí",
    "si",
    "claro",
    "por supuesto",
    "afirmativo",
    "efectivamente",
    "exacto",
    "correcto",
    "ok",
    "vale",
    "bueno",
    "cierto",
    "verdad",
    "desde luego",
    "así es",
    "sin duda",
    "obviamente",
    "naturalmente",
    "dale",
    "órale",
    "va",
    "venga",
    "vamos",
    "ándale",
    "seguro",
    "sale",
    // Reducido para mejorar rendimiento, manteniendo las más comunes
  ])

  // Palabras negativas en español
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
    "en absoluto",
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
    "de ninguna forma",
    "bajo ningún concepto",
    "por nada del mundo",
    "absolutamente no",
    "rotundamente no",
    "definitivamente no",
    "claramente no",
    "indudablemente no",
    "imposible",
    "terminantemente no",
    "por supuesto que no",
    "claro que no",
    "pues no",
    "ya no",
    "no más",
    "no ya",
    "no quiero",
    "me niego",
    "rechazo",
    "desapruebo",
    "denegado",
    "rechazado",
    "descartado",
    "refutado",
    "descalificado",
    "vetado",
    "cancelado",
    "desestimado",
    "inadmisible",
    "inaceptable",
    "inconcebible",
    "impensable",
    "imposible",
    "inviable",
    "ni loco",
    "ni muerto",
    "ni aunque me paguen",
    "ni aunque me maten",
    "para nada",
    "nanay",
    "nel",
    "nel pastel",
    "nones",
    "no way",
    "qué va",
    "olvídalo",
    "olvídese",
    "ni lo pienses",
    "ni lo intentes",
    "¡no!",
    "¡nunca!",
    "¡jamás!",
    "¡ni hablar!",
    "¡de ninguna manera!",
    "¡qué va!",
    "no puede ser",
    "no es posible",
    "niego",
    "deniego",
    "no estoy de acuerdo",
    "disiento",
    "rehúso",
    "me opongo",
    "no lo autorizo",
    "no se permite",
    "está prohibido",
    "ni lo sueñes",
    "ni por asomo",
    "ni remotamente",
    "ni de lejos",
    "ni una pizca",
    "ni un ápice",
    "no hay manera",
    "ni por casualidad",
    "ni por error",
    "ni a tiros",
    "ni hablar del peluquín",
    "ni de vaina",
    "ni de vainas",
    "ni eso",
    "non",
    "no señor",
    "no señora",
    "para nada del mundo",
    "no en absoluto",
    "jamás de los jamases",
    "nunca jamás",
    "ni lo menciones",
    "ni lo nombres",
    "ni me lo recuerdes",
    "ni en sueños",
    "de ningún modo o manera",
    "no hay tu tía",
    "no hay tutía",
    "no hay caso",
    "ni en pintura",
    "ni a la fuerza",
  ])

  // Buscar coincidencias y acumular peso para analizar respuestas
  let yesWeight = 0 // Para calcular confianza
  let noWeight = 0 // Para calcular confianza

  const lowerText = text.toLowerCase()
  const normalizedText = normalizeText(lowerText)
  const words = normalizedText.split(/\s+/)

  // Análisis más eficiente por palabras
  for (const word of words) {
    if (word.length < 2) continue // Ignorar palabras muy cortas

    // Verificar palabras afirmativas
    if (yesWords.has(word)) {
      yesWeight += 1
      // Más peso si está al inicio
      if (words[0] === word) {
        yesWeight += 0.5
      }
    }

    // Verificar palabras negativas (usando las más comunes)
    if (noWords.has(word)) {
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
  ]

  for (const { pattern, isNo: patternIsNo, isYes: patternIsYes, weight } of complexPatterns) {
    if (new RegExp(pattern, "i").test(normalizedText)) {
      if (patternIsYes) yesWeight += weight
      if (patternIsNo) noWeight += weight
    }
  }

  // Determinar resultado
  const isYes = yesWeight > 0 && yesWeight > noWeight
  const isNo = noWeight > 0 && noWeight >= yesWeight

  // Calcular confianza (0-1)
  let confidence = 0
  if (isYes) {
    confidence = Math.min(yesWeight / 3, 1)
  } else if (isNo) {
    confidence = Math.min(noWeight / 3, 1)
  }

  return { isYes, isNo, confidence }
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
        if (intent.intent === "affirmation") return true
        if (intent.intent === "negation") return false
        // Analizar el texto para encontrar afirmación/negación más compleja
        const yesNoResult = analyzeYesNo(text)
        if (yesNoResult.confidence >= 0.5) {
          return yesNoResult.isYes
        }
        // Si la confianza es baja, intentar con análisis de sentimiento
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
        const yesNoResult = analyzeYesNo(text)
        if (yesNoResult.confidence < 0.4) {
          return {
            isValid: false,
            message: "No se pudo determinar si su respuesta es afirmativa o negativa. Por favor, responda con sí o no.",
          }
        }
        return { isValid: true }

      case "rating":
        const numbers = extractNumbers(text)
        if (numbers.length === 0) {
          return {
            isValid: false,
            message: "Por favor, proporcione una calificación numérica del 1 al 5.",
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
            message: "No se pudo identificar una opción válida. Por favor, elija una de las opciones disponibles.",
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
            message: "No se pudo identificar ninguna opción seleccionada. Por favor, elija al menos una opción.",
          }
        }
        return { isValid: true }

      case "open":
        // Para preguntas abiertas, validar el largo mínimo
        if (text.trim().length < 2) {
          return {
            isValid: false,
            message: "Por favor, proporcione una respuesta más detallada.",
          }
        }
        return { isValid: true }

      default:
        return { isValid: true }
    }
  } catch (error) {
    console.error("Error al validar respuesta:", error)
    return { isValid: true } // En caso de error, permitir la respuesta
  }
}
