import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, LogOut, Trash2, Smartphone, Github, Globe, ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/useAuth';
import { useToast } from '../components/Toast';
import { Spinner } from '../components/Spinner';
import * as api from '../api/client';

export function ProfilePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState<Array<{ provider: string; provider_email: string | null; provider_name: string | null }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.getMe().then(r => {
      if (r.success && r.data) {
        setAccounts(r.data.accounts || []);
      }
      setIsLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleUnlink = async (provider: string) => {
    // Would call unlink API if implemented
    addToast('info', `${provider} unlink not yet implemented`);
  };

  const handleLink = async (provider: string) => {
    const result = await api.getOAuthUrl(provider as 'github' | 'google');
    if (result.success && result.data?.url) {
      window.location.href = result.data.url;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Spinner size="lg" />
      </div>
    );
  }

  const hasProvider = (provider: string) => accounts.some(a => a.provider === provider);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="btn-ghost p-2 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t.profile || 'Profile'}
          </h1>
        </div>

        <div className="space-y-6">
          {/* User info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-lg font-bold text-primary-600 dark:text-primary-300">
                {(user?.display_name || user?.phone || '?')[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {user?.display_name || user?.phone || 'User'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {user?.id?.substring(0, 8)}...
                </p>
              </div>
            </div>
          </div>

          {/* Linked accounts */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {t.linked_accounts || 'Linked Accounts'}
            </h2>
            <div className="space-y-3">
              {/* Phone */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Phone</p>
                    <p className="text-xs text-gray-500">
                      {user?.phone ? user.phone.replace(/(\+?\d{3})\d{4}(\d+)/, '$1****$2') : t.phone_not_verified || 'Not set'}
                      {user?.phone_verified && <span className="ml-2 text-green-600">✓ Verified</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* GitHub */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Github size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">GitHub</p>
                    <p className="text-xs text-gray-500">
                      {hasProvider('github')
                        ? accounts.find(a => a.provider === 'github')?.provider_name || 'Linked'
                        : 'Not linked'}
                    </p>
                  </div>
                </div>
                {hasProvider('github') ? (
                  <button onClick={() => handleUnlink('github')} className="text-xs text-red-500 hover:text-red-600">
                    {t.unlink_account || 'Unlink'}
                  </button>
                ) : (
                  <button onClick={() => handleLink('github')} className="text-xs text-primary-600 hover:text-primary-700">
                    {t.link_account || 'Link'}
                  </button>
                )}
              </div>

              {/* Google */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3">
                  <Globe size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Google</p>
                    <p className="text-xs text-gray-500">
                      {hasProvider('google')
                        ? accounts.find(a => a.provider === 'google')?.provider_email || 'Linked'
                        : 'Not linked'}
                    </p>
                  </div>
                </div>
                {hasProvider('google') ? (
                  <button onClick={() => handleUnlink('google')} className="text-xs text-red-500 hover:text-red-600">
                    {t.unlink_account || 'Unlink'}
                  </button>
                ) : (
                  <button onClick={() => handleLink('google')} className="text-xs text-primary-600 hover:text-primary-700">
                    {t.link_account || 'Link'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <LogOut size={18} />
              {t.sign_out || 'Sign Out'}
            </button>
            <button
              className="w-full flex items-center gap-3 py-2.5 text-sm text-red-600 hover:text-red-700"
            >
              <ShieldAlert size={18} />
              {t.delete_account || 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
