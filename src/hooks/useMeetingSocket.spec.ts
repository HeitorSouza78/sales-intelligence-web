import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuthTokens,
  setAuthTokens,
} from '../services/authStorage';
import { useMeetingSocket } from './useMeetingSocket';

type Handler = (...args: unknown[]) => void;

const { ioMock, socketHandlers, mockSocket } = vi.hoisted(() => {
  const handlers = new Map<string, Set<Handler>>();
  const socket = {
    on: vi.fn((event: string, fn: Handler) => {
      const set = handlers.get(event) ?? new Set<Handler>();
      set.add(fn);
      handlers.set(event, set);
    }),
    off: vi.fn((event: string, fn: Handler) => {
      handlers.get(event)?.delete(fn);
    }),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const io = vi.fn(() => socket);
  return { ioMock: io, socketHandlers: handlers, mockSocket: socket };
});

const refreshSessionTokenMock = vi.fn<() => Promise<string | null>>();

vi.mock('socket.io-client', () => ({
  io: ioMock,
}));

vi.mock('../services/api', () => ({
  refreshSessionToken: () => refreshSessionTokenMock(),
}));

function emitSocketEvent(event: string, ...args: unknown[]) {
  socketHandlers.get(event)?.forEach((fn) => fn(...args));
}

function Harness({
  meetingId,
  onAnalyzed,
}: {
  meetingId: string;
  onAnalyzed: () => void;
}) {
  useMeetingSocket({
    meetingId,
    onMeetingAnalyzed: onAnalyzed,
    serverUrl: 'http://localhost:3000',
  });
  return null;
}

describe('useMeetingSocket', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    sessionStorage.clear();
    socketHandlers.clear();
    ioMock.mockClear();
    mockSocket.on.mockClear();
    mockSocket.off.mockClear();
    mockSocket.connect.mockClear();
    mockSocket.disconnect.mockClear();
    refreshSessionTokenMock.mockReset();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('não abre conexão WebSocket quando não há Access Token', () => {
    clearAuthTokens(false);
    act(() => {
      root.render(
        createElement(Harness, { meetingId: 'm1', onAnalyzed: vi.fn() }),
      );
    });
    expect(ioMock).not.toHaveBeenCalled();
  });

  it('envia o token no handshake via auth callback (fora da URL) e reconecta ao atualizar token', () => {
    setAuthTokens('access-inicial', 'refresh-1');

    act(() => {
      root.render(
        createElement(Harness, { meetingId: 'm1', onAnalyzed: vi.fn() }),
      );
    });

    expect(ioMock).toHaveBeenCalledTimes(1);
    const [url, options] = ioMock.mock.calls[0] as unknown as [
      string,
      { auth: (cb: (payload: { token: string }) => void) => void },
    ];
    expect(url).toBe('http://localhost:3000');

    const cb = vi.fn();
    options.auth(cb);
    expect(cb).toHaveBeenCalledWith({ token: 'access-inicial' });

    act(() => {
      setAuthTokens('access-renovado', 'refresh-2');
    });

    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSocket.connect).toHaveBeenCalled();

    const cbAfter = vi.fn();
    options.auth(cbAfter);
    expect(cbAfter).toHaveBeenCalledWith({ token: 'access-renovado' });
  });

  it('aciona refreshSessionToken quando handshake falha com Unauthorized e desconecta em sessão expirada', async () => {
    setAuthTokens('access-expirado', 'refresh-1');
    refreshSessionTokenMock.mockResolvedValueOnce(null);

    act(() => {
      root.render(
        createElement(Harness, { meetingId: 'm1', onAnalyzed: vi.fn() }),
      );
    });

    await act(async () => {
      emitSocketEvent('connect_error', new Error('Unauthorized'));
      await Promise.resolve();
    });

    expect(refreshSessionTokenMock).toHaveBeenCalledTimes(1);

    mockSocket.disconnect.mockClear();
    act(() => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });
    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  it('aciona refreshSessionToken quando o servidor desconecta (io server disconnect)', async () => {
    setAuthTokens('access-quase-expirado', 'refresh-1');
    refreshSessionTokenMock.mockResolvedValueOnce('access-novo');

    act(() => {
      root.render(
        createElement(Harness, { meetingId: 'm1', onAnalyzed: vi.fn() }),
      );
    });

    await act(async () => {
      emitSocketEvent('disconnect', 'io server disconnect');
      await Promise.resolve();
    });

    expect(refreshSessionTokenMock).toHaveBeenCalledTimes(1);
  });
});
