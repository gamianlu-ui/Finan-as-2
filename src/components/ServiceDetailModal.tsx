import React, { useState } from 'react';
import {
  TransactionItem,
  ServiceExtraItem,
  ServiceExpenseItem,
  AttachmentItem,
  FinanceMode,
} from '../types';
import { formatBRL, formatDateBr, getTodayDateString } from '../utils/formatters';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import {
  X,
  Zap,
  Calendar,
  User,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle,
  Clock,
  Package,
  Wallet,
  Building2,
  Share2,
  DollarSign,
  AlertCircle,
  FileText,
  Hammer,
  Timer,
  CheckCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  service: TransactionItem;
  mode: FinanceMode;
  onSave: (updated: TransactionItem) => void;
  onConfirmReceived?: (service: TransactionItem) => void;
  onDelete?: (id: string) => void;
}

export const ServiceDetailModal: React.FC<Props> = ({
  isOpen,
  onClose,
  service,
  mode,
  onSave,
  onConfirmReceived,
  onDelete,
}) => {
  if (!isOpen) return null;

  // Identificador da Ordem de Serviço
  const osNumber = service.numeroOS || `OS-${String(service.createdAt).slice(-4)}`;

  // Estados principais da Ordem de Serviço (OS)
  const [descricao, setDescricao] = useState(service.descricao);
  const [cliente, setCliente] = useState(service.cliente || '');
  const [dataInicio, setDataInicio] = useState(service.dataInicio || service.data);
  const [dataFim, setDataFim] = useState(service.dataFim || service.dataPrevista || service.data);
  const [tempoEstimadoBase, setTempoEstimadoBase] = useState(service.tempoEstimadoBase || '');
  const [statusOS, setStatusOS] = useState<'em_aberto' | 'em_andamento' | 'aguardando_cliente' | 'concluido' | 'cancelado'>(
    service.statusOS || (service.recebido ? 'concluido' : 'em_andamento')
  );
  const [valorBase, setValorBase] = useState<number>(
    service.valorServico !== undefined ? service.valorServico : service.valor
  );
  const [recebido, setRecebido] = useState<boolean>(!!service.recebido);

  // Listas detalhadas de acréscimos de serviço e despesas da OS
  const [itensAdicionais, setItensAdicionais] = useState<ServiceExtraItem[]>(
    service.itensAdicionais || []
  );
  const [despesasTrabalho, setDespesasTrabalho] = useState<ServiceExpenseItem[]>(
    service.despesasTrabalho || []
  );
  const [comprovantes, setComprovantes] = useState<AttachmentItem[]>(
    service.comprovantes || []
  );

  // Formulário do Acréscimo de Serviço (ex: "Pintura da sala", valor mão de obra e tempo estimado)
  const [extraDesc, setExtraDesc] = useState('');
  const [extraValor, setExtraValor] = useState('');
  const [extraTempo, setExtraTempo] = useState('');
  const [extraStatus, setExtraStatus] = useState<'aprovado' | 'em_andamento' | 'concluido'>('aprovado');
  const [extraObs, setExtraObs] = useState('');

  // Formulário de Custo / Material
  const [costDesc, setCostDesc] = useState('');
  const [costValor, setCostValor] = useState('');
  const [costCategoria, setCostCategoria] = useState<'material' | 'gasolina' | 'mao_de_obra' | 'outros'>('material');
  const [costOrigem, setCostOrigem] = useState<'bolso_pessoal' | 'caixa_empresa'>('bolso_pessoal');
  const [costCobrar, setCostCobrar] = useState<boolean>(true);
  const [costAttachment, setCostAttachment] = useState<AttachmentItem | null>(null);

  // Visualizador de comprovante
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentItem | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);

  // Cálculos financeiros e de tempo da OS
  const totalMaoDeObraExtras = itensAdicionais.reduce((acc, curr) => acc + curr.valor, 0);
  const totalMaoDeObraGeral = valorBase + totalMaoDeObraExtras;

  // Custos que serão cobrados do cliente (reembolso de materiais)
  const totalCustosCobrados = despesasTrabalho
    .filter((d) => d.cobrarDoCliente)
    .reduce((acc, curr) => acc + curr.valor, 0);

  // Total geral a cobrar na OS
  const totalACobrarOS = totalMaoDeObraGeral + totalCustosCobrados;

  // Despesas totais gastas (custos reais do serviço)
  const totalDespesasGastas = despesasTrabalho.reduce((acc, curr) => acc + curr.valor, 0);
  const totalDespesasBolsoPessoal = despesasTrabalho
    .filter((d) => d.origem === 'bolso_pessoal')
    .reduce((acc, curr) => acc + curr.valor, 0);

  // Lucro líquido real deste trabalho
  const lucroLiquidoReal = totalACobrarOS - totalDespesasGastas;

  // Handler para adicionar acréscimo de serviço à OS
  const handleAddExtra = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(extraValor.replace(',', '.'));
    if (!extraDesc.trim() || isNaN(val) || val <= 0) return;

    const newItem: ServiceExtraItem = {
      id: `extra-${Date.now()}`,
      descricao: extraDesc.trim(),
      valor: val,
      tempoEstimado: extraTempo.trim() || undefined,
      status: extraStatus,
      observacoes: extraObs.trim() || undefined,
      data: getTodayDateString(),
      createdAt: Date.now(),
    };

    setItensAdicionais([...itensAdicionais, newItem]);
    setExtraDesc('');
    setExtraValor('');
    setExtraTempo('');
    setExtraObs('');
  };

  const handleRemoveExtra = (id: string) => {
    setItensAdicionais(itensAdicionais.filter((i) => i.id !== id));
  };

  // Handler para alternar status do acréscimo de serviço
  const handleToggleExtraStatus = (id: string) => {
    setItensAdicionais(
      itensAdicionais.map((it) => {
        if (it.id !== id) return it;
        const nextStatus: Record<'aprovado' | 'em_andamento' | 'concluido', 'aprovado' | 'em_andamento' | 'concluido'> = {
          aprovado: 'em_andamento',
          em_andamento: 'concluido',
          concluido: 'aprovado',
        };
        return { ...it, status: nextStatus[it.status || 'aprovado'] };
      })
    );
  };

  // Handler para adicionar custos/despesas
  const handleAddCost = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(costValor.replace(',', '.'));
    if (!costDesc.trim() || isNaN(val) || val <= 0) return;

    const newCost: ServiceExpenseItem = {
      id: `cost-${Date.now()}`,
      descricao: costDesc.trim(),
      valor: val,
      categoria: costCategoria,
      origem: costOrigem,
      cobrarDoCliente: costCobrar,
      comprovante: costAttachment || undefined,
      createdAt: Date.now(),
    };

    setDespesasTrabalho([...despesasTrabalho, newCost]);
    setCostDesc('');
    setCostValor('');
    setCostAttachment(null);
  };

  const handleRemoveCost = (id: string) => {
    setDespesasTrabalho(despesasTrabalho.filter((c) => c.id !== id));
  };

  // Upload de comprovante
  const handleCostFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite máximo de 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const sizeKb = Math.round(file.size / 1024);
      const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

      setCostAttachment({
        id: `att-${Date.now()}`,
        nome: file.name,
        dataUrl: base64,
        tipo: file.type || 'application/octet-stream',
        tamanho: sizeStr,
        criadoEm: Date.now(),
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Salvar a OS atualizada
  const handleSaveAll = () => {
    const mobra = despesasTrabalho
      .filter((d) => d.categoria === 'mao_de_obra')
      .reduce((a, b) => a + b.valor, 0);
    const gas = despesasTrabalho
      .filter((d) => d.categoria === 'gasolina')
      .reduce((a, b) => a + b.valor, 0);
    const ins = despesasTrabalho
      .filter((d) => d.categoria === 'material' || d.categoria === 'outros')
      .reduce((a, b) => a + b.valor, 0);

    const updated: TransactionItem = {
      ...service,
      numeroOS: osNumber,
      statusOS,
      tempoEstimadoBase: tempoEstimadoBase.trim() || undefined,
      descricao: descricao.trim() || 'Serviço sob demanda',
      cliente: cliente.trim() || undefined,
      valor: totalACobrarOS,
      valorServico: valorBase,
      acrescimos: totalMaoDeObraExtras,
      itensAdicionais,
      despesasTrabalho,
      dataInicio,
      dataFim,
      dataPrevista: dataFim,
      recebido,
      comprovantes,
      custos: {
        maoDeObra: mobra,
        gasolina: gas,
        insumos: ins,
      },
    };

    onSave(updated);
    onClose();
  };

  // Copiar resumo formatado como Ordem de Serviço (OS) para WhatsApp
  const handleShareWhatsApp = () => {
    const statusLabels = {
      em_aberto: 'Em Aberto',
      em_andamento: 'Em Andamento',
      aguardando_cliente: 'Aguardando Cliente',
      concluido: 'Concluído',
      cancelado: 'Cancelado',
    };

    const lines = [
      `🛠️ *ORDEM DE SERVIÇO - ${osNumber}*`,
      `*Trabalho:* ${descricao}`,
      cliente ? `*Cliente:* ${cliente}` : null,
      `*Status da OS:* ${statusLabels[statusOS]}`,
      `*Período:* ${formatDateBr(dataInicio)} até ${formatDateBr(dataFim)}`,
      tempoEstimadoBase ? `*Tempo Base Estimado:* ${tempoEstimadoBase}` : null,
      `----------------------------------------`,
      `💰 *Mão de Obra Contrato Base:* ${formatBRL(valorBase)}`,
    ];

    if (itensAdicionais.length > 0) {
      lines.push(`\n➕ *Acréscimos de Serviço (Mão de Obra Adicional):*`);
      itensAdicionais.forEach((it) => {
        const tempo = it.tempoEstimado ? ` [⏱️ ${it.tempoEstimado}]` : '';
        const status = it.status === 'concluido' ? ' (Concluído)' : '';
        lines.push(`  • ${it.descricao}: ${formatBRL(it.valor)}${tempo}${status}`);
      });
      lines.push(`*Total Mão de Obra Geral:* ${formatBRL(totalMaoDeObraGeral)}`);
    }

    if (totalCustosCobrados > 0) {
      lines.push(`\n📦 *Materiais & Despesas a Repassar:*`);
      despesasTrabalho
        .filter((d) => d.cobrarDoCliente)
        .forEach((d) => {
          lines.push(`  • ${d.descricao}: ${formatBRL(d.valor)}`);
        });
    }

    lines.push(`----------------------------------------`);
    lines.push(`💵 *VALOR TOTAL DA OS:* ${formatBRL(totalACobrarOS)}`);
    lines.push(`*Financeiro:* ${recebido ? '✓ PAGO / RECEBIDO' : '⏳ PENDENTE A RECEBER'}`);

    const textToCopy = lines.filter(Boolean).join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <div className="bg-[#101422] border border-blue-500/30 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
          {/* HEADER DA ORDEM DE SERVIÇO (OS) */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 flex items-center justify-center shrink-0">
                <Hammer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold">
                    {osNumber}
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">
                    {descricao || 'Ordem de Serviço'}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      recebido
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                    }`}
                  >
                    {recebido ? '✓ Recebido (Caixa)' : '⏳ A Receber'}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
                  <span>Ordem de Serviço (OS) Empresarial</span>
                  {cliente && (
                    <>
                      <span>·</span>
                      <span className="text-neutral-300">Cliente: {cliente}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                title="Copiar OS formatada para WhatsApp"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-neutral-300 hover:text-white transition-all cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {copiedShare ? 'OS Copiada!' : 'Compartilhar OS'}
                </span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* CORPO DO MODAL SCROLLÁVEL */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
            {/* QUADRO DE RESUMO FINANCEIRO E DE MÃO DE OBRA DA OS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/10">
                <span className="text-[11px] font-medium text-neutral-400 block mb-0.5">
                  Mão de Obra Base
                </span>
                <span className="text-base sm:text-lg font-bold text-white">
                  {formatBRL(valorBase)}
                </span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">
                  {tempoEstimadoBase ? `Prazo: ${tempoEstimadoBase}` : 'Contrato inicial'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="text-[11px] font-medium text-blue-300 block mb-0.5">
                  + Acréscimos OS ({itensAdicionais.length})
                </span>
                <span className="text-base sm:text-lg font-bold text-blue-200">
                  +{formatBRL(totalMaoDeObraExtras)}
                </span>
                <span className="text-[10px] text-blue-400/80 block mt-0.5">
                  Mão de obra adicional
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[11px] font-medium text-purple-300 block mb-0.5">
                  Total da OS
                </span>
                <span className="text-base sm:text-lg font-bold text-purple-200">
                  {formatBRL(totalACobrarOS)}
                </span>
                <span className="text-[10px] text-purple-400/80 block mt-0.5">
                  {totalCustosCobrados > 0
                    ? `Inclui ${formatBRL(totalCustosCobrados)} de materiais`
                    : 'Mão de obra total'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[11px] font-medium text-emerald-300 block mb-0.5">
                  Lucro Líquido Real
                </span>
                <span className="text-base sm:text-lg font-bold text-emerald-300">
                  {formatBRL(lucroLiquidoReal)}
                </span>
                <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                  Despesas: -{formatBRL(totalDespesasGastas)}
                </span>
              </div>
            </div>

            {/* AVISO SE HOUVER DESPESA QUE SAIU DO BOLSO PESSOAL */}
            {totalDespesasBolsoPessoal > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-200">
                  <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    <strong>{formatBRL(totalDespesasBolsoPessoal)}</strong> saiu do seu <strong>Bolso Pessoal (Casa)</strong> para materiais desta obra e deve ser reembolsado.
                  </span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold shrink-0">
                  A Reembolsar
                </span>
              </div>
            )}

            {/* DADOS GERAIS DA ORDEM DE SERVIÇO (OS) */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-3">
              <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Dados da Ordem de Serviço (OS)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] text-neutral-400 block mb-1">Título do Trabalho / Obra</label>
                  <input
                    type="text"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Ex: Reforma do banheiro Doralice"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Cliente</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cliente}
                      onChange={(e) => setCliente(e.target.value)}
                      placeholder="Ex: Doralice"
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Status da OS</label>
                  <select
                    value={statusOS}
                    onChange={(e) => setStatusOS(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="em_aberto">📝 Em Aberto</option>
                    <option value="em_andamento">🔨 Em Andamento</option>
                    <option value="aguardando_cliente">⏳ Aguardando Cliente</option>
                    <option value="concluido">✓ Concluído / Entregue</option>
                    <option value="cancelado">✕ Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Mão de Obra Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorBase || ''}
                    onChange={(e) => setValorBase(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Tempo Estimado Base</label>
                  <div className="relative">
                    <Timer className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tempoEstimadoBase}
                      onChange={(e) => setTempoEstimadoBase(e.target.value)}
                      placeholder="Ex: 5 dias, 2 semanas..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Data Início</label>
                  <input
                    type="date"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Data Previsão / Entrega</label>
                  <input
                    type="date"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO PRINCIPAL: ACRÉSCIMO DE SERVIÇO COM MÃO DE OBRA E TEMPO ESTIMADO */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/30 via-black/40 to-black/30 border border-blue-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-blue-400" />
                    <span>Adicionar Acréscimo de Serviço à OS</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Insira serviços extras solicitados pelo cliente (ex: "Pintura da sala") com valor da mão de obra e tempo estimado
                  </p>
                </div>
                <span className="text-xs font-semibold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                  Total Acréscimos: +{formatBRL(totalMaoDeObraExtras)}
                </span>
              </div>

              {/* Formulário de Acréscimo de Serviço */}
              <form onSubmit={handleAddExtra} className="bg-black/50 p-3.5 rounded-xl border border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="text-[11px] text-neutral-400 block mb-1 font-medium">
                      Descrição do Acréscimo
                    </label>
                    <input
                      type="text"
                      value={extraDesc}
                      onChange={(e) => setExtraDesc(e.target.value)}
                      placeholder='Ex: "Pintura da sala", "Instalação de nicho extra"...'
                      className="w-full bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] text-neutral-400 block mb-1 font-medium">
                      Mão de Obra (R$)
                    </label>
                    <input
                      type="text"
                      value={extraValor}
                      onChange={(e) => setExtraValor(e.target.value)}
                      placeholder="Ex: 450,00"
                      className="w-full bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-[11px] text-neutral-400 block mb-1 font-medium flex items-center justify-between">
                      <span>Tempo Estimado</span>
                      <span className="text-[10px] text-blue-400">Atalhos rápidos abaixo</span>
                    </label>
                    <div className="relative">
                      <Clock className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={extraTempo}
                        onChange={(e) => setExtraTempo(e.target.value)}
                        placeholder="Ex: 2 dias, 4 horas..."
                        className="w-full bg-black/70 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Atalhos Rápidos de Tempo Estimado */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-neutral-500 mr-1">Sugestões de tempo:</span>
                  {['2 horas', '4 horas', '1 dia', '2 dias', '3 dias', '1 semana'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setExtraTempo(t)}
                      className={`text-[10px] px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        extraTempo === t
                          ? 'bg-blue-500/25 border-blue-500/50 text-blue-200'
                          : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-2 border-t border-white/5">
                  <div className="sm:col-span-7">
                    <input
                      type="text"
                      value={extraObs}
                      onChange={(e) => setExtraObs(e.target.value)}
                      placeholder="Observações adicionais (opcional)"
                      className="w-full bg-black/70 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <select
                      value={extraStatus}
                      onChange={(e) => setExtraStatus(e.target.value as any)}
                      className="w-full bg-black/70 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="aprovado">👍 Aprovado pelo Cliente</option>
                      <option value="em_andamento">🔨 Em Andamento</option>
                      <option value="concluido">✓ Concluído</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Lista dos Acréscimos de Serviço na OS */}
              {itensAdicionais.length === 0 ? (
                <div className="text-center py-4 bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
                  <Hammer className="w-6 h-6 text-neutral-600 mx-auto mb-1" />
                  <p className="text-xs text-neutral-400 font-medium">
                    Nenhum acréscimo de serviço registrado nesta OS.
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Use o formulário acima para registrar trabalhos extras solicitados pelo cliente com mão de obra e tempo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {itensAdicionais.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/[0.07] border border-white/10 text-xs transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white text-sm">
                            {extra.descricao}
                          </span>

                          {/* Tempo Estimado */}
                          {extra.tempoEstimado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-medium text-[11px]">
                              <Clock className="w-3 h-3 text-blue-400" />
                              <span>Tempo estimado: {extra.tempoEstimado}</span>
                            </span>
                          )}

                          {/* Status do Acréscimo */}
                          <button
                            type="button"
                            onClick={() => handleToggleExtraStatus(extra.id)}
                            title="Clique para alternar status do acréscimo"
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${
                              extra.status === 'concluido'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : extra.status === 'em_andamento'
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            }`}
                          >
                            {extra.status === 'concluido'
                              ? '✓ Concluído'
                              : extra.status === 'em_andamento'
                              ? '🔨 Em Andamento'
                              : '👍 Aprovado'}
                          </button>
                        </div>

                        {extra.observacoes && (
                          <p className="text-[11px] text-neutral-400 mt-1 italic">
                            Nota: {extra.observacoes}
                          </p>
                        )}

                        {extra.data && (
                          <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono">
                            Adicionado à OS em {formatDateBr(extra.data)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-sm text-blue-300 block font-mono">
                            +{formatBRL(extra.valor)}
                          </span>
                          <span className="text-[10px] text-neutral-400">Mão de obra</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveExtra(extra.id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Remover acréscimo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SEÇÃO 2: CUSTOS & MATERIAIS DA OS (Materiais, Gasolina, etc.) */}
            <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-amber-400" />
                    <span>Custos e Materiais da OS</span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Registre compras de material (mesmo que saíram do seu bolso), combustível ou ajudante
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    Total Gastos: -{formatBRL(totalDespesasGastas)}
                  </span>
                </div>
              </div>

              {/* Formulário de Adicionar Custo */}
              <form onSubmit={handleAddCost} className="bg-black/40 p-3.5 rounded-xl border border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <label className="text-[11px] text-neutral-400 block mb-1">
                      Descrição do Material / Gasto
                    </label>
                    <input
                      type="text"
                      value={costDesc}
                      onChange={(e) => setCostDesc(e.target.value)}
                      placeholder="Ex: Rejunte e tubos PVC, Gasolina para buscar piso..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] text-neutral-400 block mb-1">Valor (R$)</label>
                    <input
                      type="text"
                      value={costValor}
                      onChange={(e) => setCostValor(e.target.value)}
                      placeholder="Ex: 85,00"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-semibold"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] text-neutral-400 block mb-1">Categoria</label>
                    <select
                      value={costCategoria}
                      onChange={(e) => setCostCategoria(e.target.value as any)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="material">📦 Material / Peças</option>
                      <option value="gasolina">⛽ Gasolina / Transporte</option>
                      <option value="mao_de_obra">🔨 Mão de Obra / Ajudante</option>
                      <option value="outros">📝 Outros Insumos</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1 border-t border-white/5">
                  {/* Origem do dinheiro */}
                  <div className="sm:col-span-6 flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400 shrink-0">De onde saiu?</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <button
                        type="button"
                        onClick={() => setCostOrigem('bolso_pessoal')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                          costOrigem === 'bolso_pessoal'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Wallet className="w-3 h-3" />
                        <span>Meu Bolso (Casa)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCostOrigem('caixa_empresa')}
                        className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border cursor-pointer flex items-center justify-center gap-1 ${
                          costOrigem === 'caixa_empresa'
                            ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>Caixa Empresa</span>
                      </button>
                    </div>
                  </div>

                  {/* Cobrar do cliente? */}
                  <div className="sm:col-span-4 flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-300">
                      <input
                        type="checkbox"
                        checked={costCobrar}
                        onChange={(e) => setCostCobrar(e.target.checked)}
                        className="rounded border-white/20 text-blue-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span>Cobrar depois do cliente</span>
                    </label>
                  </div>

                  {/* Anexo e Botão de Adicionar */}
                  <div className="sm:col-span-2 flex items-center gap-1.5 justify-end">
                    <label
                      title="Anexar foto ou comprovante da nota"
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCostFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="submit"
                      className="py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Lançar</span>
                    </button>
                  </div>
                </div>

                {costAttachment && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                    <span className="truncate">📎 Anexo anexado: {costAttachment.nome}</span>
                    <button
                      type="button"
                      onClick={() => setCostAttachment(null)}
                      className="text-neutral-400 hover:text-rose-400 cursor-pointer ml-2"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </form>

              {/* Lista de Custos Lançados */}
              {despesasTrabalho.length === 0 ? (
                <p className="text-xs text-neutral-500 text-center py-2 italic">
                  Nenhum custo ou material registrado para esta OS ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {despesasTrabalho.map((cost) => (
                    <div
                      key={cost.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white truncate">
                            {cost.descricao}
                          </span>

                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-neutral-300">
                            {cost.categoria === 'material'
                              ? '📦 Material'
                              : cost.categoria === 'gasolina'
                              ? '⛽ Gasolina'
                              : cost.categoria === 'mao_de_obra'
                              ? '🔨 Mão de Obra'
                              : '📝 Insumo'}
                          </span>

                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              cost.origem === 'bolso_pessoal'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                            }`}
                          >
                            {cost.origem === 'bolso_pessoal'
                              ? '🏠 Saiu do Bolso (Reembolsar)'
                              : '🏢 Caixa Empresa'}
                          </span>

                          {cost.cobrarDoCliente && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                              + Repassar ao Cliente
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {cost.comprovante && (
                          <button
                            type="button"
                            onClick={() => setViewingAttachment(cost.comprovante!)}
                            className="p-1 rounded text-neutral-400 hover:text-emerald-300 cursor-pointer"
                            title="Ver comprovante anexado"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <span className="font-bold text-rose-300">
                          -{formatBRL(cost.valor)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveCost(cost.id)}
                          className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Remover custo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER DA OS */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Excluir definitivamente a ${osNumber} - "${descricao}"?`)) {
                      onDelete(service.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir OS</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              {!recebido && onConfirmReceived && (
                <button
                  type="button"
                  onClick={() => {
                    handleSaveAll();
                    onConfirmReceived({
                      ...service,
                      valor: totalACobrarOS,
                      recebido: true,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Dar Baixa / Receber OS ({formatBRL(totalACobrarOS)})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveAll}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer shadow-lg"
              >
                Salvar OS
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE VISUALIZAÇÃO DE COMPROVANTE */}
      {viewingAttachment && (
        <ReceiptViewerModal
          onClose={() => setViewingAttachment(null)}
          attachment={viewingAttachment}
        />
      )}
    </>
  );
};
