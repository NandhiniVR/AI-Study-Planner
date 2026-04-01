import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SetupPage from './pages/SetupPage'

import DashboardPage from './pages/DashboardPage'
import StudyPlanPage from './pages/StudyPlanPage'
import PomodoroPage from './pages/PomodoroPage'
import NotesPage from './pages/NotesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import DashboardLayout from './layouts/DashboardLayout'
import SmartLearningPage from './pages/SmartLearningPage'
import MockTestPage from './pages/MockTestPage'
import ChatbotPage from './pages/ChatbotPage'
import TimetablePage from './pages/TimetablePage'
import { useAuth, AuthProvider } from './contexts/AuthContext'

function PrivateRoute({ children }) {
  const { currentUser } = useAuth()
  
  if (!currentUser) return <Navigate to="/login" replace />
  
  return children
}

function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Auth & Onboarding */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/setup" element={<PrivateRoute><SetupPage /></PrivateRoute>} />

        {/* Dashboard (with sidebar layout) */}
        <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/study-plan" element={<StudyPlanPage />} />
          <Route path="/pomodoro" element={<PomodoroPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/smart-learning" element={<SmartLearningPage />} />
          <Route path="/smart-learning/mock-test" element={<MockTestPage />} />
          <Route path="/assistant" element={<ChatbotPage />} />
          <Route path="/timetable" element={<TimetablePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}

export default App
