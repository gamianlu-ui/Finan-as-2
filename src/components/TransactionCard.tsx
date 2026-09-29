import React, { useState } from 'react';
import { TransactionItem, FinanceMode, AttachmentItem } from '../types';
import { formatBRL, formatDateBr } from '../utils/formatters';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import {
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  CalendarClock,
  CheckCircle,
  Paperclip,
  Calendar,
  DollarSign,
  Clock,
  Hammer,
} from 'lucide-react';

interface Props {
  item: TransactionItem;
  mode: FinanceMode;
  onEdit: (item: TransactionItem) => void;
  onDelete: (id: string) => void;
  onConfirmReceivable?: (item: TransactionItem) => void;
  onConfirmPayable?: (item: TransactionItem) => void;
  onOpenServiceDetail?: (item: TransactionItem) => void;
}

export const TransactionCard: React.FC<Props> = ({
  item,
  mode,
  onEdit,
  onDelete,
  onConfirmReceivable,
  onConfirmPayable,
  onOpenServiceDetail,
}) => {
  const [selectedReceipt, setSelectedReceipt] = useState<AttachmentItem | null>(null);

  const isServico = item.tipo === 'servico';
  const isEntrada = item.tipo === 'entrada';
  const isSaida = item.tipo === 'saida';
  const isEntradaFutura = item.tipo === 'entrada_futura';
  const isSaidaFutura = item.tipo === 'saida_futura';
  const isEmpresa = mode === 'empresa';

  // Calcular lucro líquido se for serviço com custos
  const totalCustos = item.custos
    ? (item.custos.maoDeObra || 0) +
      (item.custos.gasolina || 0) +
      (item.custos.insumos || 0)
    : 0;
  const lucroLiquido = isServico ? item.valor - totalCustos : item.valor;

  const hasComprovantes = item.comprovantes && item.comprovantes.length > 0;
  const hasEnterpriseDates = item.dataInicio || item.dataFim;
  const hasServiceValues = item.valorServico !== undefined || item.acrescimos !== undefined;

  return (
    <>
      <div
        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 ${
          isEntradaFutura
            ? 'bg-[#15121F]/90 hover:bg-[#1A1629] border-purple-500/25 hover:border-purple-500/40 shadow-sm'
            : isSaidaFutura
            ? 'bg-[#1C1612]/90 hover:bg-[#241C16] border-amber-500/25 hover:border-amber-500/40 shadow-sm'
            : isEmpresa
            ? 'bg-[#101422]/90 hover:bg-[#141A2D] border-blue-500/20 hover:border-blue-500/40 shadow-sm'
            : 'bg-[#0E1813]/90 hover:bg-[#121F18] border-emerald-500/20 hover:border-emerald-500/40 shadow-sm'
        }`}
      >
        {/* Lado Esquerdo: Ícone + Descrição + Data + Tags */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1 pr-3">
          {/* Ícone de Tipo */}
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isEntradaFutura
                ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                : isSaidaFutura
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                : isServico
                ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                : isEntrada
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/35 text-rose-300'
            }`}
          >
            {isEntradaFutura || isSaidaFutura ? (
              <CalendarClock className="w-4 h-4" />
            ) : isServico ? (
              <Zap className="w-4 h-4" />
            ) : isEntrada ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownRight className="w-4 h-4" />
            )}
          </div>

          {/* Informações de Texto */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                onClick={() => {
                  if (isServico && onOpenServiceDetail) {
                    onOpenServiceDetail(item);
                  }
                }}
                className={`text-sm sm:text-base font-semibold text-white truncate ${
                  isServico ? 'cursor-pointer hover:text-blue-300 transition-colors' : ''
                }`}
              >
                {item.descricao}
              </span>

              {/* Tag do Tipo */}
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border tracking-wider font-mono ${
                  isEntradaFutura
                    ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    : isSaidaFutura
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : isServico
                    ? item.recebido
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    : isEntrada
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {isEntradaFutura
                  ? 'Entrada Futura'
                  : isSaidaFutura
                  ? 'A Pagar'
                  : isServico
                  ? item.recebido
                    ? 'Serviço Concluído'
                    : 'Serviço (A Receber)'
                  : isEntrada
                  ? 'Entrada'
                  : 'Saída'}
              </span>

              {/* Badges de OS, Extras e Custos para Serviços */}
              {isServico && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono">
                  {item.numeroOS || `OS-${String(item.createdAt).slice(-4)}`}
                </span>
              )}

              {isServico && item.itensAdicionais && item.itensAdicionais.length > 0 && (
                <span
                  title={item.itensAdicionais.map((x) => `${x.descricao} (${x.tempoEstimado ? x.tempoEstimado + ' - ' : ''}${formatBRL(x.valor)})`).join(', ')}
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300"
                >
                  +{item.itensAdicionais.length} Acréscimo(s)
                </span>
              )}

              {isServico && item.despesasTrabalho && item.despesasTrabalho.length > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {item.despesasTrabalho.length} Custo(s)
                </span>
              )}

              {/* Tag de Comprovante Anexo */}
              {hasComprovantes ? (
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(item.comprovantes![0])}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>
                    Comprovante ({item.comprovantes!.length})
                  </span>
                </button>
              ) : (
                (isEntradaFutura || isEmpresa) && (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    title="Fixar comprovante ou nota fiscal"
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Paperclip className="w-3 h-3 text-blue-400" />
                    <span>+ Fixar Nota / Comprovante</span>
                  </button>
                )
              )}
            </div>

            {/* Metadados: Datas, Períodos e Clientes */}
            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap font-mono">
              {/* Data ou Período Início ➔ Fim */}
              {hasEnterpriseDates ? (
                <span className="flex items-center gap-1 text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded">
                  <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                  <span>
                    {item.dataInicio ? formatDateBr(item.dataInicio) : formatDateBr(item.data)}
                    {item.dataFim && ` até ${formatDateBr(item.dataFim)}`}
                  </span>
                </span>
              ) : (
                <span className="text-neutral-300">{formatDateBr(item.data)}</span>
              )}

              {isEntradaFutura && item.dataPrevista && !hasEnterpriseDates && (
                <>
                  <span>·</span>
                  <span className="text-purple-300 font-medium">
                    Previsão Recebimento: {formatDateBr(item.dataPrevista)}
                  </span>
                </>
              )}

              {isSaidaFutura && item.dataPrevista && !hasEnterpriseDates && (
                <>
                  <span>·</span>
                  <span className="text-amber-300 font-medium">
                    Vencimento: {formatDateBr(item.dataPrevista)}
                  </span>
                </>
              )}

              {item.cliente && (
                <>
                  <span>·</span>
                  <span className="text-neutral-300">Cliente: {item.cliente}</span>
                </>
              )}

              {item.categoria && (
                <>
                  <span>·</span>
                  <span>{item.categoria}</span>
                </>
              )}

              {/* Valores detalhados da Empresa: Valor Serviço + Acréscimos */}
              {hasServiceValues && (
                <>
                  <span>·</span>
                  <span className="text-neutral-300 flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-blue-400" />
                    <span>Serviço: {formatBRL(item.valorServico || item.valor)}</span>
                    {item.acrescimos && item.acrescimos > 0 && (
                      <span className="text-amber-300">(+ Acréscimos: {formatBRL(item.acrescimos)})</span>
                    )}
                  </span>
                </>
              )}

              {isServico && totalCustos > 0 && (
                <>
                  <span>·</span>
                  <span className="text-emerald-400 font-medium">
                    Lucro Líq: {formatBRL(lucroLiquido)}
                  </span>
                </>
              )}

              {isServico && (item.tempoEstimadoBase || (item.itensAdicionais && item.itensAdicionais.some(x => x.tempoEstimado))) && (
                <>
                  <span>·</span>
                  <span className="text-blue-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>
                      {item.tempoEstimadoBase ? item.tempoEstimadoBase : `${item.itensAdicionais?.filter(x => x.tempoEstimado).length} prazo(s)`}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Valor + Botões de Ação (Lápis e Lixeira) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 mt-3 sm:mt-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
          {/* Valor Financeiro */}
          <div className="text-left sm:text-right mr-1">
            <span
              className={`text-base sm:text-lg font-bold font-mono tracking-tight ${
                isEntradaFutura
                  ? 'text-purple-300'
                  : isSaidaFutura
                  ? 'text-amber-400'
                  : isServico
                  ? item.recebido
                    ? 'text-emerald-400'
                    : 'text-purple-300'
                  : isEntrada
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {isEntrada
                ? '+'
                : isSaida
                ? '-'
                : isEntradaFutura
                ? '⏳ '
                : isSaidaFutura
                ? '📅 -'
                : isServico
                ? item.recebido
                  ? '+'
                  : '⏳ '
                : ''}
              {formatBRL(item.valor)}
            </span>
            {isServico && totalCustos > 0 && (
              <div className="text-[11px] text-neutral-400 font-mono">
                Custos: -{formatBRL(totalCustos)}
              </div>
            )}
          </div>

          {/* Botões de Ação com Sinalzinho de Lápis e Lixeira */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Se for Serviço: Botão direto para Abrir Ordem de Serviço (OS) */}
            {isServico && onOpenServiceDetail && (
              <button
                type="button"
                onClick={() => onOpenServiceDetail(item)}
                title="Abrir Ordem de Serviço (OS) e gerenciar acréscimos"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-blue-300 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 transition-all cursor-pointer shadow-sm"
              >
                <Hammer className="w-3.5 h-3.5 text-blue-400" />
                <span>Abrir OS</span>
              </button>
            )}

            {/* Se for Entrada Futura ou Serviço Pendente: Botão para Dar Baixa / Já Recebi */}
            {(isEntradaFutura || (isServico && !item.recebido)) && onConfirmReceivable && (
              <button
                onClick={() => onConfirmReceivable(item)}
                title={
                  isServico
                    ? 'Confirmar recebimento do serviço (creditar no Saldo da Empresa)'
                    : 'Confirmar recebimento (transformar em Entrada)'
                }
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">
                  {isServico ? 'Receber Serviço' : 'Já Recebi'}
                </span>
              </button>
            )}

            {/* Se for Saída Futura: Botão para Dar Baixa / Já Paguei */}
            {isSaidaFutura && onConfirmPayable && (
              <button
                onClick={() => onConfirmPayable(item)}
                title="Confirmar pagamento (transformar em Saída)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition-all cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Já Paguei</span>
              </button>
            )}

            {/* Sinalzinho de Lápis para Editar */}
            <button
              onClick={() => onEdit(item)}
              title="Editar este lançamento (Lápis)"
              className="p-2 rounded-xl text-neutral-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-all cursor-pointer group"
            >
              <Pencil className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            </button>

            {/* Sinalzinho de Lixeira para Dispensar */}
            <button
              onClick={() => onDelete(item.id)}
              title="Dispensar / Excluir lançamento (Lixeira)"
              className="p-2 rounded-xl text-neutral-300 hover:text-rose-200 bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 transition-all cursor-pointer group"
            >
              <Trash2 className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
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
