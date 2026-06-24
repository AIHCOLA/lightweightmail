import { useEffect, useRef } from 'react';
import { Navigate, useSearchParams } from 'react-router';
import { useI18n } from '../i18n';
import { useAuth } from '../auth/useAuth';
import { Spinner } from '../components/Spinner';

export function OAuthCallbackPage() {
  const { t } = useI18n();
  const { login, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const userId = searchParams.get('user_id');
    const displayName = searchParams.get('display_name');

    if (accessToken && refreshToken && userId) {
      login(
        {
          id: userId,
          phone: null,
          phone_verified: false,
          display_name: displayName || null,
          avatar_url: null,
        },
        accessToken,
        refreshToken
      );
    }
  }, [searchParams, login]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {t.linking || 'Linking account...'}
        </p>
      </div>
    </div>
  );
}
