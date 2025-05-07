import React from 'react';
import { Routes, Route } from 'react-router-dom';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CreateSurvey from './pages/CreateSurvey';
import SurveyDetail from './pages/SurveyDetail';
import TakeSurvey from './pages/TakeSurvey';
import PublicSurveys from './pages/PublicSurveys';
import ResponseDetail from './pages/ResponseDetail';
import NotFound from './pages/NotFound';
import VoiceTest from './pages/VoiceTest';
import ThankYou from './pages/ThankYou';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="surveys/public" element={<PublicSurveys />} />
          <Route path="voice-test" element={<VoiceTest />} />
          <Route path="thank-you" element={<ThankYou />} />
          <Route 
            path="dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="create-survey" 
            element={
              <ProtectedRoute>
                <CreateSurvey />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="surveys/:surveyId" 
            element={
              <ProtectedRoute>
                <SurveyDetail />
              </ProtectedRoute>
            } 
          />
          <Route path="take-survey/:surveyId" element={<TakeSurvey />} />
          <Route 
            path="responses/:responseId" 
            element={
              <ProtectedRoute>
                <ResponseDetail />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
