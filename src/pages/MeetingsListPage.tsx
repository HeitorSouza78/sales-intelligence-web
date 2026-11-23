import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileVideo,
  LogOut,
  Plus,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  fetchMeetings,
  type MeetingListItem,
  requestUploadUrl,
  uploadVideoToS3,
} from '../services/api';

export function MeetingsListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMeetings()
      .then((data) => {
        if (active) {
          setMeetings(data);
          setLoadError(null);
        }
      })
      .catch((err: Error) => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const closeModal = useCallback(() => {
    if (isUploading) return;
    setIsModalOpen(false);
    setTitle('');
    setSelectedFile(null);
    setTitleError(null);
    setFileError(null);
    setUploadError(null);
    setUploadStep(null);
  }, [isUploading]);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, closeModal]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setUploadError(null);

    const trimmedTitle = title.trim();
    let valid = true;
    if (!trimmedTitle || trimmedTitle.length > 200) {
      setTitleError('Informe um título com até 200 caracteres.');
      valid = false;
    } else {
      setTitleError(null);
    }

    if (!selectedFile) {
      setFileError('Selecione um arquivo de vídeo .mp4.');
      valid = false;
    } else {
      setFileError(null);
    }

    if (!valid || !selectedFile) return;

    setIsUploading(true);
    try {
      setUploadStep('Gerando URL segura de upload...');
      const { meetingId, uploadUrl, contentType, requiredHeaders } =
        await requestUploadUrl(trimmedTitle, selectedFile.size);

      setUploadStep('Enviando vídeo diretamente para o Amazon S3...');
      await uploadVideoToS3(
        uploadUrl,
        selectedFile,
        contentType,
        requiredHeaders,
      );

      setIsModalOpen(false);
      navigate(`/meetings/${meetingId}`);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Erro inesperado no upload.',
      );
      setIsUploading(false);
      setUploadStep(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Video className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Inteligência de Reuniões
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-600">
              Acompanhe análises de conformidade, resumos executivos e itens de
              ação extraídos por IA.
            </p>
            {user && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span>
                  Conectado como{' '}
                  <strong className="font-semibold text-slate-800">
                    {user.name}
                  </strong>
                </span>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                  Plano {user.plan}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTitleError(null);
                setFileError(null);
                setUploadError(null);
                setUploadStep(null);
                setIsModalOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Enviar novo vídeo
            </button>
            <button
              type="button"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {isLoggingOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </header>

        <main aria-label="Lista de reuniões">
          {loadError && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              {loadError}
            </div>
          )}

          {isLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="sr-only">Carregando reuniões...</span>
              <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ) : meetings.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <FileVideo
                className="mx-auto h-10 w-10 text-slate-400"
                aria-hidden="true"
              />
              <h2 className="mt-3 text-base font-semibold text-slate-900">
                Nenhuma reunião enviada ainda
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Clique em &ldquo;Enviar novo vídeo&rdquo; para subir uma
                gravação .mp4 e iniciar a análise automática.
              </p>
            </section>
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <ul className="divide-y divide-slate-100">
                {meetings.map((meeting) => {
                  const isCompleted = meeting.status === 'COMPLETED';
                  return (
                    <li key={meeting.id}>
                      <Link
                        to={`/meetings/${meeting.id}`}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-slate-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {meeting.title}
                          </p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Calendar
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {new Date(meeting.createdAt).toLocaleString(
                                'pt-BR',
                              )}
                            </span>
                            <span className="hidden font-mono text-[11px] text-slate-500 sm:inline">
                              {meeting.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                              isCompleted
                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                : 'bg-sky-50 text-sky-700 ring-sky-600/20'
                            }`}
                          >
                            {isCompleted ? (
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            ) : (
                              <Clock
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden="true"
                              />
                            )}
                            {meeting.status}
                          </span>
                          <ChevronRight
                            className="h-4 w-4 text-slate-400"
                            aria-hidden="true"
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="upload-modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                Enviar Nova Reunião (.mp4)
              </h2>
              <button
                type="button"
                disabled={isUploading}
                onClick={closeModal}
                aria-label="Fechar janela de envio"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} noValidate className="space-y-4">
              <div>
                <label
                  htmlFor="meeting-title"
                  className="block text-sm font-medium text-slate-700"
                >
                  Título da Reunião
                </label>
                <input
                  id="meeting-title"
                  type="text"
                  required
                  maxLength={200}
                  disabled={isUploading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-invalid={Boolean(titleError)}
                  aria-describedby={
                    titleError ? 'meeting-title-error' : undefined
                  }
                  placeholder="Ex: Demonstração Comercial — Cliente Acme"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500"
                />
                {titleError && (
                  <p
                    id="meeting-title-error"
                    className="mt-1.5 text-xs font-medium text-rose-700"
                  >
                    {titleError}
                  </p>
                )}
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">
                  Arquivo de Vídeo (.mp4)
                </span>
                <label
                  htmlFor="meeting-video"
                  className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <UploadCloud
                    className="h-8 w-8 text-indigo-600"
                    aria-hidden="true"
                  />
                  <span className="mt-2 text-sm font-medium text-slate-700">
                    {selectedFile
                      ? selectedFile.name
                      : 'Clique ou pressione Enter para selecionar um arquivo .mp4'}
                  </span>
                  {selectedFile && (
                    <span className="mt-1 text-xs text-slate-600">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  <input
                    id="meeting-video"
                    type="file"
                    accept="video/mp4"
                    disabled={isUploading}
                    aria-invalid={Boolean(fileError)}
                    aria-describedby={
                      fileError ? 'meeting-video-error' : undefined
                    }
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                  />
                </label>
                {fileError && (
                  <p
                    id="meeting-video-error"
                    className="mt-1.5 text-xs font-medium text-rose-700"
                  >
                    {fileError}
                  </p>
                )}
              </div>

              {uploadError && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800"
                >
                  {uploadError}
                </div>
              )}

              {uploadStep && (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-medium text-indigo-800"
                >
                  {uploadStep}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? 'Enviando...' : 'Iniciar Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
