import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
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
          <Route path="/app" element={<DashboardPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CinematicScroll>
    </BrowserRouter>
  );
};

export default App;
