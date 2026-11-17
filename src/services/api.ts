import type {
  AnalyzedActionItem,
  MeetingAnalysisType,
  MeetingStatus,
} from '../hooks/useMeetingSocket';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
const SESSION_TOKEN_KEY = 'si_access_token';

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
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(SESSION_TOKEN_KEY);
}

export function clearStoredToken(): void {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new Event('si:logout'));
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) {
    window.dispatchEvent(new Event('si:unauthorized'));
    throw new Error('Sessão expirada. Informe o código de acesso.');
  }
  return { Authorization: `Bearer ${token}` };
}

function handleUnauthorized(res: Response): void {
  if (res.status === 401) {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    window.dispatchEvent(new Event('si:unauthorized'));
  }
}

export async function loginWithAccessCode(code: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/auth/login/dev`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });

  if (res.status === 429) {
    throw new Error('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
  }

  if (!res.ok) {
    throw new Error('Código de acesso inválido.');
  }

  const data = (await res.json()) as { access_token: string };
  sessionStorage.setItem(SESSION_TOKEN_KEY, data.access_token);
}

export async function fetchMeetings(): Promise<MeetingListItem[]> {
  const res = await fetch(`${API_BASE_URL}/meetings`, {
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    throw new Error(`Erro ao carregar reuniões (HTTP ${res.status})`);
  }
  return res.json() as Promise<MeetingListItem[]>;
}

export async function fetchMeetingById(
  id: string,
): Promise<MeetingDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/meetings/${id}`, {
    headers: getAuthHeaders(),
  });
  handleUnauthorized(res);
  if (!res.ok) {
    throw new Error(`Erro ao carregar detalhes da reunião (HTTP ${res.status})`);
  }
  return res.json() as Promise<MeetingDetailResponse>;
}

export async function requestUploadUrl(
  title: string,
  fileSize: number,
): Promise<UploadUrlResponse> {
  const res = await fetch(`${API_BASE_URL}/meetings/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ title, fileSize }),
  });
  handleUnauthorized(res);
  if (res.status === 429) {
    throw new Error(
      'Limite de uploads por minuto atingido. Aguarde um instante.',
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao gerar URL de upload (HTTP ${res.status}): ${text}`);
  }
  return res.json() as Promise<UploadUrlResponse>;
}

export async function uploadVideoToS3(
  uploadUrl: string,
  file: File,
  contentType = 'video/mp4',
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Falha no upload para o Amazon S3 (HTTP ${res.status})`);
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
