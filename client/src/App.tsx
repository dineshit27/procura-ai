import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import SmoothCursor from './components/lightswind/smooth-cursor';
import CinematicScroll from './components/lightswind/cinematic-scroll';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';

function isPayPalReturnSearch(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('paypal_return') === 'true' || params.get('paypal_cancel') === 'true';
}

function RootEntry() {
  const location = useLocation();
  if (isPayPalReturnSearch(location.search)) {
    return <Navigate to={`/app${location.search}${location.hash}`} replace />;
  }
  return <LandingPage />;
}

function ProtectedDashboard() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center bg-[#FBF9F5] font-mono">Restoring secure session…</div>;
  return user ? <DashboardPage /> : <Navigate to="/login" replace />;
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
      <SmoothCursor
        size={16}
        color="#2457E6"
        showTrail
        trailLength={5}
        glowEffect
        magneticDistance={50}
        magneticElements="[data-magnetic]"
      />
      <CinematicScroll
        className="h-screen"
        accentColor="#2457E6"
        blurMax={20}
        enableTopBlur={false}
        enableBottomBlur={false}
      >
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup-password" element={<LoginPage />} />
          <Route path="/app" element={<ProtectedDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CinematicScroll>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
