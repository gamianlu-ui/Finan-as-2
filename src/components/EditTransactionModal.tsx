import React, { useState } from 'react';
import { TransactionItem, TransactionType, FinanceMode, AttachmentItem } from '../types';
import { getLastDayOfCurrentMonth, formatDateBr } from '../utils/formatters';
import { parseNaturalDate, ParsedDateResult } from '../utils/dateParser';
import { ReceiptUploader } from './ReceiptUploader';
import { ReceiptViewerModal } from './ReceiptViewerModal';
import {
  X,
  Check,
  Trash2,
  CalendarClock,
  Sparkles,
  CheckCircle2,
  Building2,
  Calendar,
  DollarSign,
  PlusCircle,
} from 'lucide-react';

interface Props {
  item: TransactionItem;
  mode: FinanceMode;
  isNew?: boolean;
  onSave: (updated: TransactionItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const EditTransactionModal: React.FC<Props> = ({
  item,
  mode,
  isNew = false,
  onSave,
  onDelete,
  onClose,
}) => {
  const isEmpresa = mode === 'empresa';

  const [descricao, setDescricao] = useState(item.descricao);
  const [valor, setValor] = useState(item.valor ? item.valor.toString() : '');
  const [tipo, setTipo] = useState<TransactionType>(item.tipo);
  const [data, setData] = useState(item.data);
  const [dataPrevista, setDataPrevista] = useState(item.dataPrevista || getLastDayOfCurrentMonth());
  const [cliente, setCliente] = useState(item.cliente || '');
  const [categoria, setCategoria] = useState(item.categoria || '');

  // Parâmetros da Empresa: Valor do Serviço, Acréscimos, Data Início, Data Fim, Comprovantes
  const [valorServico, setValorServico] = useState(
    item.valorServico ? item.valorServico.toString() : ''
  );
  const [acrescimos, setAcrescimos] = useState(
    item.acrescimos ? item.acrescimos.toString() : ''
  );
  const [dataInicio, setDataInicio] = useState(item.dataInicio || item.data);
  const [dataFim, setDataFim] = useState(item.dataFim || item.dataPrevista || item.data);
  const [comprovantes, setComprovantes] = useState<AttachmentItem[]>(item.comprovantes || []);
  const [viewingAttachment, setViewingAttachment] = useState<AttachmentItem | null>(null);
  const [recebido, setRecebido] = useState<boolean>(
    item.recebido ?? (item.tipo === 'entrada' || item.tipo === 'saida')
  );

  // Estado do ajuste automático de data por linguagem natural
  const [autoDateFeedback, setAutoDateFeedback] = useState<{
    date: string;
    label: string;
    isReceivable: boolean;
    isPayable: boolean;
  } | null>(null);

  // Custos de serviço (mão de obra, gasolina, insumos)
  const [maoDeObra, setMaoDeObra] = useState(item.custos?.maoDeObra?.toString() || '0');
  const [gasolina, setGasolina] = useState(item.custos?.gasolina?.toString() || '0');
  const [insumos, setInsumos] = useState(item.custos?.insumos?.toString() || '0');

  // Ao alterar Valor do Serviço ou Acréscimos, recalcular automaticamente o Valor Total
  const handleValorServicoChange = (vServ: string) => {
    setValorServico(vServ);
    const numServ = parseFloat(vServ.replace(',', '.')) || 0;
    const numAcres = parseFloat(acrescimos.replace(',', '.')) || 0;
    if (numServ > 0 || numAcres > 0) {
      setValor((numServ + numAcres).toString());
    }
  };

  const handleAcrescimosChange = (vAcres: string) => {
    setAcrescimos(vAcres);
    const numServ = parseFloat(valorServico.replace(',', '.')) || 0;
    const numAcres = parseFloat(vAcres.replace(',', '.')) || 0;
    if (numServ > 0 || numAcres > 0) {
      setValor((numServ + numAcres).toString());
    }
  };

  // Ajuste inteligente automático de data ao digitar na descrição
  const handleDescricaoChange = (val: string) => {
    setDescricao(val);

    const parsed: ParsedDateResult = parseNaturalDate(val);
    if (parsed.hasDate && parsed.dateString) {
      if (parsed.isPayableIntent || tipo === 'saida_futura') {
        setDataPrevista(parsed.dateString);
        setDataFim(parsed.dateString);
        if (tipo !== 'saida_futura') {
          setTipo('saida_futura');
        }
      } else if (parsed.isReceivableIntent || tipo === 'entrada_futura') {
        setDataPrevista(parsed.dateString);
        setDataFim(parsed.dateString);
        if (tipo !== 'entrada_futura') {
          setTipo('entrada_futura');
        }
      } else {
        setData(parsed.dateString);
        setDataInicio(parsed.dateString);
      }

      setAutoDateFeedback({
        date: parsed.dateString,
        label: parsed.friendlyLabel || parsed.dateString,
        isReceivable: !!parsed.isReceivableIntent,
        isPayable: !!parsed.isPayableIntent,
      });
    } else {
      if (autoDateFeedback) {
        setAutoDateFeedback(null);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor.replace(',', '.'));
    if (!descricao.trim() || isNaN(numValor) || numValor <= 0) return;

    const numValorServico = parseFloat(valorServico.replace(',', '.')) || undefined;
    const numAcrescimos = parseFloat(acrescimos.replace(',', '.')) || undefined;

    const mobra = parseFloat(maoDeObra.replace(',', '.')) || 0;
    const gas = parseFloat(gasolina.replace(',', '.')) || 0;
    const ins = parseFloat(insumos.replace(',', '.')) || 0;

    const updated: TransactionItem = {
      ...item,
      descricao: descricao.trim(),
      valor: numValor,
      valorServico: isEmpresa ? numValorServico : item.valorServico,
      acrescimos: isEmpresa ? numAcrescimos : item.acrescimos,
      tipo,
      data,
      dataInicio: isEmpresa ? dataInicio : undefined,
      dataFim: isEmpresa ? dataFim : undefined,
      dataPrevista:
        tipo === 'entrada_futura' || tipo === 'saida_futura' ? dataPrevista : undefined,
      comprovantes: comprovantes.length > 0 ? comprovantes : undefined,
      cliente: cliente.trim() || undefined,
      categoria: categoria.trim() || undefined,
      recebido: tipo === 'entrada' || tipo === 'saida' ? true : recebido,
      custos:
        tipo === 'servico' && (mobra > 0 || gas > 0 || ins > 0)
          ? { maoDeObra: mobra, gasolina: gas, insumos: ins }
          : undefined,
    };

    onSave(updated);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
        <div className="w-full max-w-xl bg-[#141419] border border-white/20 rounded-2xl p-4 sm:p-6 shadow-2xl my-auto max-h-[95vh] overflow-y-auto">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3.5">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isEmpresa ? 'bg-blue-400' : 'bg-emerald-400'
                }`}
              />
              <h3 className="text-sm sm:text-base font-semibold text-white flex items-center gap-1.5">
                {isEmpresa && <Building2 className="w-4 h-4 text-blue-400" />}
                <span>
                  {isNew
                    ? isEmpresa
                      ? 'Novo Lançamento Empresarial (Contrato / Serviço)'
                      : 'Novo Registro Financeiro'
                    : isEmpresa
                    ? 'Editar Registro da Empresa'
                    : 'Editar Registro Pessoal (Casa)'}
                </span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs sm:text-sm">
            {/* Tipo de Registro */}
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Tipo de Lançamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTipo('servico')}
                  className={`py-1.5 px-2 rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                    tipo === 'servico'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <span>⚡ Serviço</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('entrada')}
                  className={`py-1.5 px-2 rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                    tipo === 'entrada'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <span>+ Entrada</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('entrada_futura')}
                  className={`py-1.5 px-2 rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                    tipo === 'entrada_futura'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <span>⏳ A Receber</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('saida')}
                  className={`py-1.5 px-2 rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                    tipo === 'saida'
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <span>- Saída</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTipo('saida_futura')}
                  className={`py-1.5 px-2 rounded-xl font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                    tipo === 'saida_futura'
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-black/40 border-white/10 text-neutral-400 hover:bg-white/5'
                  }`}
                >
                  <span>📅 A Pagar</span>
                </button>
              </div>
            </div>

            {/* STATUS FINANCEIRO: JÁ RECEBIDO (CAIXA) VS A RECEBER (PENDENTE) */}
            {(tipo === 'servico' || tipo === 'entrada_futura') && (
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-white block">Status Financeiro (Caixa)</span>
                  <span className="text-[11px] text-neutral-400 block">
                    {recebido
                      ? '✓ Já recebido pelo cliente (soma no Saldo da Empresa)'
                      : '⏳ A Receber (pendente - ainda NÃO afeta o saldo atual)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRecebido(!recebido)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shrink-0 ${
                    recebido
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  }`}
                >
                  {recebido ? '✓ Já Recebido' : '⏳ A Receber'}
                </button>
              </div>
            )}

            {/* Descrição com Ajuste Inteligente de Data */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-neutral-400 font-medium">Descrição detalhada</label>
                <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Reconhecimento ativo
                </span>
              </div>

              <input
                type="text"
                value={descricao}
                onChange={(e) => handleDescricaoChange(e.target.value)}
                placeholder={
                  isEmpresa
                    ? 'Ex: "Contrato reforma elétrica comercial", "Instalação ar condicionado"...'
                    : 'Ex: "Almoço restaurante", "conta de luz a pagar"...'
                }
                className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-2 text-white placeholder-neutral-500 focus:outline-none text-xs sm:text-sm"
                autoFocus
              />

              {/* Feedback visual de data inteligente */}
              {autoDateFeedback && (
                <div className="mt-1.5 flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>
                    Data ajustada para <strong>{autoDateFeedback.label}</strong> (
                    {formatDateBr(autoDateFeedback.date)}
                    {autoDateFeedback.isReceivable && ' · A Receber'}
                    {autoDateFeedback.isPayable && ' · A Pagar'})
                  </span>
                </div>
              )}
            </div>

            {/* SEÇÃO ESPECÍFICA DA EMPRESA: VALOR DO SERVIÇO + ACRÉSCIMOS */}
            {isEmpresa && (
              <div className="p-3 bg-blue-950/20 border border-blue-500/30 rounded-xl flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-blue-300 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 uppercase">
                    <DollarSign className="w-3.5 h-3.5" />
                    Parâmetros do Contrato / Serviço (Empresa)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1 font-medium">
                      Valor do Serviço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valorServico}
                      onChange={(e) => handleValorServicoChange(e.target.value)}
                      placeholder="Ex: 2500.00"
                      className="w-full bg-black/60 border border-white/15 focus:border-blue-500 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1 font-medium">
                      Acréscimos (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={acrescimos}
                      onChange={(e) => handleAcrescimosChange(e.target.value)}
                      placeholder="Ex: 350.00"
                      className="w-full bg-black/60 border border-white/15 focus:border-blue-500 rounded-xl px-3 py-1.5 text-amber-300 font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] text-emerald-400 mb-1 font-semibold">
                      Valor Total Final (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-emerald-950/30 border border-emerald-500/40 rounded-xl px-3 py-1.5 text-emerald-300 font-mono font-bold text-xs focus:outline-none"
                    />
                  </div>
                </div>

                {/* DATAS DA EMPRESA: DATA DE INÍCIO E DATA DE FIM */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10">
                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1 font-medium flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-blue-400" />
                      Data de Início
                    </label>
                    <input
                      type="date"
                      value={dataInicio}
                      onChange={(e) => setDataInicio(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 focus:border-blue-500 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-neutral-300 mb-1 font-medium flex items-center gap-1">
                      <CalendarClock className="w-3 h-3 text-blue-400" />
                      Data de Fim / Conclusão
                    </label>
                    <input
                      type="date"
                      value={dataFim}
                      onChange={(e) => setDataFim(e.target.value)}
                      className="w-full bg-black/60 border border-white/15 focus:border-blue-500 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SE NÃO FOR EMPRESA: VALOR SIMPLES E DATA DO REGISTRO */}
            {!isEmpresa && (
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-neutral-400 mb-1 font-medium">Data do Registro</label>
                  <input
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* CLIENTE E CATEGORIA */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">
                  {isEmpresa ? 'Cliente / Contratante' : 'Cliente / Pessoa'}
                </label>
                <input
                  type="text"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  placeholder="Nome do cliente (opcional)"
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1 font-medium">Categoria</label>
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  placeholder="Ex: Contratos, Serviços, Fixos..."
                  className="w-full bg-black/60 border border-white/15 focus:border-white/40 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Se for Entrada Futura: Data Prevista */}
            {tipo === 'entrada_futura' && !isEmpresa && (
              <div className="p-2.5 sm:p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-purple-300 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 uppercase">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Previsão de Recebimento
                  </span>
                  <span className="text-[11px] text-purple-400 font-normal">
                    {formatDateBr(dataPrevista)}
                  </span>
                </div>
                <input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none"
                />
              </div>
            )}

            {/* Se for Saída Futura: Vencimento / Data a Pagar */}
            {tipo === 'saida_futura' && !isEmpresa && (
              <div className="p-2.5 sm:p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 uppercase">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Vencimento / Previsão a Pagar
                  </span>
                  <span className="text-[11px] text-amber-400 font-normal">
                    {formatDateBr(dataPrevista)}
                  </span>
                </div>
                <input
                  type="date"
                  value={dataPrevista}
                  onChange={(e) => setDataPrevista(e.target.value)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-1.5 text-white font-mono focus:outline-none"
                />
              </div>
            )}

            {/* Se for Serviço: Custos operacionais opcionais */}
            {tipo === 'servico' && (
              <div className="p-2.5 sm:p-3 bg-black/30 border border-amber-500/20 rounded-xl flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide">
                  Custos Operacionais do Serviço (Mão de Obra, Gasolina, Insumos)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Mão de Obra</label>
                    <input
                      type="number"
                      step="0.01"
                      value={maoDeObra}
                      onChange={(e) => setMaoDeObra(e.target.value)}
                      placeholder="0"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Gasolina</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gasolina}
                      onChange={(e) => setGasolina(e.target.value)}
                      placeholder="0"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-neutral-400 mb-1">Insumos</label>
                    <input
                      type="number"
                      step="0.01"
                      value={insumos}
                      onChange={(e) => setInsumos(e.target.value)}
                      placeholder="0"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* LUGAR PARA ANEXAR COMPROVANTES (FOTOS, RECIBOS, FATURAS) */}
            <div className="pt-1 border-t border-white/10">
              <ReceiptUploader
                attachments={comprovantes}
                onChange={setComprovantes}
                onViewAttachment={(att) => setViewingAttachment(att)}
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
              {!isNew ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Deseja dispensar/excluir este registro?')) {
                      onDelete(item.id);
                      onClose();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 text-xs font-medium text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dispensar</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 sm:py-2 text-xs text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition-all cursor-pointer ${
                    isEmpresa
                      ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isNew ? 'Salvar Lançamento' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Visualizador do Comprovante em tela cheia caso clique para ver */}
      {viewingAttachment && (
        <ReceiptViewerModal
          attachment={viewingAttachment}
          onClose={() => setViewingAttachment(null)}
          onDelete={() => {
            setComprovantes(comprovantes.filter((c) => c.id !== viewingAttachment.id));
            setViewingAttachment(null);
          }}
        />
      )}
    </>
  );
};
