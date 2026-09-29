import { TransactionItem, FinanceMode } from '../types';

const STORAGE_PREFIX = 'fluxo_stream_v3_';
const ACTIVE_MODE_KEY = 'fluxo_stream_active_mode_v3';

export function getStorageKey(mode: FinanceMode): string {
  return `${STORAGE_PREFIX}${mode}`;
}

export function loadActiveMode(): FinanceMode {
  try {
    const saved = localStorage.getItem(ACTIVE_MODE_KEY);
    if (saved === 'casa' || saved === 'empresa') {
      return saved;
    }
  } catch (err) {
    console.error('Falha ao ler modo ativo', err);
  }
  return 'casa';
}

export function saveActiveMode(mode: FinanceMode): void {
  try {
    localStorage.setItem(ACTIVE_MODE_KEY, mode);
  } catch (err) {
    console.error('Falha ao salvar modo ativo', err);
  }
}

// Inicia com valores zerados (array vazio) e vai salvando conforme o uso
export function loadTransactions(mode: FinanceMode): TransactionItem[] {
  try {
    const raw = localStorage.getItem(getStorageKey(mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error(`Falha ao carregar transações do modo ${mode}`, err);
    return [];
  }
}

export function saveTransactions(mode: FinanceMode, items: TransactionItem[]): void {
  try {
    localStorage.setItem(getStorageKey(mode), JSON.stringify(items));
  } catch (err) {
    console.error(`Falha ao salvar transações do modo ${mode}`, err);
  }
}

// Exemplos opcionais se o usuário desejar carregar dados de demonstração
export const SAMPLE_CASA_ITEMS: TransactionItem[] = [
  {
    id: 'sample-c1',
    tipo: 'entrada',
    descricao: 'Salário Mensal',
    valor: 4500,
    data: '2026-03-25',
    categoria: 'Renda Fixa',
    createdAt: Date.now() - 300000,
  },
  {
    id: 'sample-c2',
    tipo: 'saida',
    descricao: 'Aluguel do Mês',
    valor: 1400,
    data: '2026-03-24',
    categoria: 'Moradia',
    createdAt: Date.now() - 200000,
  },
  {
    id: 'sample-c3',
    tipo: 'servico',
    descricao: 'Serviço Manutenção Ar Condicionado',
    valor: 350,
    data: '2026-03-22',
    cliente: 'Vizinho Carlos',
    custos: {
      maoDeObra: 50,
      gasolina: 25,
      insumos: 40,
    },
    createdAt: Date.now() - 100000,
  },
];

export const SAMPLE_EMPRESA_ITEMS: TransactionItem[] = [
  {
    id: 'sample-e1',
    tipo: 'entrada',
    descricao: 'Faturamento Projeto Web Solaris',
    valor: 8500,
    valorServico: 8000,
    acrescimos: 500,
    data: '2026-03-25',
    dataInicio: '2026-03-01',
    dataFim: '2026-03-25',
    categoria: 'Contratos',
    createdAt: Date.now() - 300000,
  },
  {
    id: 'sample-e2',
    tipo: 'servico',
    descricao: 'Serviço Cabeamento e Servidor',
    valor: 2100,
    valorServico: 1800,
    acrescimos: 300,
    data: '2026-03-23',
    dataInicio: '2026-03-20',
    dataFim: '2026-03-23',
    cliente: 'Clínica Vida',
    custos: {
      maoDeObra: 400,
      gasolina: 80,
      insumos: 250,
    },
    createdAt: Date.now() - 200000,
  },
  {
    id: 'sample-e3',
    tipo: 'saida',
    descricao: 'Servidores Nuvem AWS',
    valor: 580,
    data: '2026-03-20',
    categoria: 'Tecnologia',
    createdAt: Date.now() - 100000,
  },
];
