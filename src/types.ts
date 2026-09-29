export type TransactionType = 'servico' | 'entrada' | 'saida' | 'entrada_futura' | 'saida_futura';

export type FinanceMode = 'casa' | 'empresa';

export interface ServiceCosts {
  maoDeObra: number;
  gasolina: number;
  insumos: number;
}

export interface ServiceExtraItem {
  id: string;
  descricao: string; // Ex: "Pintura da sala"
  valor: number; // Valor da mão de obra
  tempoEstimado?: string; // Tempo estimado (ex: "2 dias", "4 horas", "1 semana")
  status?: 'aprovado' | 'em_andamento' | 'concluido';
  observacoes?: string;
  data?: string;
  createdAt: number;
}

export interface ServiceExpenseItem {
  id: string;
  descricao: string;
  valor: number;
  categoria: 'material' | 'gasolina' | 'mao_de_obra' | 'outros';
  origem: 'bolso_pessoal' | 'caixa_empresa'; // Saiu do meu bolso pessoal ou da empresa
  cobrarDoCliente: boolean; // Se será cobrado/reembolsado pelo cliente
  comprovante?: AttachmentItem;
  createdAt: number;
}

export interface AttachmentItem {
  id: string;
  nome: string;
  dataUrl: string; // Base64 dataURL para imagem ou documento
  tipo: string; // image/jpeg, image/png, application/pdf, etc.
  tamanho?: string; // ex: "150 KB"
  criadoEm: number;
}

export interface TransactionItem {
  id: string;
  tipo: TransactionType;
  descricao: string;
  valor: number; // Valor total da transação (ou total a receber do cliente)
  valorServico?: number; // Valor base do serviço (Modo Empresa)
  acrescimos?: number; // Acréscimos / Adicionais / Extras (Modo Empresa)
  itensAdicionais?: ServiceExtraItem[]; // Detalhamento dos serviços extras deste trabalho (OS)
  despesasTrabalho?: ServiceExpenseItem[]; // Custos com material, gasolina, etc. deste trabalho
  numeroOS?: string; // Número ou identificador da Ordem de Serviço (ex: OS #1042)
  statusOS?: 'em_aberto' | 'em_andamento' | 'aguardando_cliente' | 'concluido' | 'cancelado'; // Status da OS
  tempoEstimadoBase?: string; // Tempo estimado do contrato base (ex: "5 dias", "2 semanas")
  data: string; // YYYY-MM-DD
  dataInicio?: string; // Data de início do serviço/contrato (Modo Empresa)
  dataFim?: string; // Data de fim / conclusão / entrega (Modo Empresa)
  dataPrevista?: string; // Para entrada ou saída futura (previsão de recebimento ou pagamento)
  comprovantes?: AttachmentItem[]; // Lugar para anexar comprovantes
  categoria?: string;
  cliente?: string;
  custos?: ServiceCosts;
  recebido?: boolean; // Se foi liquidado/baixado (recebido ou pago)
  createdAt: number;
}

export interface SummaryStats {
  saldoTotal: number;
  totalEntradas: number;
  totalSaidas: number;
  totalServicos: number;
  lucroServicos: number;
  totalEntradasFuturas: number;
  totalSaidasFuturas: number;
  totalValorServicos: number;
  totalAcrescimos: number;
  quantidadeItens: number;
}
