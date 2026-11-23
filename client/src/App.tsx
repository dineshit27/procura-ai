import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { LandingPage } from './pages/LandingPage';
import { ContactPage } from './pages/ContactPage';
import SmoothCursor from './components/lightswind/smooth-cursor';
import CinematicScroll from './components/lightswind/cinematic-scroll';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { CreateAccountPage } from './pages/CreateAccountPage';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordRecoveryPage';

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
  const { user, role, loading, roleLoading, signOut } = useAuth();
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FBF9F5] font-mono text-sm">
        Verifying secure workspace access…
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!role) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#FBF9F5] p-5 font-mono">
        <div className="max-w-md w-full bg-white border-2 border-[#111827] p-6 shadow-[5px_5px_0_#111827] text-center space-y-4">
          <div className="inline-block px-2 py-0.5 bg-amber-100 border border-amber-800 text-amber-900 font-bold text-xs uppercase">
            Workspace Role Required
          </div>
          <h2 className="text-xl font-black text-neutral-900">No Assigned Role</h2>
          <p className="text-xs text-neutral-600 leading-relaxed">
            Your account ({user.email}) is authenticated, but no authorized workspace role was found in Procura. Contact an administrator to assign your role.
          </p>
          <button
            onClick={() => void signOut()}
            className="w-full border-2 border-black bg-[#2457e6] p-2.5 font-black text-white shadow-[3px_3px_0_#111827] hover:bg-[#1d4ed8]"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }
  return <DashboardPage />;
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
          <Route path="/create-account" element={<CreateAccountPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/setup-password" element={<ResetPasswordPage />} />
          <Route path="/app" element={<ProtectedDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </CinematicScroll>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
