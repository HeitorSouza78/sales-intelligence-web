import { type FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_POLICY_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export function RegisterPage() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validate = (): boolean => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    let valid = true;

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setNameError('Informe seu nome (entre 2 e 100 caracteres).');
      valid = false;
    } else {
      setNameError(null);
    }

    if (!trimmedEmail || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError('Informe um e-mail válido.');
      valid = false;
    } else {
      setEmailError(null);
    }

    if (
      password.length < 8 ||
      password.length > 128 ||
      !PASSWORD_POLICY_REGEX.test(password)
    ) {
      setPasswordError(
        'A senha deve ter entre 8 e 128 caracteres, com pelo menos 1 letra e 1 número.',
      );
      valid = false;
    } else {
      setPasswordError(null);
    }

    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : 'Não foi possível criar sua conta no momento.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordDescribedBy = passwordError
    ? 'register-password-hint register-password-error'
    : 'register-password-hint';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <UserPlus className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Criar Conta no Sales Intelligence
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Crie seu espaço exclusivo para subir gravações e acompanhar análises
            em tempo real.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-800"
            >
              {formError}
            </div>
          )}

          <div>
            <label
              htmlFor="register-name"
              className="block text-sm font-medium text-slate-700"
            >
              Nome completo
            </label>
            <div className="relative mt-1.5">
              <User
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'register-name-error' : undefined}
                placeholder="Seu nome"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
              />
            </div>
            {nameError && (
              <p
                id="register-name-error"
                className="mt-1.5 text-xs font-medium text-rose-700"
              >
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-medium text-slate-700"
            >
              E-mail corporativo
            </label>
            <div className="relative mt-1.5">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'register-email-error' : undefined}
                placeholder="voce@empresa.com"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-3.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
              />
            </div>
            {emailError && (
              <p
                id="register-email-error"
                className="mt-1.5 text-xs font-medium text-rose-700"
              >
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-medium text-slate-700"
            >
              Senha
            </label>
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="register-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordDescribedBy}
                placeholder="Mínimo de 8 caracteres"
                className="w-full rounded-xl border border-slate-300 py-2.5 pr-11 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            <p id="register-password-hint" className="mt-1.5 text-xs text-slate-500">
              Use de 8 a 128 caracteres, combinando ao menos 1 letra e 1 número.
            </p>
            {passwordError && (
              <p
                id="register-password-error"
                className="mt-1 text-xs font-medium text-rose-700"
              >
                {passwordError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Já possui conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-700 hover:text-indigo-800 hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </main>
  );
}
