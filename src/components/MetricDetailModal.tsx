import React, { useState } from 'react';
import { TransactionItem, FinanceMode, AttachmentItem } from '../types';
import { formatBRL, formatDateBr } from '../utils/formatters';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import {
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  CheckCircle,
  Pencil,
  Trash2,
  ExternalLink,
  PlusCircle,
  Paperclip,
  Calendar,
  DollarSign,
} from 'lucide-react';

export type MetricType = 'saldo' | 'entrada' | 'entrada_futura' | 'saida' | 'saida_futura';

interface Props {
  metricType: MetricType;
  transactions: TransactionItem[];
  mode: FinanceMode;
  onClose: () => void;
  onEdit: (item: TransactionItem) => void;
  onDelete: (id: string) => void;
  onConfirmReceivable?: (item: TransactionItem) => void;
  onConfirmPayable?: (item: TransactionItem) => void;
  onFilterInHistory: (type: 'todos' | 'entrada' | 'entrada_futura' | 'saida_futura' | 'saida') => void;
  onQuickAddExample?: (text: string) => void;
}

export const MetricDetailModal: React.FC<Props> = ({
  metricType,
  transactions,
  mode,
  onClose,
  onEdit,
  onDelete,
  onConfirmReceivable,
  onConfirmPayable,
  onFilterInHistory,
  onQuickAddExample,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<AttachmentItem | null>(null);
  const isEmpresa = mode === 'empresa';

  // Configuração visual e título de cada métrica
  const config = {
    saldo: {
      title: isEmpresa ? 'Detalhamento: Saldo da Empresa' : 'Detalhamento: Saldo Geral',
      subtitle: isEmpresa
        ? 'Caixa líquido e balanço consolidado da empresa'
        : 'Composição de todas as receitas e despesas realizadas',
      icon: Wallet,
      color: isEmpresa ? 'text-blue-400' : 'text-emerald-400',
      badgeBg: isEmpresa ? 'bg-blue-500/15 border-blue-500/30' : 'bg-emerald-500/15 border-emerald-500/30',
      border: isEmpresa ? 'border-blue-500/30' : 'border-emerald-500/30',
    },
    entrada: {
      title: isEmpresa ? 'Detalhamento: Faturamento / Entradas' : 'Detalhamento: Entradas Realizadas',
      subtitle: isEmpresa
        ? 'Faturamento recebido de serviços, clientes e contratos'
        : 'Receitas e pagamentos já recebidos e creditados no saldo',
      icon: ArrowUpRight,
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
      border: 'border-emerald-500/30',
    },
    entrada_futura: {
      title: isEmpresa ? 'Detalhamento: A Receber (Contratos & Serviços)' : 'Detalhamento: A Receber',
      subtitle: isEmpresa
        ? 'Previsão de recebimento de contratos e serviços em execução'
        : 'Valores previstos para receber com datas acordadas',
      icon: CalendarClock,
      color: 'text-purple-300',
      badgeBg: 'bg-purple-500/15 border-purple-500/30',
      border: 'border-purple-500/30',
    },
    saida: {
      title: isEmpresa ? 'Detalhamento: Saídas & Custos Operacionais' : 'Detalhamento: Saídas e Despesas',
      subtitle: isEmpresa
        ? 'Gastos operacionais, insumos, gasolina e ferramentas'
        : 'Pagamentos, compras e custos já efetuados',
      icon: ArrowDownRight,
      color: 'text-rose-400',
      badgeBg: 'bg-rose-500/15 border-rose-500/30',
      border: 'border-rose-500/30',
    },
    saida_futura: {
      title: isEmpresa ? 'Detalhamento: A Pagar (Fornecedores & Contas)' : 'Detalhamento: A Pagar',
      subtitle: isEmpresa
        ? 'Ajudantes, fornecedores, boletos e compromissos com vencimento'
        : 'Contas, ajudantes e saídas futuras com data de vencimento',
      icon: CalendarClock,
      color: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 border-amber-500/30',
      border: 'border-amber-500/30',
    },
  }[metricType];

  const Icon = config.icon;

  // Filtrar itens pertinentes a esta métrica
  const relevantItems = transactions.filter((t) => {
    if (metricType === 'saldo') {
      return (
        t.tipo === 'entrada' ||
        t.tipo === 'saida' ||
        (t.tipo === 'servico' && t.recebido)
      );
    }
    if (metricType === 'entrada_futura') {
      return t.tipo === 'entrada_futura' || (t.tipo === 'servico' && !t.recebido);
    }
    return t.tipo === metricType;
  });

  // Calcular total da métrica
  const totalAmount = relevantItems.reduce((acc, curr) => {
    if (metricType === 'saldo') {
      if (curr.tipo === 'entrada') return acc + curr.valor;
      if (curr.tipo === 'saida') return acc - curr.valor;
      if (curr.tipo === 'servico' && curr.recebido) {
        return acc + curr.valor;
      }
      return acc;
    }
    return acc + curr.valor;
  }, 0);

  const handleOpenInMainList = () => {
    if (metricType === 'saldo') {
      onFilterInHistory('todos');
    } else {
      onFilterInHistory(metricType);
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
        <div className="w-full max-w-xl bg-[#12131A] border border-white/20 rounded-2xl shadow-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden">
          {/* Cabeçalho do Detalhamento */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-black/40">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${config.badgeBg} ${config.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {config.title}
                </h3>
                <p className="text-[11px] text-neutral-400 truncate">
                  {config.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Card Resumo do Valor Total */}
          <div className="p-4 sm:p-5 bg-black/25 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-semibold block">
                {metricType === 'saldo' ? 'Saldo Consolidado' : 'Total Acumulado'}
              </span>
              <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${config.color}`}>
                {formatBRL(totalAmount)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-neutral-300 font-mono">
                {relevantItems.length} {relevantItems.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>
          </div>

          {/* Lista de Registros Detalhados */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
            {relevantItems.length === 0 ? (
              <div className="text-center py-10 px-4 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-neutral-500 mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-neutral-300 mb-1">
                  Nenhum lançamento encontrado
                </h4>
                <p className="text-xs text-neutral-500 max-w-xs mb-4">
                  {metricType === 'saida_futura'
                    ? 'Você ainda não tem pagamentos ou contas agendadas a pagar.'
                    : metricType === 'entrada_futura'
                    ? 'Nenhum recebimento futuro cadastrado.'
                    : 'Nenhum registro para esta métrica no momento.'}
                </p>

                {metricType === 'saida_futura' && onQuickAddExample && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickAddExample('50 reais para o ajudante até dia 02');
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Exemplo: 50 reais para o ajudante até dia 02</span>
                  </button>
                )}
              </div>
            ) : (
              relevantItems.map((item) => {
                const isFuturePayable = item.tipo === 'saida_futura';
                const isFutureReceivable = item.tipo === 'entrada_futura';
                const hasComprovantes = item.comprovantes && item.comprovantes.length > 0;
                const hasEnterpriseDates = item.dataInicio || item.dataFim;
                const hasServiceValues =
                  item.valorServico !== undefined || item.acrescimos !== undefined;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    {/* Descrição, Datas de Início/Fim e Composição */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {item.descricao}
                        </span>
                        {item.categoria && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300">
                            {item.categoria}
                          </span>
                        )}
                        {/* Indicador de Comprovantes com Clique para Abrir */}
                        {hasComprovantes ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceipt(item.comprovantes![0])}
                            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 transition-colors cursor-pointer"
                          >
                            <Paperclip className="w-3 h-3" />
                            <span>Comprovante ({item.comprovantes!.length})</span>
                          </button>
                        ) : (
                          (isEmpresa || isFutureReceivable) && (
                            <button
                              type="button"
                              onClick={() => {
                                onEdit(item);
                                onClose();
                              }}
                              className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/35 text-blue-300 transition-colors cursor-pointer"
                            >
                              <Paperclip className="w-3 h-3 text-blue-400" />
                              <span>+ Fixar Nota / Comprovante</span>
                            </button>
                          )
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap font-mono">
                        {/* Data Início e Fim da Empresa */}
                        {hasEnterpriseDates ? (
                          <span className="flex items-center gap-1 text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                            <span>
                              {item.dataInicio ? formatDateBr(item.dataInicio) : formatDateBr(item.data)}
                              {item.dataFim && ` até ${formatDateBr(item.dataFim)}`}
                            </span>
                          </span>
                        ) : (
                          <span>Lançado em: {formatDateBr(item.data)}</span>
                        )}

                        {/* Exibição clara de vencimento/previsão */}
                        {item.dataPrevista && !hasEnterpriseDates && (
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-md ${
                              isFuturePayable
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            📅 {isFuturePayable ? 'Vencimento / Até: ' : 'Previsão: '}
                            {formatDateBr(item.dataPrevista)}
                          </span>
                        )}

                        {/* Detalhe de Valor de Serviço e Acréscimos */}
                        {hasServiceValues && (
                          <span className="text-neutral-300 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 text-blue-400" />
                            <span>Serviço: {formatBRL(item.valorServico || item.valor)}</span>
                            {item.acrescimos && item.acrescimos > 0 && (
                              <span className="text-amber-300">(+ Acréscimos: {formatBRL(item.acrescimos)})</span>
                            )}
                          </span>
                        )}

                        {item.cliente && (
                          <span>· Cliente: {item.cliente}</span>
                        )}
                      </div>
                    </div>

                    {/* Valor e Ações */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
                      <span
                        className={`text-base font-bold font-mono ${
                          item.tipo === 'entrada'
                            ? 'text-emerald-400'
                            : item.tipo === 'saida'
                            ? 'text-rose-400'
                            : isFuturePayable
                            ? 'text-amber-400'
                            : isFutureReceivable
                            ? 'text-purple-300'
                            : 'text-amber-300'
                        }`}
                      >
                        {item.tipo === 'entrada' ? '+' : item.tipo === 'saida' ? '-' : isFuturePayable ? '- ' : ''}
                        {formatBRL(item.valor)}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Botão de Dar Baixa para A Pagar */}
                        {isFuturePayable && onConfirmPayable && (
                          <button
                            onClick={() => {
                              onConfirmPayable(item);
                              onClose();
                            }}
                            title="Confirmar pagamento (Já Paguei)"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Já Paguei</span>
                          </button>
                        )}

                        {/* Botão de Dar Baixa para A Receber */}
                        {isFutureReceivable && onConfirmReceivable && (
                          <button
                            onClick={() => {
                              onConfirmReceivable(item);
                              onClose();
                            }}
                            title="Confirmar recebimento (Já Recebi)"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Já Recebi</span>
                          </button>
                        )}

                        {/* Botão Editar */}
                        <button
                          onClick={() => {
                            onEdit(item);
                            onClose();
                          }}
                          title="Editar lançamento"
                          className="p-1.5 rounded-lg text-neutral-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        {/* Botão Excluir */}
                        <button
                          onClick={() => {
                            onDelete(item.id);
                          }}
                          title="Dispensar lançamento"
                          className="p-1.5 rounded-lg text-neutral-300 hover:text-rose-300 bg-white/5 hover:bg-rose-500/20 border border-white/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé com Botão para Navegar para o Histórico */}
          <div className="p-3 sm:p-4 border-t border-white/10 bg-black/40 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleOpenInMainList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
              <span>Ver no Histórico Completo</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Visualizador de Comprovante caso o usuário tenha clicado na tag */}
      {selectedReceipt && (
        <ReceiptViewerModal
          attachment={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </>
  );
};
