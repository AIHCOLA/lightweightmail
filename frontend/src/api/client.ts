import type { ApiResponse, Session, EmailAddress, Email, EmailListItem, Attachment, AppConfig, SendEmailParams } from '../types';
import type { AuthUser } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Token callbacks — set by AuthContext
let onGetAccessToken: (() => string | null) = () => null;
let onRefreshTokens: (() => Promise<boolean>) = async () => false;

export function setTokenAccessors(
  getAccessToken: () => string | null,
  refreshTokens: () => Promise<boolean>
) {
  onGetAccessToken = getAccessToken;
  onRefreshTokens = refreshTokens;
}


async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach JWT if available
  const token = onGetAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && token) {
    const refreshed = await onRefreshTokens();
    if (refreshed) {
      const newToken = onGetAccessToken();
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryRes = await fetch(url, { ...options, headers });
        if (!retryRes.ok) {
          const body = await retryRes.json().catch(() => ({ error: retryRes.statusText }));
          return { success: false, error: body.error || `HTTP ${retryRes.status}` };
        }
        return retryRes.json();
      }
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    return { success: false, error: body.error || `HTTP ${res.status}` };
  }
  return res.json();
}

// =========== Auth API ===========

export async function getCsrfToken(): Promise<ApiResponse<{ csrf_token: string }>> {
  return apiFetch<{ csrf_token: string }>('/auth/csrf');
}

export async function sendVerificationCode(phone: string, csrfToken?: string): Promise<ApiResponse<{ message: string }>> {
  return apiFetch<{ message: string }>('/auth/send-code', {
    method: 'POST',
    body: JSON.stringify({ phone, csrf_token: csrfToken }),
  });
}

export async function verifyCode(
  phone: string,
  code: string
): Promise<ApiResponse<{ user: AuthUser; access_token: string; refresh_token: string }>> {
  return apiFetch<{ user: AuthUser; access_token: string; refresh_token: string }>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export async function refreshToken(
  rt: string
): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
  return apiFetch<{ access_token: string; refresh_token: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: rt }),
  });
}

export async function logoutUser(rt?: string): Promise<ApiResponse<void>> {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: rt }),
  });
}

export async function getMe(): Promise<ApiResponse<{
  user: AuthUser;
  accounts: Array<{ provider: string; provider_email: string | null; provider_name: string | null; linked_at: number }>;
}>> {
  return apiFetch('/auth/me');
}

export async function getOAuthUrl(provider: 'github' | 'google'): Promise<ApiResponse<{ url: string }>> {
  return apiFetch<{ url: string }>(`/auth/oauth/${provider}`);
}

// =========== Session (guest mode) ===========

export async function createSession(): Promise<ApiResponse<Session>> {
  return apiFetch<Session>('/sessions', { method: 'POST', body: '{}' });
}
export async function getSession(sessionId: string): Promise<ApiResponse<Session>> {
  return apiFetch<Session>(`/sessions/${sessionId}`);
}

// =========== Address ===========

export async function createAddress(
  sessionId?: string,
  prefix?: string
): Promise<ApiResponse<EmailAddress>> {
  const body: Record<string, string | undefined> = { prefix };
  if (sessionId) body.session_id = sessionId;
  return apiFetch<EmailAddress>('/addresses', { method: 'POST', body: JSON.stringify(body) });
}

export async function getAddresses(sessionId?: string): Promise<ApiResponse<EmailAddress[]>> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : '';
  return apiFetch<EmailAddress[]>(`/addresses${query}`);
}

export async function deleteAddress(addressId: string, sessionId?: string): Promise<ApiResponse<void>> {
  return apiFetch<void>('/addresses/' + addressId, {
    method: 'DELETE',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// =========== Emails ===========

export async function getEmails(addressId: string, folder: string = 'inbox', since?: number, limit: number = 50): Promise<ApiResponse<EmailListItem[]>> {
  let path = `/emails?address_id=${encodeURIComponent(addressId)}&folder=${folder}&limit=${limit}`;
  if (since) path += `&since=${since}`;
  return apiFetch<EmailListItem[]>(path);
}

export async function getEmailDetail(emailId: string): Promise<ApiResponse<Email>> {
  return apiFetch<Email>(`/emails/${emailId}`);
}

export async function sendEmail(params: SendEmailParams): Promise<ApiResponse<Email>> {
  return apiFetch<Email>('/emails/send', { method: 'POST', body: JSON.stringify(params) });
}

export async function toggleStar(emailId: string): Promise<ApiResponse<{ is_starred: number }>> {
  return apiFetch<{ is_starred: number }>(`/emails/${emailId}/star`, { method: 'PUT' });
}

export async function moveToTrash(emailId: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/emails/${emailId}/trash`, { method: 'PUT' });
}

export async function restoreFromTrash(emailId: string): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/emails/${emailId}/restore`, { method: 'PUT' });
}

export async function deleteEmail(emailId: string, sessionId?: string): Promise<ApiResponse<void>> {
  return apiFetch<void>('/emails/' + emailId, {
    method: 'DELETE',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

// =========== Attachments ===========

export function getAttachmentDownloadUrl(attachmentId: string): string {
  return `${API_BASE}/attachments/${attachmentId}/download`;
}
export async function getAttachmentInfo(attachmentId: string): Promise<ApiResponse<Attachment>> {
  return apiFetch<Attachment>(`/attachments/${attachmentId}`);
}

// =========== Config ===========

export async function getConfig(): Promise<ApiResponse<AppConfig>> {
  return apiFetch<AppConfig>('/config');
}
