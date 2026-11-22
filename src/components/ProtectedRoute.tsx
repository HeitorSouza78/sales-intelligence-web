import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
        <div
          role="status"
          aria-live="polite"
          className="mx-auto max-w-5xl space-y-6"
        >
          <span className="sr-only">Verificando sua sessão...</span>
          <div className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div className="space-y-2">
              <div className="h-7 w-56 animate-pulse rounded-lg bg-slate-200" />
              <div className="h-4 w-80 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-10 w-20 animate-pulse rounded-xl bg-slate-200" />
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
            <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
