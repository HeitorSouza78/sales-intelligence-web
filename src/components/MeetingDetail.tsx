import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  ShieldCheck,
  Sparkles,
  Tag,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  type AnalyzedActionItem,
  type MeetingAnalysisType,
  type MeetingAnalyzedEvent,
  type MeetingStatus,
  useMeetingSocket,
} from '../hooks/useMeetingSocket';
import { extractTypeFromNotes, fetchMeetingById } from '../services/api';

interface MeetingDetailProps {
  meetingId: string;
}

const TYPE_BADGE_STYLES: Record<MeetingAnalysisType, string> = {
  DEMO: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  NEGOTIATION: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  FOLLOW_UP: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  CLOSING: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
};

function parseNotes(rawNotes: string | null): {
  summary: string | null;
  keywords: string[];
} {
  if (!rawNotes) {
    return { summary: null, keywords: [] };
  }

  const summaryMatch = rawNotes.match(
    /Resumo:\s*([\s\S]*?)(?:\n\s*\nPalavras-chave:|$)/i,
  );
  const keywordsMatch = rawNotes.match(/Palavras-chave:\s*([^\n]+)/i);

  const summary = summaryMatch ? summaryMatch[1].trim() : rawNotes.trim();
  const keywords = keywordsMatch
    ? keywordsMatch[1]
        .split(',')
        .map((kw) => kw.trim())
        .filter(Boolean)
    : [];

  return { summary, keywords };
}

export function MeetingDetail({ meetingId }: MeetingDetailProps) {
  const [title, setTitle] = useState('Carregando reunião...');
  const [videoUrl, setVideoUrl] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('PENDING');
  const [complianceScore, setComplianceScore] = useState<number | null>(null);
  const [meetingType, setMeetingType] = useState<MeetingAnalysisType | null>(
    null,
  );
  const [notes, setNotes] = useState<string | null>(null);
  const [actionItems, setActionItems] = useState<AnalyzedActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    fetchMeetingById(meetingId)
      .then((data) => {
        if (!active) return;
        setTitle(data.title);
        setVideoUrl(data.videoUrl);
        setStatus(data.status);
        setComplianceScore(data.complianceScore?.score ?? null);
        setNotes(data.complianceScore?.notes ?? null);
        setMeetingType(extractTypeFromNotes(data.complianceScore?.notes));
        setActionItems(
          data.actionItems.map((item) => ({
            type: item.type,
            description: item.description,
          })),
        );
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
  }, [meetingId]);

  const { isConnected, connectionError } = useMeetingSocket({
    meetingId,
    onMeetingAnalyzed: (data: MeetingAnalyzedEvent) => {
      setStatus(data.status);
      setComplianceScore(data.complianceScore);
      setMeetingType(data.type);
      setNotes(data.notes ?? null);
      setActionItems(data.actionItems);
    },
  });

  const isCompleted = status === 'COMPLETED';
  const { summary, keywords } = parseNotes(notes);
  const scoreColor =
    complianceScore !== null && complianceScore >= 80
      ? 'text-emerald-600'
      : complianceScore !== null && complianceScore >= 60
        ? 'text-amber-600'
        : 'text-rose-600';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para reuniões
          </Link>
        </div>

        {/* Cabeçalho */}
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              {meetingType && (
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${TYPE_BADGE_STYLES[meetingType]}`}
                >
                  {meetingType}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-slate-500">
              ID da Reunião: {meetingId}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              }`}
            >
              {isConnected ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  Tempo real conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  Reconectando...
                </>
              )}
            </span>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                isCompleted
                  ? 'bg-slate-900 text-white ring-slate-900'
                  : 'bg-sky-50 text-sky-700 ring-sky-600/20'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Clock className="h-3.5 w-3.5 animate-spin" />
              )}
              {status}
            </span>
          </div>
        </header>

        {loadError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {loadError}
          </div>
        )}

        {connectionError && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Falha na conexão WebSocket: {connectionError}
          </div>
        )}

        {/* Grid principal: Vídeo + Score lateral */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Player de Vídeo (2/3) */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
                <Video className="h-4 w-4 text-slate-500" />
                <h2 className="text-sm font-medium text-slate-700">
                  Gravação da Reunião (Amazon S3)
                </h2>
              </div>
              <div className="bg-slate-950">
                {videoUrl && !isLoading ? (
                  <video
                    controls
                    preload="metadata"
                    src={videoUrl}
                    className="aspect-video w-full"
                  >
                    Seu navegador não suporta a reprodução de vídeo.
                  </video>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-sm text-slate-400">
                    Carregando vídeo seguro do S3...
                  </div>
                )}
              </div>
              <div className="truncate bg-slate-50 px-5 py-2.5 font-mono text-xs text-slate-500">
                {videoUrl ? 'Presigned URL assinada (expira em 1h)' : 'Aguardando URL...'}
              </div>
            </div>
          </div>

          {/* Painel Lateral de Compliance Score (1/3) */}
          <aside className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">
                  Compliance Score
                </span>
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>

              {isCompleted && complianceScore !== null ? (
                <div className="mt-6">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-5xl font-bold tracking-tight ${scoreColor}`}>
                      {complianceScore}
                    </span>
                    <span className="text-lg font-medium text-slate-400">
                      / 100
                    </span>
                  </div>
                  <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${complianceScore}%` }}
                    />
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">
                    Pontuação gerada automaticamente pelo Amazon Bedrock com
                    base na clareza, aderência ao script e postura comercial.
                  </p>
                </div>
              ) : (
                <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <Sparkles className="h-8 w-8 animate-pulse text-indigo-500" />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    IA analisando a reunião...
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    A nota aparecerá automaticamente assim que a AWS concluir.
                  </p>
                </div>
              )}
            </div>

            {meetingType && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Categoria Identificada
                </span>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${TYPE_BADGE_STYLES[meetingType]}`}
                  >
                    {meetingType}
                  </span>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Card de Resumo Executivo & Palavras-chave */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">
              Resumo Executivo & Palavras-chave
            </h2>
          </div>

          {!isCompleted ? (
            <p className="text-sm text-slate-500">
              Aguardando geração do resumo executivo e palavras-chave pelo Amazon
              Bedrock...
            </p>
          ) : summary ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {summary}
              </p>

              {keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                    <Tag className="h-3.5 w-3.5" />
                    Palavras-chave:
                  </span>
                  {keywords.map((keyword, index) => (
                    <span
                      key={`${keyword}-${index}`}
                      className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum resumo disponível para esta reunião.
            </p>
          )}
        </section>

        {/* Lista de Action Items */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Itens de Ação, Orçamentos e Prazos
            </h2>
            <span className="text-xs font-medium text-slate-500">
              {actionItems.length} item(ns)
            </span>
          </div>

          {!isCompleted ? (
            <p className="text-sm text-slate-500">
              Aguardando extração dos itens de ação pelo Amazon Bedrock...
            </p>
          ) : actionItems.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum item de ação explícito foi identificado nesta reunião.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {actionItems.map((item, index) => (
                <li
                  key={`${item.type}-${index}`}
                  className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <div className="flex-1">
                    <span className="mr-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {item.type}
                    </span>
                    <span className="text-sm text-slate-800">
                      {item.description}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
