import { type FormEvent, useState } from 'react';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { loginWithAccessCode } from '../services/api';

interface AccessCodeGateProps {
  onSuccess: () => void;
}

export function AccessCodeGate({ onSuccess }: AccessCodeGateProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Digite o código de acesso.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await loginWithAccessCode(code.trim());
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao validar o código.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Inteligência de Reuniões
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Ambiente protegido. Informe o código de acesso para visualizar
            reuniões e enviar vídeos.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="access-code"
              className="block text-sm font-medium text-slate-700"
            >
              Código de Acesso
            </label>
            <div className="relative mt-1.5">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="access-code"
                type="password"
                autoFocus
                required
                disabled={isLoading}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Digite o código de acesso"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <ShieldCheck className="h-4 w-4" />
            {isLoading ? 'Validando...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
