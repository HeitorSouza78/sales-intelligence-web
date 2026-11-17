import type {
  AnalyzedActionItem,
  MeetingAnalysisType,
  MeetingStatus,
} from '../hooks/useMeetingSocket';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

export async function fetchMeetings(): Promise<MeetingListItem[]> {
  const res = await fetch(`${API_BASE_URL}/meetings`);
  if (!res.ok) {
    throw new Error(`Erro ao carregar reuniões (HTTP ${res.status})`);
  }
  return res.json() as Promise<MeetingListItem[]>;
}

export async function fetchMeetingById(
  id: string,
): Promise<MeetingDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/meetings/${id}`);
  if (!res.ok) {
    throw new Error(`Erro ao carregar detalhes da reunião (HTTP ${res.status})`);
  }
  return res.json() as Promise<MeetingDetailResponse>;
}

let cachedDevToken: string | null = null;

async function getDevAccessToken(): Promise<string> {
  if (cachedDevToken) {
    return cachedDevToken;
  }

  const res = await fetch(`${API_BASE_URL}/auth/login/dev`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Erro ao obter token de desenvolvimento (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { access_token: string };
  cachedDevToken = data.access_token;
  return cachedDevToken;
}

export async function requestUploadUrl(
  title: string,
  fileSize: number,
): Promise<UploadUrlResponse> {
  const token = await getDevAccessToken();

  const res = await fetch(`${API_BASE_URL}/meetings/upload-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, fileSize }),
  });
  if (!res.ok) {
    if (res.status === 401) {
      cachedDevToken = null;
    }
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
  const match = notes.match(/Categoria:\s*(DEMO|NEGOTIATION|FOLLOW_UP|CLOSING)/i);
  return match ? (match[1].toUpperCase() as MeetingAnalysisType) : null;
}
