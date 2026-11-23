import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetRefreshLockForTests,
  fetchMeetingById,
  fetchMeetings,
  loginUser,
  logoutUser,
  registerUser,
  requestUploadUrl,
  uploadVideoToS3,
} from './api';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  AUTH_TOKEN_UPDATED_EVENT,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from './authStorage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client & single-flight refresh interceptor', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    sessionStorage.clear();
    __resetRefreshLockForTests();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia Authorization: Bearer automaticamente em requisições autenticadas', async () => {
    setAuthTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    const result = await fetchMeetings();

    expect(result).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('renova o token automaticamente após 401 e repete a requisição com o novo token', async () => {
    setAuthTokens('expired-access', 'refresh-1');
    const updatedSpy = vi.fn();
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, updatedSpy);

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: 'fresh-access',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse([{ id: 'm1', title: 'Call', status: 'COMPLETED', createdAt: '' }]),
      );

    const meetings = await fetchMeetings();

    window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, updatedSpy);
    expect(meetings).toHaveLength(1);
    expect(getAccessToken()).toBe('fresh-access');
    expect(getRefreshToken()).toBe('refresh-2');
    expect(updatedSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const [, retryInit] = fetchMock.mock.calls[2];
    expect(new Headers(retryInit?.headers).get('Authorization')).toBe(
      'Bearer fresh-access',
    );
  });

  it('concorrência (trava single-flight): 3 chamadas 401 simultâneas disparam apenas 1 POST /auth/refresh', async () => {
    setAuthTokens('expired-access', 'refresh-1');

    let refreshCallCount = 0;
    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        refreshCallCount += 1;
        await new Promise((r) => setTimeout(r, 15));
        return jsonResponse({
          accessToken: 'fresh-access',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
        });
      }

      const auth = new Headers(init?.headers).get('Authorization');
      if (auth === 'Bearer expired-access') {
        return new Response(null, { status: 401 });
      }
      if (auth === 'Bearer fresh-access') {
        return jsonResponse([]);
      }
      return new Response(null, { status: 401 });
    });

    const results = await Promise.all([
      fetchMeetings(),
      fetchMeetings(),
      fetchMeetings(),
    ]);

    expect(refreshCallCount).toBe(1);
    expect(results).toEqual([[], [], []]);
    expect(getAccessToken()).toBe('fresh-access');
    expect(getRefreshToken()).toBe('refresh-2');
  });

  it('limpa a sessão e dispara si:session-expired quando o refresh falha', async () => {
    setAuthTokens('expired-access', 'revoked-refresh');
    const expiredSpy = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expiredSpy);

    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    await expect(fetchMeetings()).rejects.toThrow(
      'Sua sessão expirou. Faça login novamente.',
    );

    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expiredSpy);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(expiredSpy).toHaveBeenCalledTimes(1);
  });

  it('logoutUser envia POST /auth/logout, trata 204 e limpa tokens locais', async () => {
    setAuthTokens('access-1', 'refresh-1');
    const expiredSpy = vi.fn();
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, expiredSpy);
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await logoutUser();

    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, expiredSpy);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/auth\/logout$/),
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer access-1' },
      }),
    );
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(expiredSpy).toHaveBeenCalledTimes(1);
  });

  it('loginUser e registerUser armazenam tokens e traduzem erros HTTP sem vazar JSON cru', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        user: {
          id: 'u1',
          name: 'Ana',
          email: 'ana@empresa.com',
          role: 'SELLER',
          plan: 'BASIC',
          createdAt: '2026-11-19T00:00:00Z',
        },
        accessToken: 'acc-reg',
        refreshToken: 'ref-reg',
        tokenType: 'Bearer',
        expiresIn: 900,
      }, 201),
    );

    const reg = await registerUser({
      name: 'Ana',
      email: 'ana@empresa.com',
      password: 'Password123',
    });
    expect(reg.user.email).toBe('ana@empresa.com');
    expect(getAccessToken()).toBe('acc-reg');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Conflict stack trace xyz' }, 409),
    );
    await expect(
      registerUser({
        name: 'Ana',
        email: 'ana@empresa.com',
        password: 'Password123',
      }),
    ).rejects.toThrow('Este e-mail já está cadastrado.');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Credenciais inválidas' }, 401),
    );
    await expect(
      loginUser({ email: 'ana@empresa.com', password: 'Wrong123' }),
    ).rejects.toThrow('E-mail ou senha inválidos.');

    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'ThrottlerException' }, 429),
    );
    await expect(
      loginUser({ email: 'ana@empresa.com', password: 'Password123' }),
    ).rejects.toThrow('Muitas tentativas. Aguarde 1 minuto e tente novamente.');
  });

  it('fetchMeetingById e requestUploadUrl traduzem erros sem expor detalhes internos', async () => {
    setAuthTokens('access-1', 'refresh-1');
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Meeting secret UUID not found' }, 404),
    );
    await expect(fetchMeetingById('123')).rejects.toThrow(
      'Reunião não encontrada ou sem permissão de acesso.',
    );

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 413 }));
    await expect(requestUploadUrl('Reunião', 9999999999)).rejects.toThrow(
      'O arquivo selecionado ultrapassa o limite de 2 GB.',
    );
  });

  it('reaproveita token recém-renovado por chamada paralela quando um 401 chega atrasado', async () => {
    setAuthTokens('expired-access', 'refresh-1');
    let refreshCount = 0;
    let expiredCalls = 0;

    fetchMock.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/auth/refresh')) {
        refreshCount += 1;
        return jsonResponse({
          accessToken: 'fresh-access',
          refreshToken: 'refresh-2',
          tokenType: 'Bearer',
          expiresIn: 900,
        });
      }

      const auth = new Headers(init?.headers).get('Authorization');
      if (auth === 'Bearer expired-access') {
        expiredCalls += 1;
        if (expiredCalls === 2) {
          // Simula resposta 401 atrasada após req1 já ter concluído o refresh.
          await new Promise((r) => setTimeout(r, 20));
        }
        return new Response(null, { status: 401 });
      }
      if (auth === 'Bearer fresh-access') {
        return jsonResponse([]);
      }
      return new Response(null, { status: 401 });
    });

    const [r1, r2] = await Promise.all([fetchMeetings(), fetchMeetings()]);
    expect(r1).toEqual([]);
    expect(r2).toEqual([]);
    expect(refreshCount).toBe(1);
  });

  it('uploadVideoToS3 envia x-amz-meta-plan quando requiredHeaders é retornado pela API', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));
    const file = new File(['mp4-bytes'], 'call.mp4', { type: 'video/mp4' });

    await uploadVideoToS3('https://s3.example/presigned', file, 'video/mp4', {
      'Content-Type': 'video/mp4',
      'x-amz-meta-plan': 'ENTERPRISE',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://s3.example/presigned',
      expect.objectContaining({
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'x-amz-meta-plan': 'ENTERPRISE',
        },
        body: file,
      }),
    );
  });
});
