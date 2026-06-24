import { useState, useEffect, useCallback } from 'react';
import type { Session } from '../types';
import * as api from '../api/client';
import { generateUUID } from '../utils/id';

const SESSION_KEY = 'tempmail_session_id';

/**
 * Hook for session management.
 * Creates a new session or validates an existing one on mount.
 */
/**
 * useSession is used only for guest mode now.
 * Authenticated users don't need sessions — JWT handles everything.
 * Still exported for backward compat; guest mode uses localStorage UUID.
 */
export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initSession();
  }, []);

  async function initSession() {
    try {
      let storedId = localStorage.getItem(SESSION_KEY);

      if (storedId) {
        // Validate existing session
        const result = await api.getSession(storedId);
        if (result.success && result.data) {
          setSessionId(result.data.id);
          setSession(result.data);
          setIsLoading(false);
          return;
        }
        // Session invalid — remove stale data
        localStorage.removeItem(SESSION_KEY);
      }

      // Create new session
      const createResult = await api.createSession();
      if (createResult.success && createResult.data) {
        const newId = createResult.data.id;
        localStorage.setItem(SESSION_KEY, newId);
        setSessionId(newId);
        setSession(createResult.data);
      } else {
        setError(createResult.error ?? 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }

  const resetSession = useCallback(async () => {
    localStorage.removeItem(SESSION_KEY);
    setIsLoading(true);
    setError(null);
    setSession(null);
    setSessionId(null);

    try {
      const result = await api.createSession();
      if (result.success && result.data) {
        localStorage.setItem(SESSION_KEY, result.data.id);
        setSessionId(result.data.id);
        setSession(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sessionId, session, isLoading, error, resetSession };
}
