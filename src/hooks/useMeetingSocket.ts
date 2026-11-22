import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { refreshSessionToken } from '../services/api';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_UPDATED_EVENT,
  getAccessToken,
} from '../services/authStorage';

export type MeetingStatus =
  | 'PENDING'
  | 'EXTRACTING_AUDIO'
  | 'ANALYZING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type MeetingAnalysisType =
  | 'DEMO'
  | 'NEGOTIATION'
  | 'FOLLOW_UP'
  | 'CLOSING';

export interface AnalyzedActionItem {
  type: 'OBJECTION' | 'TASK' | 'BUDGET';
  description: string;
}

export interface MeetingAnalyzedEvent {
  meetingId: string;
  status: MeetingStatus;
  complianceScore: number;
  type: MeetingAnalysisType | null;
  notes?: string | null;
  actionItems: AnalyzedActionItem[];
  audioUrl?: string;
}

interface UseMeetingSocketOptions {
  meetingId: string;
  onMeetingAnalyzed: (data: MeetingAnalyzedEvent) => void;
  serverUrl?: string;
}

const DEFAULT_SOCKET_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useMeetingSocket({
  meetingId,
  onMeetingAnalyzed,
  serverUrl = DEFAULT_SOCKET_URL,
}: UseMeetingSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const onAnalyzedRef = useRef(onMeetingAnalyzed);
  useEffect(() => {
    onAnalyzedRef.current = onMeetingAnalyzed;
  }, [onMeetingAnalyzed]);

  useEffect(() => {
    let activeToken = getAccessToken();
    if (!activeToken) {
      return;
    }

    let active = true;
    const socket: Socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: (cb) => {
        cb({ token: getAccessToken() ?? '' });
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    const handleConnect = () => {
      if (!active) return;
      activeToken = getAccessToken();
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = (reason?: string) => {
      if (!active) return;
      setIsConnected(false);

      // Quando o servidor desconecta ativamente (ex.: token expirado no gateway),
      // o Socket.IO não reconecta sozinho — renovamos o token para disparar
      // AUTH_TOKEN_UPDATED_EVENT e restabelecer o canal.
      if (reason === 'io server disconnect') {
        void refreshSessionToken();
      }
    };

    const handleConnectError = (err: Error) => {
      if (!active) return;
      setIsConnected(false);

      if (err.message.toLowerCase().includes('unauthorized')) {
        void refreshSessionToken().then((newToken) => {
          if (!active) return;
          if (!newToken) {
            setConnectionError('Sessão expirada. Faça login novamente.');
          }
        });
        return;
      }

      setConnectionError('Conexão em tempo real instável. Tentando reconectar...');
    };

    const handleMeetingAnalyzed = (payload: MeetingAnalyzedEvent) => {
      if (payload.meetingId === meetingId) {
        onAnalyzedRef.current(payload);
      }
    };

    const handleTokenUpdated = () => {
      if (!active) return;
      const latestToken = getAccessToken();
      if (!latestToken || latestToken === activeToken) {
        return;
      }
      activeToken = latestToken;
      socket.disconnect();
      socket.connect();
    };

    const handleSessionExpired = () => {
      if (!active) return;
      activeToken = null;
      setIsConnected(false);
      socket.disconnect();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('meeting.analyzed', handleMeetingAnalyzed);
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated);
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      active = false;
      window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated);
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('meeting.analyzed', handleMeetingAnalyzed);
      socket.disconnect();
    };
  }, [meetingId, serverUrl]);

  return { isConnected, connectionError };
}
