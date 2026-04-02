import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Leagues from './pages/Leagues';
import CreateLeague from './pages/CreateLeague';
import LeagueDetail from './pages/LeagueDetail';
import Round from './pages/Round';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /><p>Loading Decibel...</p></div>;

  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/leagues" replace /> : <Login />} />
        <Route path="/leagues" element={<ProtectedRoute><Leagues /></ProtectedRoute>} />
        <Route path="/leagues/new" element={<ProtectedRoute><CreateLeague /></ProtectedRoute>} />
        <Route path="/leagues/:leagueId" element={<ProtectedRoute><LeagueDetail /></ProtectedRoute>} />
        <Route path="/leagues/:leagueId/rounds/:roundId" element={<ProtectedRoute><Round /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? '/leagues' : '/login'} replace />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
