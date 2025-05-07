import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../utils/firebase';
import { SurveyService } from '../services/apiService'; // Importación corregida

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
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Crear Nueva Encuesta</h1>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Left column - Survey Details */}
          <div>
            <div className="card mb-6">
              <h2 className="text-xl font-semibold mb-4">Detalles de la Encuesta</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-gray-700 font-medium mb-1">
                    Título <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="title"
                    name="title"
                    type="text"
                    value={surveyData.title}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Ej: Satisfacción del Cliente"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-gray-700 font-medium mb-1">
                    Descripción
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={surveyData.description}
                    onChange={handleInputChange}
                    className="input min-h-[100px]"
                    placeholder="Describe el propósito de tu encuesta..."
                  />
                </div>
              </div>
            </div>
            
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Mensajes de Voz</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="welcomeMessage" className="block text-gray-700 font-medium mb-1">
                    Mensaje de Bienvenida
                  </label>
                  <textarea
                    id="welcomeMessage"
                    name="welcomeMessage"
                    value={surveyData.welcomeMessage}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Ej: ¡Hola! Gracias por participar en nuestra encuesta por voz."
                  />
                </div>
                
                <div>
                  <label htmlFor="farewell" className="block text-gray-700 font-medium mb-1">
                    Mensaje de Despedida
                  </label>
                  <textarea
                    id="farewell"
                    name="farewell"
                    value={surveyData.farewell}
                    onChange={handleInputChange}
                    className="input"
                    placeholder="Ej: Gracias por completar la encuesta. ¡Tus respuestas son muy valiosas para nosotros!"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Right column - Questions */}
          <div>
            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Preguntas</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn btn-primary text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Añadir Pregunta
                </button>
              </div>
              
              {surveyData.questions.map((question, index) => (
                <div key={question.id} className="p-4 border rounded-lg mb-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">Pregunta {index + 1}</h3>
                    <div className="flex space-x-1">
                      <button
                        type="button"
                        onClick={() => moveQuestionUp(index)}
                        disabled={index === 0}
                        className={`p-1 rounded ${index === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
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
                        className={`p-1 rounded ${index === surveyData.questions.length - 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-200'}`}
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
                        className={`p-1 rounded ${surveyData.questions.length === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-gray-200'}`}
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
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Texto de la Pregunta <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={question.text}
                        onChange={(e) => handleQuestionChange(index, 'text', e.target.value)}
                        className="input"
                        placeholder="Ej: ¿Cómo calificarías nuestro servicio?"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Tipo de Respuesta
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => handleQuestionChange(index, 'type', e.target.value)}
                        className="input"
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
                        <label className="block text-gray-700 text-sm font-medium mb-1">
                          Opciones <span className="text-red-600">*</span>
                        </label>
                        
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex mb-2">
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleOptionChange(index, optionIndex, e.target.value)}
                              className="input mr-2"
                              placeholder={`Opción ${optionIndex + 1}`}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(index, optionIndex)}
                              disabled={question.options.length <= 2}
                              className={`p-2 rounded ${question.options.length <= 2 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-gray-200'}`}
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
                          className="mt-2 text-primary-600 hover:text-primary-800 text-sm flex items-center"
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
        
        {/* Preview Section */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Vista Previa de la Conversación</h2>
          
          <div className="bg-gray-100 p-4 rounded-lg max-h-60 overflow-y-auto">
            {generatePreview().map((message, index) => (
              <div 
                key={index} 
                className={`p-2 mb-2 rounded-lg ${message.startsWith('[') ? 'bg-gray-200 text-gray-700' : 'bg-primary-100 text-primary-800'}`}
              >
                {message}
              </div>
            ))}
          </div>
        </div>
        
        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn btn-outline"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : (
              'Guardar Encuesta'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSurvey;
