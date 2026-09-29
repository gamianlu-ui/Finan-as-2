import React, { useState } from 'react';
import { TransactionItem, FinanceMode } from '../types';
import {
  formatBRL,
  formatDateBr,
  getTodayDateString,
  getDaysDifference,
  addDaysToDateString,
} from '../utils/formatters';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarPlus,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface Props {
  items: TransactionItem[];
  mode: FinanceMode;
  onClose: () => void;
  onConfirmReceivable: (item: TransactionItem) => void;
  onConfirmPayable: (item: TransactionItem) => void;
  onExtendDeadline: (item: TransactionItem, newDate: string, reason: string) => void;
}

export const DueAlertsModal: React.FC<Props> = ({
  items,
  mode,
  onClose,
  onConfirmReceivable,
  onConfirmPayable,
  onExtendDeadline,
}) => {
  // Estado para armazenar qual item está com o painel de "Dar/Pedir Mais Prazo" aberto
  const [extendingItemId, setExtendingItemId] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<number>(7);
  const [customDate, setCustomDate] = useState<string>('');

  const todayStr = getTodayDateString();

  // Filtrar apenas itens pendentes (que ainda não foram liquidados/recebidos/pagos)
  const pendingItems = items.filter(
    (t) => (t.tipo === 'entrada_futura' || t.tipo === 'saida_futura' || t.tipo === 'servico') && !t.recebido
  );

  // Separar em:
  // 1. Vencem Hoje ou Já Vencidos (diff <= 0)
  // 2. Vencem Amanhã (diff === 1)
  const dueTodayOrOverdue = pendingItems.filter((t) => {
    const targetDate = t.dataPrevista || t.dataFim || t.data;
    const diff = getDaysDifference(targetDate, todayStr);
    return diff <= 0;
  });

  const dueTomorrow = pendingItems.filter((t) => {
    const targetDate = t.dataPrevista || t.dataFim || t.data;
    const diff = getDaysDifference(targetDate, todayStr);
    return diff === 1;
  });

  const totalAlerts = dueTodayOrOverdue.length + dueTomorrow.length;

  const handleApplyPresetDays = (item: TransactionItem, days: number) => {
    const baseDate = item.dataPrevista || item.dataFim || todayStr;
    const newDate = addDaysToDateString(baseDate < todayStr ? todayStr : baseDate, days);
    const isReceivable = item.tipo === 'entrada_futura';
    const reason = isReceivable
      ? `Mais prazo concedido ao cliente (+${days} dias)`
      : `Mais prazo solicitado para pagamento (+${days} dias)`;

    onExtendDeadline(item, newDate, reason);
    setExtendingItemId(null);
  };

  const handleApplyCustomDate = (item: TransactionItem) => {
    if (!customDate) return;
    const isReceivable = item.tipo === 'entrada_futura';
    const reason = isReceivable
      ? `Novo prazo concedido ao cliente até ${formatDateBr(customDate)}`
      : `Novo prazo solicitado para pagamento até ${formatDateBr(customDate)}`;

    onExtendDeadline(item, customDate, reason);
    setExtendingItemId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl bg-[#12131A] border border-white/20 rounded-2xl shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
        {/* Cabeçalho do Alerta */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 animate-bounce">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white truncate flex items-center gap-2">
                <span>Notificação de Vencimentos & Prazos</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono">
                  {totalAlerts} {totalAlerts === 1 ? 'pendência' : 'pendências'}
                </span>
              </h3>
              <p className="text-[11px] text-neutral-400">
                Avisos do dia e lembrete antecipado de 1 dia antes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com a listagem de pendências */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {totalAlerts === 0 ? (
            <div className="text-center py-10 px-4 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Tudo em dia por aqui!
              </h4>
              <p className="text-xs text-neutral-400 max-w-sm">
                Não há pagamentos ou recebimentos vencendo hoje ou amanhã.
              </p>
            </div>
          ) : (
            <>
              {/* 1. SEÇÃO DE VENCIMENTOS HOJE / VENCIDOS */}
              {dueTodayOrOverdue.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>Chegou a data de pagar ou receber (Hoje / Vencendo)</span>
                  </div>

                  {dueTodayOrOverdue.map((item) => {
                    const isReceivable = item.tipo === 'entrada_futura' || item.tipo === 'servico';
                    const targetDate = item.dataPrevista || item.dataFim || item.data;
                    const diff = getDaysDifference(targetDate, todayStr);
                    const isOverdue = diff < 0;
                    const isExtending = extendingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                          isReceivable
                            ? 'bg-purple-950/25 border-purple-500/35 hover:border-purple-500/50'
                            : 'bg-amber-950/25 border-amber-500/35 hover:border-amber-500/50'
                        }`}
                      >
                        {/* Linha 1: Descrição e Valor */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">
                                {item.descricao}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border font-mono ${
                                  isReceivable
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {isReceivable ? 'A Receber' : 'A Pagar'}
                              </span>

                              {isOverdue && (
                                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                  Venceu há {Math.abs(diff)} {Math.abs(diff) === 1 ? 'dia' : 'dias'}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-neutral-300 mt-1 flex-wrap font-mono">
                              <span className="text-white font-semibold">
                                {isOverdue ? 'Vencimento original: ' : 'Data prevista: '}
                                {formatDateBr(targetDate)}
                              </span>
                              {item.cliente && (
                                <>
                                  <span>·</span>
                                  <span>Cliente: {item.cliente}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-lg font-bold font-mono ${
                                isReceivable ? 'text-purple-300' : 'text-amber-400'
                              }`}
                            >
                              {formatBRL(item.valor)}
                            </span>
                          </div>
                        </div>

                        {/* PERGUNTA INTERATIVA CONFORME O TIPO */}
                        <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-2">
                          <p className="text-xs text-neutral-200 font-medium">
                            {isReceivable
                              ? '👉 Você já recebeu este valor do cliente ou deseja dar mais prazo para receber?'
                              : '👉 Você já pagou este compromisso ou vai pedir mais prazo para pagar?'}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Botão de confirmação imediata (Já Recebi / Já Paguei) */}
                            {isReceivable ? (
                              <button
                                type="button"
                                onClick={() => onConfirmReceivable(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all cursor-pointer shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Já Recebi</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onConfirmPayable(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Já Paguei</span>
                              </button>
                            )}

                            {/* Botão para abrir o seletor de prazo */}
                            <button
                              type="button"
                              onClick={() => setExtendingItemId(isExtending ? null : item.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                                isExtending
                                  ? 'bg-blue-600 text-white border-blue-400'
                                  : 'bg-white/10 hover:bg-white/20 text-neutral-200 border-white/20'
                              }`}
                            >
                              <CalendarPlus className="w-3.5 h-3.5 text-blue-400" />
                              <span>
                                {isReceivable ? 'Dar Mais Prazo' : 'Pedir Mais Prazo'}
                              </span>
                            </button>
                          </div>

                          {/* PAINEL EXPANSÍVEL: DAR OU PEDIR MAIS PRAZO */}
                          {isExtending && (
                            <div className="mt-2 p-3 bg-black/60 border border-blue-500/40 rounded-xl space-y-2 animate-in fade-in">
                              <span className="text-[11px] font-semibold text-blue-300 block">
                                {isReceivable
                                  ? 'Escolha quantos dias a mais conceder para o cliente:'
                                  : 'Escolha quantos dias a mais solicitar para pagar:'}
                              </span>

                              {/* Atalhos Rápidos */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[3, 7, 15, 30].map((days) => (
                                  <button
                                    key={days}
                                    type="button"
                                    onClick={() => handleApplyPresetDays(item, days)}
                                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 transition-colors cursor-pointer"
                                  >
                                    +{days} dias
                                  </button>
                                ))}
                              </div>

                              {/* Ou escolher data específica */}
                              <div className="flex items-center gap-2 pt-1">
                                <span className="text-[11px] text-neutral-400">Ou até a data:</span>
                                <input
                                  type="date"
                                  min={todayStr}
                                  value={customDate}
                                  onChange={(e) => setCustomDate(e.target.value)}
                                  className="bg-black border border-white/20 rounded-lg px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-blue-400"
                                />
                                <button
                                  type="button"
                                  disabled={!customDate}
                                  onClick={() => handleApplyCustomDate(item)}
                                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors cursor-pointer"
                                >
                                  Salvar Prazo
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. SEÇÃO DE VENCIMENTOS AMANHÃ (AVISO PRÉVIO - 1 DIA ANTES) */}
              {dueTomorrow.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs uppercase tracking-wider">
                    <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Lembrete prévio: Vence amanhã (1 dia antes)</span>
                  </div>

                  {dueTomorrow.map((item) => {
                    const isReceivable = item.tipo === 'entrada_futura' || item.tipo === 'servico';
                    const targetDate = item.dataPrevista || item.dataFim || item.data;
                    const isExtending = extendingItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">
                                {item.descricao}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border font-mono ${
                                  isReceivable
                                    ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                }`}
                              >
                                {isReceivable ? 'A Receber Amanhã' : 'A Pagar Amanhã'}
                              </span>
                            </div>

                            <p className="text-xs text-neutral-400 mt-1">
                              📅 Vencimento marcado para <strong>amanhã ({formatDateBr(targetDate)})</strong>
                              {item.cliente && ` · Cliente: ${item.cliente}`}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-base font-bold font-mono text-white">
                              {formatBRL(item.valor)}
                            </span>
                          </div>
                        </div>

                        {/* Ações Rápidas de antecipação ou já prorrogar */}
                        <div className="mt-2.5 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[11px] text-neutral-400">
                            Avisaremos novamente amanhã assim que abrir o app.
                          </span>

                          <div className="flex items-center gap-1.5">
                            {isReceivable ? (
                              <button
                                type="button"
                                onClick={() => onConfirmReceivable(item)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors cursor-pointer"
                              >
                                Já Recebi
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onConfirmPayable(item)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-colors cursor-pointer"
                              >
                                Já Paguei
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setExtendingItemId(isExtending ? null : item.id)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                            >
                              {isReceivable ? 'Dar Mais Prazo' : 'Pedir Mais Prazo'}
                            </button>
                          </div>
                        </div>

                        {/* Painel expansível se quiser já prorrogar no lembrete */}
                        {isExtending && (
                          <div className="mt-2 p-3 bg-black/60 border border-blue-500/40 rounded-xl space-y-2 animate-in fade-in">
                            <span className="text-[11px] font-semibold text-blue-300 block">
                              Estender prazo a partir de amanhã:
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[3, 7, 15, 30].map((days) => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => handleApplyPresetDays(item, days)}
                                  className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 transition-colors cursor-pointer"
                                >
                                  +{days} dias
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2">
          <span className="text-[11px] text-neutral-500">
            Você pode reabrir esta janela a qualquer momento tocando no sino 🔔 no topo.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
