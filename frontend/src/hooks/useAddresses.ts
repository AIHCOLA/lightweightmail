import { useState, useEffect, useCallback } from 'react';
import type { EmailAddress } from '../types';
import * as api from '../api/client';

/**
 * Hook for managing email addresses.
 * When sessionId is null, uses JWT auth (authenticated user).
 * When sessionId is set, uses session auth (guest mode).
 */
export function useAddresses(sessionId: string | null) {
  const [addresses, setAddresses] = useState<EmailAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await api.getAddresses(sessionId ?? undefined);
      if (result.success && result.data) {
        setAddresses(result.data);
      } else {
        setError(result.error ?? 'Failed to fetch addresses');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const createAddress = useCallback(
    async (prefix?: string): Promise<EmailAddress | null> => {
      setError(null);
      const result = await api.createAddress(sessionId ?? undefined, prefix);
      if (result.success && result.data) {
        setAddresses((prev) => [result.data!, ...prev]);
        return result.data;
      } else {
        setError(result.error ?? 'Failed to create address');
        return null;
      }
    },
    [sessionId]
  );

  const removeAddress = useCallback(
    async (addressId: string): Promise<boolean> => {
      const result = await api.deleteAddress(addressId, sessionId ?? undefined);
      if (result.success) {
        setAddresses((prev) => prev.filter((a) => a.id !== addressId));
        return true;
      } else {
        setError(result.error ?? 'Failed to delete address');
        return false;
      }
    },
    [sessionId]
  );

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    createAddress,
    removeAddress,
  };
}
