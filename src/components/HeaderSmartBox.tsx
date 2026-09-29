import React, { useState, useRef, useEffect } from 'react';
import { FinanceMode, SummaryStats, TransactionItem } from '../types';
import { parseNaturalLanguageInput } from '../utils/commandParser';
import { formatBRL } from '../utils/formatters';
import { MetricType } from './MetricDetailModal';
import {
  Sparkles,
  Maximize,
  Minimize,
  Home,
  Building2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  Send,
  AlertCircle,
  Undo2,
  ChevronRight,
  PlusCircle,
  FileText,
  DollarSign,
  Paperclip,
  Bell,
  Zap,
} from 'lucide-react';

interface Props {
  activeMode: FinanceMode;
  onToggleMode: (mode: FinanceMode) => void;
  stats: SummaryStats;
  dueAlertsCount?: number;
  onOpenDueAlerts?: () => void;
  onAddTransactions: (
    items: Array<Omit<TransactionItem, 'id' | 'createdAt'>>,
    feedbackMessage?: string
  ) => void;
  lastFeedback: {
    message: string;
    undo?: () => void;
    onAttachReceipt?: () => void;
    onOpenServiceDetail?: () => void;
  } | null;
  onClearFeedback: () => void;
  onResetDemo: () => void;
  onSelectMetricDetail?: (metric: MetricType) => void;
  onOpenNewTransaction?: () => void;
}

