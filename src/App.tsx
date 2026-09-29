import React, { useState, useEffect, useMemo } from 'react';
import { TransactionItem, FinanceMode, SummaryStats } from './types';
import {
  loadActiveMode,
  saveActiveMode,
  loadTransactions,
  saveTransactions,
  SAMPLE_CASA_ITEMS,
  SAMPLE_EMPRESA_ITEMS,
} from './utils/storage';
import {
  getTodayDateString,
  getDaysDifference,
  formatDateBr,
} from './utils/formatters';
import { parseNaturalLanguageInput } from './utils/commandParser';
import { HeaderSmartBox } from './components/HeaderSmartBox';
import { TransactionCard } from './components/TransactionCard';
import { EditTransactionModal } from './components/EditTransactionModal';
import { ServiceDetailModal } from './components/ServiceDetailModal';
import { MetricDetailModal, MetricType } from './components/MetricDetailModal';
import { DueAlertsModal } from './components/DueAlertsModal';
import { Search, ArrowUpDown, Zap } from 'lucide-react';

export default function App() {
  const [activeMode, setActiveMode] = useState<FinanceMode>(loadActiveMode);
  const [transactions, setTransactions] = useState<TransactionItem[]>(() =>
    loadTransactions(loadActiveMode())
  );
  const [editingItem, setEditingItem] = useState<TransactionItem | null>(null);
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<TransactionItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isDueAlertsOpen, setIsDueAlertsOpen] = useState(false);
  const [activeDetailMetric, setActiveDetailMetric] = useState<MetricType | null>(null);
  const [filterType, setFilterType] = useState<
    'todos' | 'entrada' | 'entrada_futura' | 'saida_futura' | 'saida' | 'servico'
  >('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [lastFeedback, setLastFeedback] = useState<{
    message: string;
    undo?: () => void;
    onAttachReceipt?: () => void;
    onOpenServiceDetail?: () => void;
  } | null>(null);

  const todayStr = getTodayDateString();

  // Salvar transações no localStorage sempre que houver alteração
  useEffect(() => {
    saveTransactions(activeMode, transactions);
  }, [transactions, activeMode]);

  // Vencimentos e prazos pendentes (vence hoje, vencidos ou vence amanhã - 1 dia antes)
  const dueAlerts = useMemo(() => {
    return transactions.filter((t) => {
      if (t.recebido) return false;
      if (t.tipo !== 'entrada_futura' && t.tipo !== 'saida_futura' && t.tipo !== 'servico') {
        return false;
      }
      const targetDate = t.dataPrevista || t.dataFim || t.data;
      const diff = getDaysDifference(targetDate, todayStr);
      // Vence hoje ou vencido (diff <= 0) ou vence amanhã (diff === 1)
      return diff <= 1;
    });
  }, [transactions, todayStr]);

  // Notificar automaticamente na abertura do app (1 dia antes e no dia do vencimento)
  useEffect(() => {
    try {
      if (dueAlerts.length > 0) {
        const sessionKey = `fluxo_due_alerts_auto_shown_${todayStr}_${activeMode}`;
        const alreadyShown = sessionStorage.getItem(sessionKey);
        if (!alreadyShown) {
          setIsDueAlertsOpen(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    } catch (err) {
      console.warn('SessionStorage unavailable', err);
    }
  }, [dueAlerts.length, todayStr, activeMode]);

  // Alternar entre Finanças Casa e Modo Empresa com dados 100% isolados
  const handleToggleMode = (newMode: FinanceMode) => {
    if (newMode === activeMode) return;

    saveTransactions(activeMode, transactions);
    saveActiveMode(newMode);
    setActiveMode(newMode);

    const loaded = loadTransactions(newMode);
    setTransactions(loaded);

    setLastFeedback({
      message:
        newMode === 'empresa'
          ? '✓ Modo Empresa ativado (Finanças e contratos isolados).'
          : '✓ Finanças Casa ativado (Finanças pessoais isoladas).',
    });
  };

  // Carregar exemplos se o usuário clicar no botão Exemplos
  const handleResetDemo = () => {
    const samples = activeMode === 'empresa' ? SAMPLE_EMPRESA_ITEMS : SAMPLE_CASA_ITEMS;
    setTransactions(samples);
    saveTransactions(activeMode, samples);
    setLastFeedback({
      message: `Dados de exemplo carregados para o perfil ${
        activeMode === 'empresa' ? 'Empresa' : 'Casa'
      }.`,
    });
  };

  // Adicionar transações (suporta múltiplos itens de uma única frase inteligente)
  const handleAddTransactions = (
    items: Array<Omit<TransactionItem, 'id' | 'createdAt'>>,
    feedbackMessage?: string
  ) => {
    const newItems: TransactionItem[] = items.map((item, index) => ({
      ...item,
      id: `trx-${Date.now()}-${index}`,
      createdAt: Date.now() + index,
    }));

    const previous = [...transactions];
    setTransactions((prev) => [...newItems, ...prev]);

    const serviceItem = newItems.find((t) => t.tipo === 'servico');
    const targetItem =
      serviceItem || newItems.find((t) => t.tipo === 'entrada_futura') || newItems[0];
    const isClientMaterialOrFuture =
      targetItem &&
      (targetItem.tipo === 'entrada_futura' ||
        targetItem.categoria?.toLowerCase().includes('material') ||
        targetItem.categoria?.toLowerCase().includes('peça') ||
        activeMode === 'empresa');

    setLastFeedback({
      message:
        feedbackMessage ||
        `✓ ${newItems.length} lançamento(s) registrado(s) no histórico.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Lançamento(s) desfeito(s) com sucesso.' });
      },
      onAttachReceipt:
        isClientMaterialOrFuture && targetItem
          ? () => {
              setEditingItem(targetItem);
            }
          : undefined,
      onOpenServiceDetail:
        serviceItem
          ? () => {
              setSelectedServiceForDetail(serviceItem);
            }
          : undefined,
    });

    if (filterType !== 'todos') {
      setFilterType('todos');
    }
  };

  // Salvar novo lançamento criado manualmente
  const handleCreateNew = (newItem: TransactionItem) => {
    const previous = [...transactions];
    setTransactions((prev) => [newItem, ...prev]);
    setIsCreatingNew(false);
    setLastFeedback({
      message: `✓ Lançamento "${newItem.descricao}" registrado com sucesso.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Lançamento desfeito com sucesso.' });
      },
    });
  };

  // Confirmar recebimento de uma Entrada Futura ou Serviço (converter para recebido e lançar em caixa)
  const handleConfirmReceivable = (item: TransactionItem) => {
    const previous = [...transactions];
    const isService = item.tipo === 'servico';
    const updated: TransactionItem = {
      ...item,
      recebido: true,
      tipo: isService ? 'servico' : 'entrada',
      descricao: isService
        ? item.descricao
        : item.descricao.replace(/Entrada Futura:?\s*/i, 'Recebido: '),
      data: getTodayDateString(),
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === item.id ? updated : t))
    );

    setLastFeedback({
      message: isService
        ? `✓ Serviço recebido! R$ ${item.valor.toFixed(2)} adicionado ao Saldo da Empresa.`
        : `✓ Recebimento confirmado! Lançado como Entrada de R$ ${item.valor.toFixed(2)}.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Ação desfeita.' });
      },
    });
  };

  // Confirmar pagamento de uma Saída Futura / A Pagar (converter para Saída imediata)
  const handleConfirmPayable = (item: TransactionItem) => {
    const previous = [...transactions];
    const updated: TransactionItem = {
      ...item,
      tipo: 'saida',
      descricao: item.descricao.replace(/(?:A\s+Pagar|Saída\s+Futura):?\s*/i, 'Pago: '),
      data: getTodayDateString(),
      recebido: true,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === item.id ? updated : t))
    );

    setLastFeedback({
      message: `✓ Pagamento confirmado! Lançado como Saída de R$ ${item.valor.toFixed(2)}.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Ação desfeita.' });
      },
    });
  };

  // Prorrogar prazo de recebimento ou pagamento (solicitar / dar mais prazo)
  const handleExtendDeadline = (item: TransactionItem, newDate: string, reason: string) => {
    const previous = [...transactions];
    const updated: TransactionItem = {
      ...item,
      dataPrevista: newDate,
      dataFim: newDate,
    };

    setTransactions((prev) => prev.map((t) => (t.id === item.id ? updated : t)));

    setLastFeedback({
      message: `✓ Prazo atualizado para ${formatDateBr(newDate)} (${reason}).`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Prorrogação de prazo desfeita.' });
      },
    });
  };

  // Editar transação
  const handleSaveEdit = (updated: TransactionItem) => {
    const previous = [...transactions];
    setTransactions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setEditingItem(null);
    setLastFeedback({
      message: `✓ Registro "${updated.descricao}" atualizado com sucesso.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Edição desfeita.' });
      },
    });
  };

  // Excluir / Dispensar transação
  const handleDeleteTransaction = (id: string) => {
    const itemToDelete = transactions.find((t) => t.id === id);
    const previous = [...transactions];
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    setLastFeedback({
      message: `✓ Registro "${itemToDelete?.descricao || ''}" dispensado.`,
      undo: () => {
        setTransactions(previous);
        setLastFeedback({ message: 'Registro restaurado com sucesso.' });
      },
    });
  };

  // Estatísticas e Balanço Geral com Parâmetros de Empresa
  const stats: SummaryStats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let entradasFuturas = 0;
    let saidasFuturas = 0;
    let servicosBruto = 0;
    let servicosCustos = 0;
    let qtdServicos = 0;
    let totalValorServicos = 0;
    let totalAcrescimos = 0;

    transactions.forEach((t) => {
      if (t.valorServico) {
        totalValorServicos += t.valorServico;
      } else if (t.tipo === 'servico') {
        totalValorServicos += t.valor;
      }

      if (t.acrescimos) {
        totalAcrescimos += t.acrescimos;
      }

      if (t.tipo === 'entrada') {
        entradas += t.valor;
      } else if (t.tipo === 'saida') {
        saidas += t.valor;
      } else if (t.tipo === 'entrada_futura') {
        entradasFuturas += t.valor;
      } else if (t.tipo === 'saida_futura') {
        saidasFuturas += t.valor;
      } else if (t.tipo === 'servico') {
        servicosBruto += t.valor;
        qtdServicos += 1;
        if (t.custos) {
          servicosCustos +=
            (t.custos.maoDeObra || 0) +
            (t.custos.gasolina || 0) +
            (t.custos.insumos || 0);
        }

        // REGRA DE CAIXA:
        // Se o serviço já foi recebido/pago, entra no caixa (saldo da empresa)
        // Se ainda não foi recebido (ex: peguei um serviço), é A RECEBER e NÃO infla o saldo da empresa!
        if (t.recebido) {
          entradas += t.valor;
        } else {
          entradasFuturas += t.valor;
        }
      }
    });

    const lucroServicos = servicosBruto - servicosCustos;
    // O saldo em caixa é estritamente o que foi recebido menos as saídas reais
    const saldoTotal = entradas - saidas;

    return {
      saldoTotal,
      totalEntradas: entradas,
      totalSaidas: saidas,
      totalServicos: qtdServicos,
      lucroServicos,
      totalEntradasFuturas: entradasFuturas,
      totalSaidasFuturas: saidasFuturas,
      totalValorServicos,
      totalAcrescimos,
      quantidadeItens: transactions.length,
    };
  }, [transactions]);

  // Filtragem e busca da lista de histórico
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((item) => {
        if (filterType !== 'todos' && item.tipo !== filterType) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchDesc = item.descricao.toLowerCase().includes(q);
          const matchVal = item.valor.toString().includes(q);
          const matchCat = item.categoria?.toLowerCase().includes(q);
          const matchCli = item.cliente?.toLowerCase().includes(q);
          return matchDesc || matchVal || matchCat || matchCli;
        }
        return true;
      })
      .sort((a, b) => {
        const dateDiff = a.data.localeCompare(b.data);
        if (dateDiff !== 0) {
          return sortOrder === 'desc' ? -dateDiff : dateDiff;
        }
        return sortOrder === 'desc' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
      });
  }, [transactions, filterType, searchQuery, sortOrder]);

  const isEmpresa = activeMode === 'empresa';

  // Objeto em branco para criação de novo lançamento empresarial
  const newBlankItem: TransactionItem = {
    id: `trx-${Date.now()}`,
    tipo: isEmpresa ? 'servico' : 'entrada',
    descricao: '',
    valor: 0,
    valorServico: 0,
    acrescimos: 0,
    data: getTodayDateString(),
    dataInicio: getTodayDateString(),
    dataFim: getTodayDateString(),
    comprovantes: [],
    createdAt: Date.now(),
  };

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col font-sans transition-colors duration-300 ${
        isEmpresa ? 'bg-[#0B0D14] text-[#E2E8F0]' : 'bg-[#090D0B] text-[#E2E8F0]'
      }`}
    >
      {/* 1. TOPO: Caixa de Entrada Inteligente + Botão de Notificação (Sino) + Tela Cheia + Cards Clicáveis */}
      <HeaderSmartBox
        activeMode={activeMode}
        onToggleMode={handleToggleMode}
        stats={stats}
        dueAlertsCount={dueAlerts.length}
        onOpenDueAlerts={() => setIsDueAlertsOpen(true)}
        onAddTransactions={handleAddTransactions}
        lastFeedback={lastFeedback}
        onClearFeedback={() => setLastFeedback(null)}
        onResetDemo={handleResetDemo}
        onSelectMetricDetail={(metric) => setActiveDetailMetric(metric)}
        onOpenNewTransaction={() => setIsCreatingNew(true)}
      />

      {/* 2. CORPO PRINCIPAL: Histórico Cronológico */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-8 py-4 sm:py-5 pb-36 select-text min-w-0">
        {/* Barra de Filtro, Busca e Ordenação */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-4 w-full max-w-full min-w-0">
          {/* Filtros por Tipo de Lançamento */}
          <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar min-w-0">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterType === 'todos'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos ({transactions.length})
            </button>

            <button
              onClick={() => setFilterType('entrada')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterType === 'entrada'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <span>+ Entradas</span>
            </button>

            <button
              onClick={() => setFilterType('entrada_futura')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterType === 'entrada_futura'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-neutral-400 hover:text-purple-300'
              }`}
            >
              <span>⏳ A Receber</span>
            </button>

            <button
              onClick={() => setFilterType('saida_futura')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterType === 'saida_futura'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span>📅 A Pagar</span>
            </button>

            <button
              onClick={() => setFilterType('saida')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterType === 'saida'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'text-neutral-400 hover:text-rose-300'
              }`}
            >
              <span>- Saídas</span>
            </button>

            <button
              onClick={() => setFilterType('servico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0 ${
                filterType === 'servico'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span>⚡ Serviços</span>
            </button>
          </div>

          {/* Campo de Busca e Inverter Ordem */}
          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <div className="relative flex-1 sm:w-64 min-w-0">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no histórico..."
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              title={`Ordenar por data (${sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigos primeiro'})`}
              className="p-2 rounded-xl bg-black/40 border border-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* BANNER INFORMATIVO NA ABA EMPRESA OU SERVIÇOS */}
        {(filterType === 'servico' || isEmpresa) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <span className="truncate">
                <strong>Ordens de Serviço (OS):</strong> Clique em qualquer serviço para abrir a OS e adicionar <strong>Acréscimos de Serviço</strong> (ex: "Pintura da sala" com mão de obra e tempo estimado).
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                handleCreateNew({
                  ...newBlankItem,
                  id: `trx-${Date.now()}`,
                  tipo: 'servico',
                  descricao: 'Nova Ordem de Serviço',
                  categoria: 'Serviços',
                  numeroOS: `OS-${String(Date.now()).slice(-4)}`,
                  statusOS: 'em_aberto',
                  valor: 0,
                })
              }
              className="px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 font-semibold border border-blue-500/40 text-xs shrink-0 cursor-pointer transition-all self-start sm:self-auto"
            >
              + Nova Ordem de Serviço (OS)
            </button>
          </div>
        )}

        {/* LISTA DO HISTÓRICO COM SINAL DE LÁPIS (✏️) E LIXEIRA (🗑️) */}
        <div className="flex flex-col gap-2 w-full max-w-full min-w-0">
          {filteredTransactions.map((item) => (
            <TransactionCard
              key={item.id}
              item={item}
              mode={activeMode}
              onEdit={(itemToEdit) => {
                if (itemToEdit.tipo === 'servico') {
                  setSelectedServiceForDetail(itemToEdit);
                } else {
                  setEditingItem(itemToEdit);
                }
              }}
              onDelete={handleDeleteTransaction}
              onConfirmReceivable={handleConfirmReceivable}
              onConfirmPayable={handleConfirmPayable}
              onOpenServiceDetail={(srv) => setSelectedServiceForDetail(srv)}
            />
          ))}
        </div>
      </main>

      {/* MODAL DE NOTIFICAÇÃO E DECISÃO DE PRAZOS (1 DIA ANTES E NO DIA) */}
      {isDueAlertsOpen && (
        <DueAlertsModal
          items={transactions}
          mode={activeMode}
          onClose={() => setIsDueAlertsOpen(false)}
          onConfirmReceivable={(item) => {
            handleConfirmReceivable(item);
          }}
          onConfirmPayable={(item) => {
            handleConfirmPayable(item);
          }}
          onExtendDeadline={(item, newDate, reason) => {
            handleExtendDeadline(item, newDate, reason);
          }}
        />
      )}

      {/* MODAL DE EDIÇÃO AO CLICAR NO SINALZINHO DE LÁPIS */}
      {editingItem && (
        <EditTransactionModal
          item={editingItem}
          mode={activeMode}
          isNew={false}
          onSave={handleSaveEdit}
          onDelete={handleDeleteTransaction}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* MODAL DE CRIAÇÃO MANUAL DE NOVO LANÇAMENTO (EMPRESA OU CASA) */}
      {isCreatingNew && (
        <EditTransactionModal
          item={newBlankItem}
          mode={activeMode}
          isNew={true}
          onSave={handleCreateNew}
          onDelete={() => setIsCreatingNew(false)}
          onClose={() => setIsCreatingNew(false)}
        />
      )}

      {/* MODAL DE DETALHAMENTO DE SERVIÇO (EXTRAS, ACRÉSCIMOS E CUSTOS REEMBOLSÁVEIS) */}
      {selectedServiceForDetail && (
        <ServiceDetailModal
          isOpen={true}
          onClose={() => setSelectedServiceForDetail(null)}
          service={selectedServiceForDetail}
          mode={activeMode}
          onSave={(updated) => {
            handleSaveEdit(updated);
            setSelectedServiceForDetail(null);
          }}
          onConfirmReceived={(updated) => {
            handleConfirmReceivable(updated);
            setSelectedServiceForDetail(null);
          }}
          onDelete={(id) => {
            handleDeleteTransaction(id);
            setSelectedServiceForDetail(null);
          }}
        />
      )}

      {/* MODAL DE DETALHAMENTO DAS MÉTRICAS (AO CLICAR EM QUALQUER UM DOS 5 CARDS) */}
      {activeDetailMetric && (
        <MetricDetailModal
          metricType={activeDetailMetric}
          transactions={transactions}
          mode={activeMode}
          onClose={() => setActiveDetailMetric(null)}
          onEdit={(item) => {
            setActiveDetailMetric(null);
            setEditingItem(item);
          }}
          onDelete={handleDeleteTransaction}
          onConfirmReceivable={handleConfirmReceivable}
          onConfirmPayable={handleConfirmPayable}
          onFilterInHistory={(type) => {
            setFilterType(type);
          }}
          onQuickAddExample={(text) => {
            const res = parseNaturalLanguageInput(text);
            if (res.recognized && res.items.length > 0) {
              handleAddTransactions(res.items, res.feedback);
            }
          }}
        />
      )}
    </div>
  );
}
