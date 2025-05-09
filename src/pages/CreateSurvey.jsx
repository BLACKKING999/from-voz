import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { auth } from '../utils/firebase'; // Guardado para futuras validaciones de usuario
import { SurveyService } from '../services/apiService'; // Importación corregida

// Paleta de colores personalizada
const COLORS = {
  primary: {
    main: '#E30613', // Rojo principal
    light: '#FF4C5C',
    dark: '#C50000',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#FFFFFF', // Blanco
    dark: '#F0F0F0',
    darker: '#E0E0E0'
  },
  text: {
    primary: '#333333',
    secondary: '#666666'
  }
};

const questionTypes = [
  { id: 'open', label: 'Respuesta abierta' },
  { id: 'single', label: 'Selección única' },
  { id: 'multiple', label: 'Selección múltiple' },
  { id: 'rating', label: 'Calificación (1-5)' },
  { id: 'yesno', label: 'Sí/No' }
];

const CreateSurvey = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [surveyData, setSurveyData] = useState({
    title: '',
    description: '',
    welcomeMessage: '¡Hola! Gracias por participar en nuestra encuesta por voz.',
    farewell: 'Gracias por completar la encuesta. ¡Tus respuestas son muy valiosas para nosotros!',
    questions: [
      {
        id: Date.now().toString(),
        text: '',
        type: 'open',
        options: []
      }
    ]
  });

  // Handle input changes for survey general data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSurveyData({
      ...surveyData,
      [name]: value
    });
  };

  // Handle input changes for questions
  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...surveyData.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value
    };
    setSurveyData({
      ...surveyData,
      questions: updatedQuestions
    });
  };

  // Add a new question
  const addQuestion = () => {
    setSurveyData({
      ...surveyData,
      questions: [
        ...surveyData.questions,
        {
          id: Date.now().toString(),
          text: '',
          type: 'open',
          options: []
        }
      ]
    });
  };

  // Remove a question
  const removeQuestion = (index) => {
    if (surveyData.questions.length > 1) {
      const updatedQuestions = [...surveyData.questions];
      updatedQuestions.splice(index, 1);
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions
      });
    }
  };

  // Handle option changes for multiple choice questions
  const handleOptionChange = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...surveyData.questions];
    const options = [...updatedQuestions[questionIndex].options];
    options[optionIndex] = value;

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options
    };

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions
    });
  };

  // Add a new option for multiple choice questions
  const addOption = (questionIndex) => {
    const updatedQuestions = [...surveyData.questions];
    const options = [...updatedQuestions[questionIndex].options, ''];

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options
    };

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions
    });
  };

  // Remove an option from multiple choice questions
  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...surveyData.questions];
    const options = [...updatedQuestions[questionIndex].options];
    options.splice(optionIndex, 1);

    updatedQuestions[questionIndex] = {
      ...updatedQuestions[questionIndex],
      options
    };

    setSurveyData({
      ...surveyData,
      questions: updatedQuestions
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Usar el servicio centralizado para crear la encuesta
      const response = await SurveyService.createSurvey(surveyData);
      
      console.log('Survey created successfully:', response);
      setLoading(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving survey:', error);
      setLoading(false);
      alert('Error al crear la encuesta: ' + (error.response?.data?.message || error.message));
    }
  };

  // Validate form data before submission
  const validateForm = () => {
    // Check if title is provided
    if (!surveyData.title.trim()) {
      alert('Por favor, proporciona un título para la encuesta.');
      return false;
    }
    
    // Check if all questions have text
    for (let i = 0; i < surveyData.questions.length; i++) {
      const question = surveyData.questions[i];
      
      if (!question.text.trim()) {
        alert(`La pregunta #${i + 1} está vacía. Por favor, proporciona un texto para todas las preguntas.`);
        return false;
      }
      
      // Check if multiple choice questions have at least 2 options
      if ((question.type === 'single' || question.type === 'multiple') && question.options.length < 2) {
        alert(`La pregunta #${i + 1} necesita al menos 2 opciones.`);
        return false;
      }
      
      // Check if options are not empty
      if (question.type === 'single' || question.type === 'multiple') {
        for (let j = 0; j < question.options.length; j++) {
          if (!question.options[j].trim()) {
            alert(`La opción #${j + 1} de la pregunta #${i + 1} está vacía.`);
            return false;
          }
        }
      }
    }
    
    return true;
  };

  // Move question up
  const moveQuestionUp = (index) => {
    if (index > 0) {
      const updatedQuestions = [...surveyData.questions];
      const temp = updatedQuestions[index];
      updatedQuestions[index] = updatedQuestions[index - 1];
      updatedQuestions[index - 1] = temp;
      
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions
      });
    }
  };
  
  // Move question down
  const moveQuestionDown = (index) => {
    if (index < surveyData.questions.length - 1) {
      const updatedQuestions = [...surveyData.questions];
      const temp = updatedQuestions[index];
      updatedQuestions[index] = updatedQuestions[index + 1];
      updatedQuestions[index + 1] = temp;
      
      setSurveyData({
        ...surveyData,
        questions: updatedQuestions
      });
    }
  };

  // Generate a preview of the voice interaction
  const generatePreview = () => {
    const messages = [
      surveyData.welcomeMessage,
      "¿Podrías decirme tu nombre, por favor?",
      "[El usuario responde con su nombre]",
      `Gracias, [Nombre]. Vamos a empezar con la encuesta "${surveyData.title}".`
    ];

    surveyData.questions.forEach((question, index) => {
      messages.push(`Pregunta ${index + 1}: ${question.text}`);
      
      if (question.type === 'single' || question.type === 'multiple') {
        messages.push(`Opciones: ${question.options.join(', ')}`);
      } else if (question.type === 'rating') {
        messages.push("Por favor responda con un número del 1 al 5");
      } else if (question.type === 'yesno') {
        messages.push("Por favor responda Sí o No");
      }
      
      messages.push("[El usuario responde]");
    });

    messages.push(surveyData.farewell);

    return messages;
  };

  return (
    <div className="max-w-5xl mx-auto py-6" style={{
      background: 'linear-gradient(to bottom, #ffffff, #f5f5f5)',
      minHeight: '100vh'
    }}>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold" style={{ color: COLORS.primary.main, textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>
          CREAR NUEVA ENCUESTA
        </h1>
        <div className="w-24 h-1 mx-auto mt-2" style={{ backgroundColor: COLORS.primary.main }}></div>
      </div>
      
      <form onSubmit={handleSubmit} className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left column - Survey Details */}
          <div>
            <div className="rounded-lg shadow-lg mb-6 overflow-hidden">
              <div className="py-3 px-4" style={{ backgroundColor: COLORS.primary.main }}>
                <h2 className="text-xl font-semibold" style={{ color: COLORS.secondary.main }}>
                  Detalles de la Encuesta
                </h2>
              </div>
              
              <div className="p-5 space-y-4 bg-white">
                <div>
                  <label htmlFor="title" className="block font-medium mb-1" style={{ color: COLORS.text.primary }}>
                    Título <span style={{ color: COLORS.primary.main }}>*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={surveyData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none"
                    style={{ 
                      borderColor: COLORS.secondary.darker,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      borderWidth: '1px',
                      transition: 'all 0.3s ease',
                      ':focus': {
                        borderColor: COLORS.primary.main,
                        boxShadow: `0 0 0 3px ${COLORS.primary.light}33`
                      }
                    }}
                    placeholder="Ej: Satisfacción del Cliente"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block font-medium mb-1" style={{ color: COLORS.text.primary }}>
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={surveyData.description}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none"
                    style={{ 
                      borderColor: COLORS.secondary.darker,
                      minHeight: '100px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
                    }}
                    placeholder="Describe el propósito de tu encuesta..."
                  />
                </div>
              </div>
            </div>
            
            <div className="rounded-lg shadow-lg overflow-hidden">
              <div className="py-3 px-4" style={{ backgroundColor: COLORS.primary.main }}>
                <h2 className="text-xl font-semibold" style={{ color: COLORS.secondary.main }}>
                  Mensajes de Voz
                </h2>
              </div>
              
              <div className="p-5 space-y-4 bg-white">
                <div>
                  <label htmlFor="welcomeMessage" className="block font-medium mb-1" style={{ color: COLORS.text.primary }}>
                    Mensaje de Bienvenida
                  </label>
                  <textarea
                    id="welcomeMessage"
                    name="welcomeMessage"
                    value={surveyData.welcomeMessage}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none"
                    style={{ borderColor: COLORS.secondary.darker }}
                    placeholder="Ej: ¡Hola! Gracias por participar en nuestra encuesta por voz."
                  />
                </div>
                
                <div>
                  <label htmlFor="farewell" className="block font-medium mb-1" style={{ color: COLORS.text.primary }}>
                    Mensaje de Despedida
                  </label>
                  <textarea
                    id="farewell"
                    name="farewell"
                    value={surveyData.farewell}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none"
                    style={{ borderColor: COLORS.secondary.darker }}
                    placeholder="Ej: Gracias por completar la encuesta. ¡Tus respuestas son muy valiosas para nosotros!"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Questions */}
          <div>
            <div className="rounded-lg shadow-lg overflow-hidden">
              <div className="py-3 px-4 flex justify-between items-center" style={{ backgroundColor: COLORS.primary.main }}>
                <h2 className="text-xl font-semibold" style={{ color: COLORS.secondary.main }}>
                  Preguntas
                </h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="px-3 py-1 rounded-md text-sm flex items-center"
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    color: COLORS.secondary.main,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Añadir Pregunta
                </button>
              </div>
              
              <div className="p-5 bg-white">
                {surveyData.questions.map((question, index) => (
                  <div 
                    key={question.id} 
                    className="p-4 border rounded-lg mb-4"
                    style={{ 
                      borderLeft: `4px solid ${COLORS.primary.main}`,
                      backgroundColor: COLORS.secondary.dark
                    }}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold" style={{ color: COLORS.primary.main }}>Pregunta {index + 1}</h3>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => moveQuestionUp(index)}
                          disabled={index === 0}
                          className={`p-1 rounded ${index === 0 ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
                          style={{ color: index === 0 ? '#ccc' : COLORS.text.secondary }}
                          title="Mover arriba"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveQuestionDown(index)}
                          disabled={index === surveyData.questions.length - 1}
                          className={`p-1 rounded ${index === surveyData.questions.length - 1 ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
                          style={{ color: index === surveyData.questions.length - 1 ? '#ccc' : COLORS.text.secondary }}
                          title="Mover abajo"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          disabled={surveyData.questions.length === 1}
                          className={`p-1 rounded ${surveyData.questions.length === 1 ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
                          style={{ color: surveyData.questions.length === 1 ? '#ccc' : COLORS.primary.main }}
                          title="Eliminar pregunta"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: COLORS.text.primary }}>
                          Texto de la Pregunta <span style={{ color: COLORS.primary.main }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={question.text}
                          onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none"
                          style={{ 
                            borderColor: COLORS.secondary.darker,
                            backgroundColor: COLORS.secondary.main
                          }}
                          placeholder="Ej: ¿Cómo calificarías nuestro servicio?"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: COLORS.text.primary }}>
                          Tipo de Respuesta
                        </label>
                        <select
                          value={question.type}
                          onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none"
                          style={{ 
                            borderColor: COLORS.secondary.darker,
                            backgroundColor: COLORS.secondary.main
                          }}
                        >
                          {questionTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Show options for multiple choice questions */}
                      {(question.type === 'single' || question.type === 'multiple') && (
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: COLORS.text.primary }}>
                            Opciones <span style={{ color: COLORS.primary.main }}>*</span>
                          </label>
                          
                          {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex mb-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                                className="w-full px-3 py-2 border rounded-md mr-2 focus:outline-none"
                                style={{ 
                                  borderColor: COLORS.secondary.darker,
                                  backgroundColor: COLORS.secondary.main 
                                }}
                                placeholder={`Opción ${optionIndex + 1}`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => removeOption(index, optionIndex)}
                                disabled={question.options.length <= 2}
                                className={`p-2 rounded ${question.options.length <= 2 ? 'cursor-not-allowed' : 'hover:bg-gray-200'}`}
                                style={{ color: question.options.length <= 2 ? '#ccc' : COLORS.primary.main }}
                                title="Eliminar opción"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => addOption(index)}
                            className="mt-2 text-sm flex items-center"
                            style={{ color: COLORS.primary.main }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Añadir Opción
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Preview Section */}
        <div className="rounded-lg shadow-lg mb-8 overflow-hidden">
          <div className="py-3 px-4" style={{ backgroundColor: COLORS.primary.main }}>
            <h2 className="text-xl font-semibold" style={{ color: COLORS.secondary.main }}>
              Vista Previa de la Conversación
            </h2>
          </div>
          
          <div className="p-5 bg-white">
            <div 
              className="max-h-60 overflow-y-auto rounded-lg"
              style={{ backgroundColor: '#f9f9f9' }}
            >
              {generatePreview().map((message, index) => (
                <div 
                  key={index} 
                  className="p-3 m-2 rounded-lg shadow-sm"
                  style={{ 
                    backgroundColor: message.startsWith('[') ? COLORS.secondary.dark : 'white',
                    borderLeft: message.startsWith('[') ? 'none' : `4px solid ${COLORS.primary.main}`,
                    color: message.startsWith('[') ? COLORS.text.secondary : COLORS.text.primary
                  }}
                >
                  {message}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 px-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 rounded-md font-medium transition-all duration-200"
            style={{ 
              backgroundColor: COLORS.secondary.dark,
              color: COLORS.text.primary,
              border: `1px solid ${COLORS.secondary.darker}`
            }}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 rounded-md font-medium transition-all duration-200"
            style={{ 
              backgroundColor: COLORS.primary.main,
              color: COLORS.secondary.main,
              boxShadow: '0 4px 6px rgba(227, 6, 19, 0.25)'
            }}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : (
              <span className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Guardar Encuesta
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSurvey;