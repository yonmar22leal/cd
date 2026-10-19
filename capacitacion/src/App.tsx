import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './components/AuthProvider'
import { DashboardLayout, RequireRole } from './components/DashboardLayout'
import Landing from './pages/Landing'
import AuthPage from './pages/AuthPage'
import Overview from './pages/dashboard/Overview'
import SchedulePage from './pages/dashboard/SchedulePage'
import SubjectsPage from './pages/dashboard/SubjectsPage'
import TeachersPage from './pages/dashboard/TeachersPage'
import MyClassesPage from './pages/dashboard/MyClassesPage'
import ProfilePage from './pages/dashboard/ProfilePage'
import AdminSubjects from './pages/dashboard/AdminSubjects'
import AdminSchedules from './pages/dashboard/AdminSchedules'
import AdminUsers from './pages/dashboard/AdminUsers'
import AdminEnrollments from './pages/dashboard/AdminEnrollments'
import GraduatesPage from './pages/dashboard/GraduatesPage'
import AttendancePage from './pages/dashboard/AttendancePage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/ingresar" element={<AuthPage mode="login" />} />
          <Route path="/registro" element={<AuthPage mode="register" />} />
          <Route path="/verificar" element={<AuthPage mode="verify" />} />

          <Route path="/panel" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="horario" element={<SchedulePage />} />
            <Route path="materias" element={<SubjectsPage />} />
            <Route path="profesores" element={<TeachersPage />} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="graduados" element={<GraduatesPage />} />
            <Route
              path="mis-clases"
              element={<RequireRole roles={['profesor', 'admin']}><MyClassesPage /></RequireRole>}
            />
            <Route
              path="asistencia"
              element={<RequireRole roles={['profesor', 'admin']}><AttendancePage /></RequireRole>}
            />
            <Route path="admin/materias" element={<RequireRole roles={['admin']}><AdminSubjects /></RequireRole>} />
            <Route path="admin/inscripciones" element={<RequireRole roles={['admin']}><AdminEnrollments /></RequireRole>} />
            <Route path="admin/horarios" element={<RequireRole roles={['admin']}><AdminSchedules /></RequireRole>} />
            <Route path="admin/usuarios" element={<RequireRole roles={['admin']}><AdminUsers /></RequireRole>} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
