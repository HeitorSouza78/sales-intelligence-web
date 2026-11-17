import { type FormEvent, useEffect, useState } from 'react';
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
import {
  clearStoredToken,
  fetchMeetings,
  type MeetingListItem,
  requestUploadUrl,
  uploadVideoToS3,
} from '../services/api';

export function MeetingsListPage() {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Estado do modal de upload
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
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

  const closeModal = () => {
    if (isUploading) return;
    setIsModalOpen(false);
    setTitle('');
    setSelectedFile(null);
    setUploadError(null);
    setUploadStep(null);
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedFile) {
      setUploadError('Informe o título da reunião e selecione um arquivo .mp4.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      setUploadStep('Gerando URL segura de upload...');
      const { meetingId, uploadUrl, contentType } = await requestUploadUrl(
        title.trim(),
        selectedFile.size,
      );

      setUploadStep('Enviando vídeo diretamente para o Amazon S3...');
      await uploadVideoToS3(uploadUrl, selectedFile, contentType);

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
        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Video className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Inteligência de Reuniões
              </h1>
            </div>
            <p className="mt-1.5 text-sm text-slate-500">
              Acompanhe análises de conformidade, resumos executivos e itens de
              ação extraídos por IA.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setUploadError(null);
                setUploadStep(null);
                setIsModalOpen(true);
              }}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Enviar novo vídeo
            </button>
            <button
              type="button"
              onClick={clearStoredToken}
              title="Sair / Bloquear acesso"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        {/* Lista de Reuniões */}
        {loadError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
            Carregando reuniões...
          </div>
        ) : meetings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <FileVideo className="mx-auto h-10 w-10 text-slate-400" />
            <h2 className="mt-3 text-base font-semibold text-slate-900">
              Nenhuma reunião enviada ainda
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Clique em &ldquo;Enviar novo vídeo&rdquo; para subir uma gravação
              .mp4 e iniciar a análise automática.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(meeting.createdAt).toLocaleString('pt-BR')}
                          </span>
                          <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
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
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 animate-spin" />
                          )}
                          {meeting.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Modal de Upload */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Enviar Nova Reunião (.mp4)
              </h2>
              <button
                type="button"
                disabled={isUploading}
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
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
                  disabled={isUploading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Demonstração Comercial — Cliente Acme"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label
                  htmlFor="meeting-video"
                  className="block text-sm font-medium text-slate-700"
                >
                  Arquivo de Vídeo (.mp4)
                </label>
                <label
                  htmlFor="meeting-video"
                  className="mt-1.5 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <UploadCloud className="h-8 w-8 text-indigo-500" />
                  <span className="mt-2 text-sm font-medium text-slate-700">
                    {selectedFile
                      ? selectedFile.name
                      : 'Clique para selecionar um arquivo .mp4'}
                  </span>
                  {selectedFile && (
                    <span className="mt-1 text-xs text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  <input
                    id="meeting-video"
                    type="file"
                    accept="video/mp4"
                    disabled={isUploading}
                    onChange={(e) =>
                      setSelectedFile(e.target.files?.[0] ?? null)
                    }
                    className="sr-only"
                  />
                </label>
              </div>

              {uploadError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                  {uploadError}
                </div>
              )}

              {uploadStep && (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs font-medium text-indigo-700">
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
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
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
