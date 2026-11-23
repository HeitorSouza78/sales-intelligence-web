import type {
  AnalyzedActionItem,
  MeetingAnalysisType,
  MeetingStatus,
} from '../hooks/useMeetingSocket';
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from './authStorage';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Faça login novamente.';

export type UserRole = 'SELLER' | 'MANAGER';
export type UserPlan = 'BASIC' | 'ENTERPRISE';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  createdAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface AuthResponse extends AuthTokens {
  user: PublicUser;
}

export interface MeetingListItem {
  id: string;
  title: string;
  status: MeetingStatus;
  createdAt: string;
}

export interface MeetingDetailResponse {
  id: string;
  title: string;
  scheduledAt: string;
  videoUrl: string;
  audioUrl: string | null;
  status: MeetingStatus;
  userId: string;
  createdAt: string;
  updatedAt: string;
  complianceScore: {
    id: string;
    score: number;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
  actionItems: Array<
    AnalyzedActionItem & {
      id: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
}

export interface UploadUrlResponse {
  meetingId: string;
  uploadUrl: string;
  contentType: string;
  expiresInSeconds: number;
  requiredHeaders?: Record<string, string>;
}

let refreshInFlight: Promise<string | null> | null = null;

/** Uso exclusivo de testes unitários para zerar o estado da trava entre casos. */
export function __resetRefreshLockForTests(): void {
  refreshInFlight = null;
}

/**
 * Renova o par de tokens usando trava single-flight: requisições 401 simultâneas
 * aguardam a mesma Promise de refresh para não acionar a detecção de reuso
 * do back-end e revogar a sessão.
 */
export function refreshSessionToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthTokens(true);
    return Promise.resolve(null);
  }

  refreshInFlight = (async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        clearAuthTokens(true);
        return null;
      }

      const data = (await res.json()) as AuthTokens;
      setAuthTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      clearAuthTokens(true);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();
  if (!token) {
    token = await refreshSessionToken();
  }
  if (!token) {
    throw new Error(SESSION_EXPIRED_MESSAGE);
  }

  const buildHeaders = (bearer: string): Headers => {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${bearer}`);
    return headers;
  };

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: buildHeaders(token),
  });

  if (res.status === 401) {
    // Se outra requisição concorrente já concluiu o refresh enquanto esta
    // recebia 401, reaproveita o novo token sem disparar outro /auth/refresh.
    const latestToken = getAccessToken();
    const refreshedToken =
      latestToken && latestToken !== token
        ? latestToken
        : await refreshSessionToken();
    if (!refreshedToken) {
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }

    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: buildHeaders(refreshedToken),
    });

    if (res.status === 401) {
      clearAuthTokens(true);
      throw new Error(SESSION_EXPIRED_MESSAGE);
    }
  }

  return res;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (res.status === 409) {
    throw new Error('Este e-mail já está cadastrado.');
  }
  if (res.status === 400) {
    throw new Error(
      'Dados inválidos. Verifique nome, e-mail e requisitos da senha.',
    );
  }
  if (res.status === 429) {
    throw new Error('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
  }
  if (!res.ok) {
    throw new Error('Não foi possível criar sua conta no momento.');
  }

  const data = (await res.json()) as AuthResponse;
  setAuthTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (res.status === 401 || res.status === 400) {
    throw new Error('E-mail ou senha inválidos.');
  }
  if (res.status === 429) {
    throw new Error('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
  }
  if (!res.ok) {
    throw new Error('Não foi possível entrar no momento. Tente novamente.');
  }

  const data = (await res.json()) as AuthResponse;
  setAuthTokens(data.accessToken, data.refreshToken);
  return data;
}

export async function fetchCurrentUser(): Promise<PublicUser> {
  const res = await authFetch('/auth/me');
  if (!res.ok) {
    throw new Error('Não foi possível validar sua sessão.');
  }
  return res.json() as Promise<PublicUser>;
}

export async function logoutUser(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Falhas de rede no logout não devem impedir a limpeza local da sessão.
  } finally {
    clearAuthTokens(true);
  }
}

export async function fetchMeetings(): Promise<MeetingListItem[]> {
  const res = await authFetch('/meetings');
  if (!res.ok) {
    throw new Error('Não foi possível carregar suas reuniões.');
  }
  return res.json() as Promise<MeetingListItem[]>;
}

export async function fetchMeetingById(
  id: string,
): Promise<MeetingDetailResponse> {
  const res = await authFetch(`/meetings/${id}`);
  if (res.status === 404 || res.status === 403 || res.status === 400) {
    throw new Error('Reunião não encontrada ou sem permissão de acesso.');
  }
  if (!res.ok) {
    throw new Error('Não foi possível carregar os detalhes da reunião.');
  }
  return res.json() as Promise<MeetingDetailResponse>;
}

export async function requestUploadUrl(
  title: string,
  fileSize: number,
): Promise<UploadUrlResponse> {
  const res = await authFetch('/meetings/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, fileSize }),
  });

  if (res.status === 413) {
    throw new Error('O arquivo selecionado ultrapassa o limite de 2 GB.');
  }
  if (res.status === 429) {
    throw new Error(
      'Limite de uploads por minuto atingido. Aguarde um instante.',
    );
  }
  if (res.status === 400) {
    throw new Error('Título ou tamanho do arquivo inválido.');
  }
  if (!res.ok) {
    throw new Error('Não foi possível iniciar o envio do vídeo.');
  }

  return res.json() as Promise<UploadUrlResponse>;
}

export async function uploadVideoToS3(
  uploadUrl: string,
  file: File,
  contentType = 'video/mp4',
  requiredHeaders?: Record<string, string>,
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      ...requiredHeaders,
    },
    body: file,
  });
  if (!res.ok) {
    throw new Error('Falha ao enviar o vídeo para o armazenamento em nuvem.');
  }
}

export function extractTypeFromNotes(
  notes: string | null | undefined,
): MeetingAnalysisType | null {
  if (!notes) return null;
  const match = notes.match(
    /Categoria:\s*(DEMO|NEGOTIATION|FOLLOW_UP|CLOSING)/i,
  );
  return match ? (match[1].toUpperCase() as MeetingAnalysisType) : null;
}
