// apps/ui/src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import BrowsePage      from './pages/BrowsePage';
import CountryPage     from './pages/CountryPage';
import QueuePage       from './pages/QueuePage';
import SearchPage      from './pages/SearchPage';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import InvitePage      from './pages/InvitePage';
import CreatorsPage    from './components/CreatorsPage';
import TripsPage       from './pages/TripsPage';
import TripDetailPage  from './pages/TripDetailPage';
import SharedTripPage  from './pages/SharedTripPage';

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1117', color: '#94a3b8', fontSize: 14 }}>
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Public — no auth required */}
      <Route path="/trips/shared/:token" element={<SharedTripPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/browse" replace />} />
          <Route path="/browse"       element={<BrowsePage />} />
          <Route path="/country"      element={<CountryPage />} />
          <Route path="/creators"     element={<CreatorsPage />} />
          <Route path="/trips"        element={<TripsPage />} />
          <Route path="/search"       element={<SearchPage />} />
          <Route path="/queue"        element={<QueuePage />} />
          <Route path="/admin/invite" element={<InvitePage />} />
        </Route>
        {/* Trip detail — protected but uses its own full-viewport layout */}
        <Route path="/trips/:id"      element={<TripDetailPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
