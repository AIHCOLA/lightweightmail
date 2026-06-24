import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Smartphone, Github, Globe, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/useAuth';
import { useSession } from '../hooks/useSession';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Spinner';
import * as api from '../api/client';

type LoginTab = 'phone' | 'github' | 'google';

interface LoginPageProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function LoginPage({ darkMode, onToggleDarkMode }: LoginPageProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { login, loginAsGuest, isAuthenticated, isGuest } = useAuth();
  const { addToast } = useToast();
  const { resetSession } = useSession();

  const [activeTab, setActiveTab] = useState<LoginTab>('phone');
  const [phone, setPhone] = useState('+86');
  const [code, setCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [appConfig, setAppConfig] = useState<{
    sms_enabled?: boolean;
    oauth_github_enabled?: boolean;
    oauth_google_enabled?: boolean;
  }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated || isGuest) navigate('/', { replace: true });
  }, [isAuthenticated, isGuest, navigate]);

  // Fetch config for available auth methods
  useEffect(() => {
    api.getConfig().then(r => {
      if (r.success && r.data) setAppConfig(r.data);
    });
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!phone || phone.length < 8) {
      addToast('error', t.invalid_phone || 'Invalid phone number');
      return;
    }
    setIsSending(true);
    const result = await api.sendVerificationCode(phone);
    if (result.success) {
      addToast('success', t.code_sent || 'Code sent');
      setCountdown(60);
    } else {
      addToast('error', result.error || 'Failed to send code');
    }
    setIsSending(false);
  }, [phone, addToast, t]);

  const handleVerify = useCallback(async () => {
    if (!phone || !code) return;
    setIsVerifying(true);
    const result = await api.verifyCode(phone, code);
    if (result.success && result.data) {
      login(result.data.user, result.data.access_token, result.data.refresh_token);
      addToast('success', t.login_button || 'Logged in');
      navigate('/', { replace: true });
    } else {
      addToast('error', result.error || t.code_expired || 'Invalid code');
    }
    setIsVerifying(false);
  }, [phone, code, login, navigate, addToast, t]);

  // Auto-submit on 6-digit code
  useEffect(() => {
    if (code.length === 6) handleVerify();
  }, [code, handleVerify]);

  const handleOAuth = useCallback(async (provider: 'github' | 'google') => {
    const result = await api.getOAuthUrl(provider);
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    } else {
      addToast('error', result.error || `Failed to initiate ${provider} login`);
    }
  }, [addToast]);

  const handleGuest = useCallback(async () => {
    await resetSession();
    loginAsGuest();
    navigate('/', { replace: true });
  }, [resetSession, loginAsGuest, navigate]);

  const tabs: { key: LoginTab; label: string; icon: typeof Smartphone }[] = [
    { key: 'phone', label: t.phone_login || 'Phone', icon: Smartphone },
    { key: 'github', label: t.github_login || 'GitHub', icon: Github },
    { key: 'google', label: t.google_login || 'Google', icon: Globe },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t.app_title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.app_subtitle}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 p-6">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
                  activeTab === tab.key
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Phone login tab */}
          {activeTab === 'phone' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t.phone_number || 'Phone number'}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+8613800138000"
                  className="input w-full"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.verify_code || 'Verification code'}
                  className="input flex-1"
                />
                <button
                  onClick={handleSendCode}
                  disabled={isSending || countdown > 0}
                  className="btn-secondary text-sm whitespace-nowrap"
                >
                  {isSending ? <Spinner size="sm" /> :
                   countdown > 0 ? `${countdown}s` :
                   t.send_code || 'Send Code'}
                </button>
              </div>
              <button
                onClick={handleVerify}
                disabled={isVerifying || code.length < 4}
                className="btn-primary w-full gap-2"
              >
                {isVerifying ? <Spinner size="sm" /> : <ArrowRight size={16} />}
                {t.login_button || 'Login'}
              </button>
            </div>
          )}

          {/* OAuth tabs */}
          {(activeTab === 'github' || activeTab === 'google') && (
            <div className="space-y-3">
              {activeTab === 'github' && (
                <button
                  onClick={() => handleOAuth('github')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-900 dark:bg-gray-800 text-white hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  <Github size={20} />
                  Continue with GitHub
                </button>
              )}
              {activeTab === 'google' && (
                <button
                  onClick={() => handleOAuth('google')}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Globe size={20} />
                  Continue with Google
                </button>
              )}
            </div>
          )}
        </div>

        {/* Guest mode */}
        <div className="text-center mt-6">
          <button
            onClick={handleGuest}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            {t.continue_as_guest || 'Continue without login'}
          </button>
        </div>
      </div>
    </div>
  );
}
