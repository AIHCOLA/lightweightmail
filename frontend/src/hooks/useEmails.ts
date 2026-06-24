import { useState, useEffect, useCallback, useRef } from 'react';
import type { EmailListItem, Email, FolderType } from '../types';
import * as api from '../api/client';

const POLL_INTERVAL_MS = 5000;

/**
 * Hook for email management.
 * When sessionId is null, uses JWT auth.
 */
export function useEmails(addressId: string | null, sessionId: string | null) {
  const [emails, setEmails] = useState<EmailListItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFolder, setActiveFolder] = useState<FolderType>('inbox');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCheckRef = useRef<number>(0);
  const addressIdRef = useRef<string | null>(addressId);
  addressIdRef.current = addressId;

  const fetchEmails = useCallback(async (folder?: FolderType) => {
    const f = folder ?? activeFolder;
    if (!addressId) {
      setEmails([]);
      setSelectedEmail(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getEmails(addressId, f);
      if (result.success && result.data) {
        setEmails(result.data);
        lastCheckRef.current = result.meta?.fetched_at ?? Math.floor(Date.now() / 1000);
        setSelectedEmail(prev => {
          if (!prev) return null;
          const exists = result.data!.find(e => e.id === prev.id);
          return exists ? { ...prev, ...exists } : null;
        });
      } else {
        setError(result.error ?? 'Failed to fetch emails');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [addressId, activeFolder]);

  // Poll only for inbox
  const pollEmails = useCallback(async () => {
    const id = addressIdRef.current;
    if (!id || !sessionId || activeFolder !== 'inbox') return;
    try {
      const since = lastCheckRef.current;
      const result = await api.getEmails(id, 'inbox', since);
      if (result.success && result.data && result.data.length > 0) {
        setEmails(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEmails = result.data!.filter(e => !existingIds.has(e.id));
          return [...newEmails, ...prev];
        });
      }
    } catch { /* ignore polling errors */ }
  }, [sessionId, activeFolder]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  useEffect(() => {
    if (sessionId && addressId && activeFolder === 'inbox') {
      pollTimerRef.current = setInterval(pollEmails, POLL_INTERVAL_MS);
    }
    return () => {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [pollEmails, sessionId, addressId, activeFolder]);

  const switchFolder = useCallback((folder: FolderType) => {
    setActiveFolder(folder);
    setSelectedEmail(null);
    fetchEmails(folder);
  }, [fetchEmails]);

  const fetchEmailDetail = useCallback(async (emailId: string) => {
    setIsLoadingDetail(true);
    try {
      const result = await api.getEmailDetail(emailId);
      if (result.success && result.data) {
        setSelectedEmail(result.data);
        setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_read: 1 } : e));
      }
    } catch { /* */ }
    finally { setIsLoadingDetail(false); }
  }, []);

  const handleStar = useCallback(async () => {
    if (!selectedEmail) return;
    const result = await api.toggleStar(selectedEmail.id);
    if (result.success && result.data) {
      setSelectedEmail(prev => prev ? { ...prev, is_starred: result.data!.is_starred } : null);
      setEmails(prev => prev.map(e => e.id === selectedEmail.id ? { ...e, is_starred: result.data!.is_starred } : e));
    }
  }, [selectedEmail]);

  const handleDeleteDetail = useCallback(async () => {
    if (!selectedEmail || !sessionId) return false;
    if (selectedEmail.folder === 'trash') {
      const r = await api.deleteEmail(selectedEmail.id, sessionId ?? undefined);
      if (r.success) { setEmails(prev => prev.filter(e => e.id !== selectedEmail.id)); setSelectedEmail(null); }
      return r.success;
    }
    const r = await api.moveToTrash(selectedEmail.id);
    if (r.success) { setEmails(prev => prev.filter(e => e.id !== selectedEmail.id)); setSelectedEmail(null); }
    return r.success;
  }, [selectedEmail, sessionId]);

  const handleRestore = useCallback(async () => {
    if (!selectedEmail) return;
    const r = await api.restoreFromTrash(selectedEmail.id);
    if (r.success) {
      setEmails(prev => prev.filter(e => e.id !== selectedEmail.id));
      setSelectedEmail(null);
    }
  }, [selectedEmail]);

  const closeDetail = useCallback(() => setSelectedEmail(null), []);

  return {
    emails, selectedEmail, isLoading, isLoadingDetail, error,
    activeFolder, switchFolder,
    fetchEmails, fetchEmailDetail,
    handleStar, handleDeleteDetail, handleRestore, closeDetail,
  };
}
