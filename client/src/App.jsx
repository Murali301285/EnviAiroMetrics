import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import AppConfiguration from './pages/AppConfiguration';
import LocationManagement from './pages/LocationManagement';
import AppDashboard from './pages/AppDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute role="admin">
              <UserManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/apps" element={
            <ProtectedRoute role="admin">
              <AppConfiguration />
            </ProtectedRoute>
          } />
          <Route path="/admin/locations" element={
            <ProtectedRoute role="admin">
              <LocationManagement />
            </ProtectedRoute>
          } />

          {/* User Routes */}
          <Route path="/app/:appId" element={
            <ProtectedRoute role="user">
              <AppDashboard />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
