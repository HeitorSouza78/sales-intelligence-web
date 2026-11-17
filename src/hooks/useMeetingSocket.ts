import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

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

  // Mantém a referência mais recente do callback sem reiniciar a conexão do socket
  const onAnalyzedRef = useRef(onMeetingAnalyzed);
  onAnalyzedRef.current = onMeetingAnalyzed;

  useEffect(() => {
    const socket: Socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    const handleConnect = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleConnectError = (err: Error) => {
      setIsConnected(false);
      setConnectionError(err.message);
    };

    const handleMeetingAnalyzed = (payload: MeetingAnalyzedEvent) => {
      // Atualiza a tela apenas se o evento for da reunião aberta no momento
      if (payload.meetingId === meetingId) {
        onAnalyzedRef.current(payload);
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('meeting.analyzed', handleMeetingAnalyzed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('meeting.analyzed', handleMeetingAnalyzed);
      socket.disconnect();
    };
  }, [meetingId, serverUrl]);

  return { isConnected, connectionError };
}
