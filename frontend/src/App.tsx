import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { I18nProvider } from './i18n';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { setTokenAccessors } from './api/client';
import { useAuth } from './auth/useAuth';
import * as api from './api/client';
import { InboxPage } from './pages/Inbox';
import { LoginPage } from './pages/Login';
import { OAuthCallbackPage } from './pages/OAuthCallback';
import { ProfilePage } from './pages/Profile';

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('tempmail_dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('tempmail_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  // Wire up token callbacks for API auto-refresh
  const { accessToken, refreshToken, setTokens, logout } = useAuth();

  useEffect(() => {
    setTokenAccessors(
      () => accessToken,
      async () => {
        if (!refreshToken) return false;
        const result = await api.refreshToken(refreshToken);
        if (result.success && result.data) {
          setTokens(result.data.access_token, result.data.refresh_token);
          return true;
        }
        logout();
        return false;
      }
    );
  }, [accessToken, refreshToken, setTokens, logout]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <InboxPage darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