export const HeaderSmartBox: React.FC<Props> = ({
  activeMode,
  onToggleMode,
  stats,
  dueAlertsCount = 0,
  onOpenDueAlerts,
  onAddTransactions,
  lastFeedback,
  onClearFeedback,
  onSelectMetricDetail,
  onOpenNewTransaction,
}) => {
  const [input, setInput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Monitorar mudanças no status de tela cheia do navegador
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Alternar Tela Cheia com segurança sem quebrar no mobile
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
        } else if ((root as any).webkitRequestFullscreen) {
          await (root as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Tela cheia indisponível neste navegador ou contexto', err);
    }
  };

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setErrorMessage(null);
    const result = parseNaturalLanguageInput(input);

    if (result.recognized && result.items.length > 0) {
      onAddTransactions(result.items, result.feedback);
      setInput('');
      if (inputRef.current) {
        inputRef.current.blur();
      }
    } else {
      setErrorMessage(
        result.feedback ||
          'Não foi possível interpretar o valor. Exemplo: "50 para o ajudante até dia 02", "serviço 2500" ou use o botão "+ Novo Serviço".'
      );
    }
  };

  const isEmpresa = activeMode === 'empresa';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B0E14]/95 backdrop-blur-md border-b border-white/10 select-none">
      <div className="max-w-5xl mx-auto px-3 sm:px-8 py-2.5 sm:py-3.5 flex flex-col gap-2.5">
        {/* LINHA SUPERIOR: Seletor Casa/Empresa + Botão de Novo Serviço (Empresa) + Botão de Tela Cheia */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Seletor de Modo Casa / Empresa */}
          <div className="inline-flex p-1 bg-black/60 rounded-2xl border border-white/10 backdrop-blur shadow-inner">
            <button
              type="button"
              onClick={() => onToggleMode('casa')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                !isEmpresa
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Casa</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleMode('empresa')}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isEmpresa
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Empresa</span>
            </button>
          </div>

          {/* Botões do Lado Direito: Novo Serviço (Modo Empresa) + Tela Cheia */}
          <div className="flex items-center gap-2">
            {isEmpresa && onOpenNewTransaction && (
              <button
                type="button"
                onClick={onOpenNewTransaction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Novo Serviço / Contrato</span>
              </button>
            )}

            {/* Botão de Notificação de Vencimentos & Prazos (Sino) */}
            {onOpenDueAlerts && (
              <button
                type="button"
                onClick={onOpenDueAlerts}
                title="Lembretes de prazos e vencimentos"
                className={`relative p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
                  dueAlertsCount > 0
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-black/50 hover:bg-white/10 text-neutral-400 hover:text-white border-white/10'
                }`}
              >
                <Bell className={`w-4 h-4 ${dueAlertsCount > 0 ? 'animate-bounce' : ''}`} />
                {dueAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-black shadow-md font-mono">
                    {dueAlertsCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}
              className="p-2 sm:p-2.5 rounded-xl bg-black/50 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4 text-emerald-400" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* CAIXA DE ENTRADA INTELIGENTE */}
        <form onSubmit={handleLaunch} className="relative w-full min-w-0">
          <div
            className={`relative flex items-center rounded-2xl p-1 sm:p-1.5 border transition-all duration-200 ${
              isEmpresa
                ? 'bg-gradient-to-r from-blue-950/40 via-black to-blue-950/40 border-blue-500/30 focus-within:border-blue-500'
                : 'bg-gradient-to-r from-emerald-950/40 via-black to-emerald-950/40 border-emerald-500/30 focus-within:border-emerald-500'
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder=""
              className="w-full min-w-0 bg-black/60 border border-white/20 focus:border-white/50 rounded-xl py-2 sm:py-2.5 pl-3 pr-20 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none shadow-inner"
              autoFocus
            />

            <button
              type="submit"
              disabled={!input.trim()}
              className={`absolute right-2 sm:right-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isEmpresa
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-black shadow-md shadow-emerald-600/30'
              }`}
            >
              <span className="hidden sm:inline">Lançar</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* MENSAGEM DE ERRO OU DICA INTELIGENTE */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-2 sm:p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-neutral-400 hover:text-white px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* CARDS DE SALDO E RESUMO CONSOLIDADO (4 métricas clicáveis) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5 w-full max-w-full min-w-0">
          {/* 1. Saldo Total Líquido */}
          <button
            type="button"
            onClick={() => onSelectMetricDetail && onSelectMetricDetail('saldo')}
            title="Clique para ver o detalhamento do Saldo Geral"
            className={`p-2 sm:p-3 rounded-2xl border col-span-2 sm:col-span-1 min-w-0 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group ${
              isEmpresa
                ? 'bg-[#101524] border-blue-500/30 hover:border-blue-400 shadow-sm'
                : 'bg-[#101F18] border-emerald-500/30 hover:border-emerald-400 shadow-sm'
            }`}
          >
            <div className="text-[10px] text-neutral-400 flex items-center justify-between gap-1 uppercase font-medium">
              <span className="flex items-center gap-1 truncate">
                <Wallet className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {isEmpresa ? 'Saldo da Empresa' : 'Saldo Disponível'}
                </span>
              </span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-400 shrink-0" />
            </div>
            <div
              className={`text-base sm:text-xl font-light font-mono mt-0.5 truncate ${
                stats.saldoTotal >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {formatBRL(stats.saldoTotal)}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 flex items-center gap-0.5">
              <span>Toque para detalhar</span>
            </div>
          </button>

          {/* 2. Entradas / Faturamento */}
          <button
            type="button"
            onClick={() => onSelectMetricDetail && onSelectMetricDetail('entrada')}
            title="Clique para ver o detalhamento de todas as Entradas"
            className="p-2 sm:p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-emerald-500/50 min-w-0 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="text-[10px] text-emerald-400/90 flex items-center justify-between gap-1 uppercase font-medium">
              <span className="flex items-center gap-1 truncate">
                <ArrowUpRight className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {isEmpresa ? 'Entradas (Faturamento)' : 'Entradas'}
                </span>
              </span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-400 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-light font-mono text-emerald-400 mt-0.5 truncate">
              {formatBRL(stats.totalEntradas)}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 flex items-center gap-0.5">
              <span>Toque para detalhar</span>
            </div>
          </button>

          {/* 3. Saídas / Custos */}
          <button
            type="button"
            onClick={() => onSelectMetricDetail && onSelectMetricDetail('saida')}
            title="Clique para ver o detalhamento de todas as Saídas"
            className="p-2 sm:p-3 rounded-2xl bg-black/40 border border-white/10 hover:border-rose-500/50 min-w-0 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="text-[10px] text-rose-400/90 flex items-center justify-between gap-1 uppercase font-medium">
              <span className="flex items-center gap-1 truncate">
                <ArrowDownRight className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {isEmpresa ? 'Saídas (Custos)' : 'Saídas'}
                </span>
              </span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-light font-mono text-rose-400 mt-0.5 truncate">
              {formatBRL(stats.totalSaidas)}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 flex items-center gap-0.5">
              <span>Toque para detalhar</span>
            </div>
          </button>

          {/* 4. A Receber (Serviços / Contratos Previstos) */}
          <button
            type="button"
            onClick={() => onSelectMetricDetail && onSelectMetricDetail('entrada_futura')}
            title="Clique para ver o detalhamento dos valores A Receber"
            className="p-2 sm:p-3 rounded-2xl bg-black/40 border border-purple-500/25 hover:border-purple-500/60 min-w-0 text-left transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98] group col-span-2 sm:col-span-1"
          >
            <div className="text-[10px] text-purple-300 flex items-center justify-between gap-1 uppercase font-medium">
              <span className="flex items-center gap-1 truncate">
                <CalendarClock className="w-3 h-3 shrink-0" />
                <span className="truncate">
                  {isEmpresa ? 'A Receber (Contratos)' : 'A Receber'}
                </span>
              </span>
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-purple-300 shrink-0" />
            </div>
            <div className="text-sm sm:text-xl font-light font-mono text-purple-300 mt-0.5 truncate">
              {formatBRL(stats.totalEntradasFuturas)}
            </div>
            <div className="text-[9px] text-neutral-500 mt-0.5 flex items-center gap-0.5">
              <span>Toque para detalhar</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
