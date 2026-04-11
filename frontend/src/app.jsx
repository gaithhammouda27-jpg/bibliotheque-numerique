import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Books from './pages/Books';
import AdminDashboard from './pages/AdminDashboard';
import MyBorrows from './pages/MyBorrows';
import AdminUsers from './pages/AdminUsers';
import './App.css';

// Composant pour protéger les routes
function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token, loading } = useAuth();
  
  console.log('ProtectedRoute - token:', token ? 'Oui' : 'Non');
  console.log('ProtectedRoute - user:', user);
  
  if (loading) {
    return <div>Chargement...</div>;
  }
  
  if (!token) {
    console.log('Pas de token, redirection vers login');
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.log('Rôle non autorisé, redirection vers books');
    return <Navigate to="/books" replace />;
  }
  
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { token, user, loading } = useAuth();
  
  if (loading) {
    return <div>Chargement...</div>;
  }
  
  return (
    <Routes>
      {/* Routes publiques */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Routes protégées - utilisateur */}
      <Route path="/books" element={
        <ProtectedRoute>
          <Books />
        </ProtectedRoute>
      } />
      
      <Route path="/my-borrows" element={
        <ProtectedRoute allowedRoles={['user', 'admin']}>
          <MyBorrows />
        </ProtectedRoute>
      } />
      
      {/* Routes protégées - admin uniquement */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* Redirection par défaut */}
      <Route path="/" element={
        token ? (
          user?.role === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/books" replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      
      {/* Route 404 - capture toutes les routes non définies */}
      <Route path="*" element={<Navigate to="/" replace />} />
      
      <Route path="/admin/users" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminUsers />
  </ProtectedRoute>} />
    </Routes>
  );
}

export default App;