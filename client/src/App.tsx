import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import SmoothCursor from './components/lightswind/smooth-cursor';
import CinematicScroll from './components/lightswind/cinematic-scroll';

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

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SmoothCursor
        size={22}
        color="#3b82f6"
        showTrail
        trailLength={6}
        glowEffect
        magneticDistance={60}
        magneticElements="[data-magnetic]"
      />
      <CinematicScroll
        className="h-screen"
        accentColor="#3b82f6"
        blurMax={20}
      >
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/app" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CinematicScroll>
    </BrowserRouter>
  );
};

export default App;
