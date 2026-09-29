import { TransactionItem, TransactionType } from '../types';
import { getTodayDateString, getLastDayOfCurrentMonth } from './formatters';
import { parseNaturalDate } from './dateParser';
import { synthesizeJobTitle } from './titleSynthesizer';

export function extractNumber(text: string): { value: number; cleanText: string } | null {
  // 1. Números formatados com separador de milhar: 1.000, 10.500, 1.250,50
  // 2. Números diretos: 3000, 1500.50, 40, 40,50
  const formattedRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?(?:\s*(?:reais|real))?/i;
  const plainRegex = /(?:R\$\s*)?(\d+)(?:[.,](\d{1,2}))?(?:\s*(?:reais|real))?/i;

  let match = text.match(formattedRegex);
  let wholePart = '';
  let decimalPart = '00';

  if (match) {
    wholePart = match[1].replace(/\./g, '');
    decimalPart = match[2] ? match[2].padEnd(2, '0').slice(0, 2) : '00';
  } else {
    match = text.match(plainRegex);
    if (!match) return null;
    wholePart = match[1];
    decimalPart = match[2] ? match[2].padEnd(2, '0').slice(0, 2) : '00';
  }

  const num = parseFloat(`${wholePart}.${decimalPart}`);
  if (isNaN(num) || num <= 0) return null;

  const cleanText = text.replace(match[0], '').replace(/\s+/g, ' ').trim();
  return { value: num, cleanText };
}

// Extrair data explícita ou relativa do texto caso o usuário tenha informado (ex: "próxima sexta", "amanhã", "dia 15", "25/12")
export function extractDateFromText(text: string): string | null {
  const natural = parseNaturalDate(text);
  if (natural.hasDate && natural.dateString) {
    return natural.dateString;
  }

  return null;
}

export interface ParseResult {
  recognized: boolean;
  items: Array<Omit<TransactionItem, 'id' | 'createdAt'>>;
  feedback: string;
}

// Detectar se a frase expressa claramente uma SAÍDA (despesa, compra, pagamento, gasto)
export function isExpenseIntent(lower: string): boolean {
  return (
    // 1. Verbos e ações de gasto, compra e pagamento
    /\b(comprei|compre|compra|compras|comprar|comprado|adquiri)\b/i.test(lower) ||
    /\b(coloquei|coloque|colocar|botei|botou|bota)\b/i.test(lower) ||
    /\b(paguei|pago|pagar|pagamento|pagou|quitei|liquidei)\b/i.test(lower) ||
    /\b(gastei|gasto|gastos|gastar|gastou)\b/i.test(lower) ||
    /\b(abasteci|abastecer|abasteceu|abastecimento)\b/i.test(lower) ||
    /\b(saída|saida|saídas|saidas|despesa|despesas|custo|custos|custou)\b/i.test(lower) ||
    // 2. Saúde e Farmácia
    /\b(farmácia|farmacia|remédio|remedio|remédios|remedios|drogaria|medicamento|medicamentos|médico|medico|dentista|hospital|exame|consulta)\b/i.test(lower) ||
    // 3. Transporte e Veículo
    /\b(gasolina|gas|combustível|combustivel|etanol|álcool|alcool|diesel|posto|carro|moto|veículo|veiculo|uber|99|taxi|táxi|ônibus|onibus|passagem|pedágio|pedagio|estacionamento|oficina|mecânico|mecanico|pneu|troca de óleo|troca de oleo)\b/i.test(lower) ||
    // 4. Alimentação e Mercado
    /\b(mercado|supermercado|padaria|açougue|acougue|feira|hortifruti|sacolão|sacolao|almoço|almoco|jantar|café|cafe|lanche|comida|restaurante|ifood|delivery|pizza|hambúrguer|hamburguer|marmita|cerveja|bar)\b/i.test(lower) ||
    // 5. Moradia e Contas
    /\b(aluguel|condomínio|condominio|iptu|ipva|seguro|conta|contas|boleto|boletos|fatura|cartão|cartao|luz|energia|enel|copel|cemig|light|cpfl|água|agua|sabesp|sanepar|saneago|internet|wifi|telefone|celular|plano|claro|vivo|tim|oi|netflix|spotify)\b/i.test(lower) ||
    // 6. Impostos, taxas e tarifas
    /\b(imposto|taxa|tarifa|darf|das|simples|multa|juros)\b/i.test(lower)
  );
}

// Detectar se a frase expressa claramente uma ENTRADA (receita, ganho, recebimento)
export function isIncomeIntent(lower: string): boolean {
  return (
    /\b(recebi|recebido|recebimento|receber|receita|receitas)\b/i.test(lower) ||
    /\b(entrada|entradas)\b/i.test(lower) ||
    /\b(salário|salario|adiantamento|pro-labore|prolabore|pró-labore)\b/i.test(lower) ||
    /\b(faturei|faturamento|faturado)\b/i.test(lower) ||
    /\b(vendi|venda|vendas|vendido)\b/i.test(lower) ||
    /\b(lucro|resgate|rendimento|reembolso|ganhei)\b/i.test(lower) ||
    /(?:pix\s+recebido|recebi\s+um\s+pix|caiu\s+um\s+pix|caiu\s+na\s+conta|pix\s+de)/i.test(lower)
  );
}

// Detectar se a frase expressa SERVIÇO prestado
export function isServiceIntent(lower: string): boolean {
  return (
    /\b(serviço|servico|serviços|servicos)\b/i.test(lower) ||
    /\b(peguei\s+um\s+serviço|peguei\s+serviço|pegar\s+um\s+serviço|peguei|fechei\s+um\s+serviço|fechei\s+serviço|fechei\s+contrato|iniciei\s+serviço)\b/i.test(lower) ||
    /\b(instalação|instalacao|instalações|instalacoes)\b/i.test(lower) ||
    /\b(manutenção|manutencao|manutenções|manutencoes)\b/i.test(lower) ||
    /\b(projeto|projetos|reforma|reformas|obra|obras|contrato|contratos|freelance|freela|orçamento|orcamento)\b/i.test(lower)
  );
}

// Detectar se a frase expressa claramente DÍVIDA, DÉBITO ou COMPROMISSO A PAGAR
export function isPayableIntent(lower: string): boolean {
  return (
    // 1. Dívidas, débitos e compromissos
    /\b(devia|devo|devendo|dever|deve|dívida|divida|dívidas|dividas|débito|debito|débitos|debitos|fiquei devendo|ficou devendo|em dívida|em divida)\b/i.test(lower) ||
    // 2. Intenção futura de pagamento
    /\b(pagaria|pagarei|vou pagar|vai pagar|a pagar|pra pagar|para pagar|tenho que pagar|preciso pagar|ficou de pagar|devo pagar|combinado de pagar|prometi pagar|agendado para pagar|agendei pagamento)\b/i.test(lower) ||
    // 3. Saída futura explícita
    /\b(saída futura|saida futura|despesa futura|gasto futuro|conta futura|previsão de pagamento|previsao de pagamento)\b/i.test(lower) ||
    // 4. Vencimentos e prazos
    /\b(vencimento|vence|vencerá|vencera|a vencer|para vencer)\b/i.test(lower) ||
    // 5. Contas, boletos ou ajudante com indicação de data/prazo futuro
    ((lower.includes('ajudante') || lower.includes('conta') || lower.includes('boleto') || lower.includes('fatura') || lower.includes('aluguel') || lower.includes('fornecedor')) &&
      (lower.includes('até') || lower.includes('ate') || lower.includes('dia') || lower.includes('próxima') || lower.includes('proxima') || lower.includes('sexta') || lower.includes('segunda') || lower.includes('terça') || lower.includes('terca') || lower.includes('quarta') || lower.includes('quinta') || lower.includes('sábado') || lower.includes('sabado') || lower.includes('domingo') || lower.includes('semana que vem') || lower.includes('mês que vem') || lower.includes('mes que vem')))
  );
}

// Detectar compra de material, peças ou adicional para o cliente (Valor a Receber na Empresa)
export function isMaterialOrPartForClient(lower: string): boolean {
  const hasClient = /\b(pro\s+cliente|pra\s+cliente|para\s+o\s+cliente|para\s+a\s+cliente|ao\s+cliente|pelo\s+cliente|do\s+cliente)\b/i.test(lower);
  const hasPartOrMaterialOrAdditional = /\b(peça|peca|peças|pecas|material|materiais|adicional|adicionais|insumo|insumos|fio|tubo|cabos|equipamento|equipamentos)\b/i.test(lower);
  const hasBoughtOrSpent = /\b(comprei|gastei|compre|adição|adicao|pagou|paguei)\b/i.test(lower);

  return (
    (hasClient && (hasPartOrMaterialOrAdditional || hasBoughtOrSpent)) ||
    (hasPartOrMaterialOrAdditional && /\b(a\s+receber|reembolso|cobrar\s+do\s+cliente)\b/i.test(lower))
  );
}

// Atribuir categoria automática baseada no contexto
function detectCategory(lower: string, defaultType: TransactionType): string {
  if (/\b(ajudante|mão de obra|mao de obra|diária|diaria)\b/i.test(lower)) {
    return 'Ajudante / Mão de Obra';
  }
  if (/\b(dívida|divida|débito|debito|empréstimo|emprestimo)\b/i.test(lower)) {
    return 'Dívidas';
  }
  if (/\b(farmácia|farmacia|remédio|remedio|remédios|remedios|drogaria|medicamento|médico|medico|dentista|hospital|exame|consulta)\b/i.test(lower)) {
    return 'Farmácia / Saúde';
  }
  if (/\b(gasolina|gas|combustível|combustivel|etanol|álcool|alcool|diesel|posto|carro|moto|uber|99|taxi|táxi|ônibus|onibus|passagem|pedágio|pedagio|estacionamento|oficina|pneu)\b/i.test(lower)) {
    return 'Transporte / Veículo';
  }
  if (/\b(mercado|supermercado|padaria|açougue|acougue|feira|hortifruti|sacolão|sacolao|almoço|almoco|jantar|café|cafe|lanche|comida|restaurante|ifood|delivery|pizza|hambúrguer|hamburguer|marmita)\b/i.test(lower)) {
    return 'Alimentação';
  }
  if (/\b(aluguel|condomínio|condominio|iptu|ipva|seguro|conta|contas|boleto|boletos|fatura|cartão|cartao|luz|energia|água|agua|internet|wifi|telefone|celular|plano)\b/i.test(lower)) {
    return 'Moradia / Contas';
  }
  if (defaultType === 'saida_futura') return 'A Pagar';
  if (defaultType === 'saida') return 'Despesa';
  if (defaultType === 'entrada') return 'Receita';
  if (defaultType === 'entrada_futura') return 'A Receber';
  if (defaultType === 'servico') return 'Serviços';
  return 'Geral';
}

export function parseNaturalLanguageInput(rawInput: string): ParseResult {
  let input = rawInput.trim();
  // Limpar aspas, parênteses e pontuações nas bordas
  input = input.replace(/^["'(]+|["')]+$/g, '').trim();

  if (!input) {
    return {
      recognized: false,
      items: [],
      feedback: 'Comando vazio. Digite por exemplo: "coloquei 40 de gasolina", "comprei 35 na farmácia" ou "serviço 1000".',
    };
  }

  const lower = input.toLowerCase();
  const today = getTodayDateString();
  const explicitDate = extractDateFromText(lower);
  const lastDayOfMonth = explicitDate || getLastDayOfCurrentMonth();

  // =========================================================================
  // CENÁRIO 1: Serviço com pagamento parcial, ajudante/custos e saldo a receber
  // Exemplos:
  // "fiz um serviço que custou 1000 reais paguei 300 ao ajudante e já recebi o total de 500"
  // "serviço 1000 ajudante 300 recebi 500"
  // =========================================================================
  const hasServiceWord = isServiceIntent(lower);
  const hasHelperOrCost =
    lower.includes('ajudante') ||
    lower.includes('mão de obra') ||
    lower.includes('mao de obra') ||
    lower.includes('paguei ao ajudante') ||
    lower.includes('paguei pro ajudante');

  const hasReceivedPart =
    lower.includes('já recebi') ||
    lower.includes('ja recebi') ||
    lower.includes('recebi o total') ||
    lower.includes('recebi') ||
    lower.includes('recebido');

  if (hasServiceWord && (hasHelperOrCost || hasReceivedPart)) {
    // 1. Extrair valor total do serviço (ex: "custou 1000", "de 1000", "serviço 1000", "1000 reais")
    let totalServico = 0;
    const matchCustou = lower.match(/(?:custou|valor\s+de|total\s+de|cobrado)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
    const matchServicoVal = lower.match(/(?:serviço|servico)[^\d]*?(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);

    if (matchCustou) {
      totalServico = parseFloat(matchCustou[1].replace(',', '.'));
    } else if (matchServicoVal) {
      totalServico = parseFloat(matchServicoVal[1].replace(',', '.'));
    }

    // 2. Extrair valor pago ao ajudante ou mão de obra
    let ajudanteCusto = 0;
    const matchAjudante1 = lower.match(/(?:paguei|custo|ajudante|mão\s+de\s+obra|mao\s+de\s+obra)[^\d]*?(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:ao\s+ajudante|pro\s+ajudante|ajudante|de\s+mão\s+de\s+obra|de\s+mao\s+de\s+obra)?/i);
    const matchAjudante2 = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:ao\s+ajudante|pro\s+ajudante|ajudante)/i);

    if (matchAjudante2) {
      ajudanteCusto = parseFloat(matchAjudante2[1].replace(',', '.'));
    } else if (matchAjudante1) {
      ajudanteCusto = parseFloat(matchAjudante1[1].replace(',', '.'));
    }

    // 3. Extrair valor já recebido
    let jaRecebido = 0;
    const matchRecebido1 = lower.match(/(?:já\s+recebi|ja\s+recebi|recebi\s+o\s+total|recebi|recebido|adiantamento|sinal)[^\d]*?(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i);
    const matchRecebido2 = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:já\s+recebido|ja\s+recebido|recebido)/i);

    if (matchRecebido1) {
      jaRecebido = parseFloat(matchRecebido1[1].replace(',', '.'));
    } else if (matchRecebido2) {
      jaRecebido = parseFloat(matchRecebido2[1].replace(',', '.'));
    }

    // Se disse que já recebeu tudo / na hora / à vista, o valor recebido é o próprio total
    if (jaRecebido === 0 && totalServico > 0 && /\b(recebi na hora|recebi tudo|já recebi o total|ja recebi o total|já recebi|ja recebi|à vista|a vista|pago na hora)\b/i.test(lower)) {
      jaRecebido = totalServico;
    }

    // Fallback: se encontramos múltiplos números na frase
    const allNumbers = Array.from(lower.matchAll(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)/gi))
      .map((m) => parseFloat(m[1].replace(',', '.')))
      .filter((n) => !isNaN(n) && n > 0);

    if (totalServico === 0 && allNumbers.length >= 3) {
      totalServico = Math.max(...allNumbers);
    }

    if (totalServico > 0 || (jaRecebido > 0 && ajudanteCusto > 0)) {
      const generatedItems: Array<Omit<TransactionItem, 'id' | 'createdAt'>> = [];

      // Entrada líquida imediata: (já recebido - pago ao ajudante)
      const entradaLiquida = jaRecebido - ajudanteCusto;
      const saldoAReceber = totalServico > 0 ? Math.max(0, totalServico - jaRecebido) : 0;

      // 1. Lançar a Entrada no histórico
      if (entradaLiquida > 0) {
        generatedItems.push({
          tipo: 'entrada',
          descricao: `Entrada Serviço (Recebido R$ ${jaRecebido.toFixed(2)} - Ajudante R$ ${ajudanteCusto.toFixed(2)})`,
          valor: entradaLiquida,
          data: today,
          categoria: 'Serviço',
        });
      } else if (jaRecebido > 0 && ajudanteCusto === 0) {
        generatedItems.push({
          tipo: 'entrada',
          descricao: `Entrada Recebimento de Serviço`,
          valor: jaRecebido,
          data: today,
          categoria: 'Serviço',
        });
      }

      // Se pagou mais ao ajudante do que recebeu
      if (entradaLiquida < 0) {
        generatedItems.push({
          tipo: 'saida',
          descricao: `Pagamento Ajudante Serviço (Diferença imediata)`,
          valor: Math.abs(entradaLiquida),
          data: today,
          categoria: 'Mão de Obra',
        });
      }

      // 2. Lançar a Entrada Futura no histórico
      if (saldoAReceber > 0) {
        generatedItems.push({
          tipo: 'entrada_futura',
          descricao: `Entrada Futura Serviço (Saldo a receber de R$ ${totalServico.toFixed(2)})`,
          valor: saldoAReceber,
          data: today,
          dataPrevista: lastDayOfMonth,
          categoria: 'A Receber',
          recebido: false,
        });
      }

      if (generatedItems.length > 0) {
        const feedbackMsg = `✓ Interpretado: Entrada de R$ ${entradaLiquida.toFixed(
          2
        )} e Entrada Futura de R$ ${saldoAReceber.toFixed(2)} prevista para ${lastDayOfMonth}.`;

        return {
          recognized: true,
          items: generatedItems,
          feedback: feedbackMsg,
        };
      }
    }
  }

  // =========================================================================
  // CENÁRIO 1C: Adicional, Peças ou Material comprado para o Cliente (A RECEBER)
  // Como é comprado para o cliente, entra como VALOR A RECEBER (Empresa)
  // com opção imediata de fixar nota fiscal ou comprovante!
  // Exemplos:
  // "comprei 120 de peças pro cliente"
  // "comprei 150 de material pro cliente"
  // "adicional de pecas 80 pro cliente"
  // "pecas pro cliente 250"
  // =========================================================================
  if (isMaterialOrPartForClient(lower)) {
    const numExtract = extractNumber(input);
    if (numExtract) {
      let desc = numExtract.cleanText.trim();
      desc = desc.replace(/^(?:comprei|gastei|peguei|paguei)\s*(?:de\s*)?/i, '');
      desc = desc.trim() || 'Material e Peças para o Cliente';
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      // Detectar cliente se houver nome após "cliente"
      let clientName: string | undefined = undefined;
      const clientMatch = desc.match(/(?:pro\s+cliente|para\s+o\s+cliente|cliente)\s+([a-zA-ZÀ-ÿ]{2,15})/i);
      if (clientMatch && !['de', 'que', 'em', 'com', 'no', 'na', 'reais'].includes(clientMatch[1].toLowerCase())) {
        clientName = clientMatch[1].charAt(0).toUpperCase() + clientMatch[1].slice(1);
      }

      // Detectar se o dinheiro saiu do bolso pessoal / casa ou da empresa
      const isPersonalPocket = /\b(meu bolso|do meu bolso|bolso|dinheiro pessoal|pessoal|da casa|pela casa|minha conta)\b/i.test(lower);

      // Limpar termos de origem da descrição para não ficar redundante
      desc = desc.replace(/(?:do\s+meu\s+bolso|com\s+dinheiro\s+da\s+casa|da\s+casa|da\s+empresa|com\s+dinheiro\s+pessoal|do\s+bolso|pessoal)/gi, '').trim();
      desc = desc.replace(/\s{2,}/g, ' ');
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      const itemsToGenerate: Array<Omit<TransactionItem, 'id' | 'createdAt'>> = [
        // 1. Saída de Caixa: Dinheiro saiu no ato da compra (baixa no saldo atual)
        {
          tipo: 'saida',
          descricao: isPersonalPocket
            ? `${desc} (Pago do Bolso Pessoal / Casa)`
            : `${desc} (Saída do Caixa da Empresa)`,
          valor: numExtract.value,
          data: today,
          categoria: isPersonalPocket ? 'Reembolso do Bolso Pessoal' : 'Material / Peças do Cliente',
        },
        // 2. Entrada Futura: Valor a receber do cliente (fica pendente no A Receber até o cliente pagar)
        {
          tipo: 'entrada_futura',
          descricao: `${desc} (A Receber do Cliente)`,
          valor: numExtract.value,
          valorServico: numExtract.value,
          data: today,
          dataPrevista: lastDayOfMonth,
          cliente: clientName,
          categoria: 'Material / Peças a Receber',
          recebido: false,
        },
      ];

      const feedback = isPersonalPocket
        ? `✓ Lançamento Duplo: SAÍDA de R$ ${numExtract.value.toFixed(2)} do Bolso Pessoal e R$ ${numExtract.value.toFixed(2)} em A RECEBER do cliente. Fixe o comprovante/nota!`
        : `✓ Lançamento Duplo: SAÍDA de R$ ${numExtract.value.toFixed(2)} do Caixa e R$ ${numExtract.value.toFixed(2)} em A RECEBER do cliente. Fixe o comprovante/nota!`;

      return {
        recognized: true,
        items: itemsToGenerate,
        feedback,
      };
    }
  }

  // =========================================================================
  // CENÁRIO 2: Entrada Futura explícita
  // Exemplos: "entrada futura 500 cliente joao", "a receber 600 instalacao", "vou receber 750 na próxima sexta"
  // =========================================================================
  const isEntradaFutura =
    lower.includes('entrada futura') ||
    lower.includes('futura') ||
    lower.includes('a receber') ||
    lower.includes('vou receber') ||
    lower.includes('receber no fim do mês') ||
    lower.includes('receber no mes');

  if (isEntradaFutura) {
    const numExtract = extractNumber(
      input.replace(/(?:entrada\s+futura|futura|a\s+receber|vou\s+receber|receber\s+no\s+fim\s+do\s+mês|receber\s+no\s+mes)/gi, '')
    );
    if (numExtract) {
      const desc = numExtract.cleanText.trim() || 'Entrada Futura a Receber';
      return {
        recognized: true,
        items: [
          {
            tipo: 'entrada_futura',
            descricao: desc.charAt(0).toUpperCase() + desc.slice(1),
            valor: numExtract.value,
            data: today,
            dataPrevista: lastDayOfMonth,
            categoria: 'A Receber',
            recebido: false,
          },
        ],
        feedback: `✓ Entrada Futura registrada: R$ ${numExtract.value.toFixed(2)} prevista para ${lastDayOfMonth}.`,
      };
    }
  }

  // =========================================================================
  // CENÁRIO 2B: Saída Futura / A Pagar / Dívidas / Contas a Vencer
  // Exemplos:
  // "devia 50 ao ajudante e que pagaria na sexta"
  // "50 para o ajudante até dia 02"
  // "devo 100 pro fornecedor"
  // "a pagar 150 conta de luz"
  // =========================================================================
  const isSaidaFutura = isPayableIntent(lower);

  if (isSaidaFutura) {
    const numExtract = extractNumber(input);
    if (numExtract) {
      let desc = numExtract.cleanText.trim();
      desc = desc.replace(/^(?:a\s+pagar|vou\s+pagar|saída\s+futura|saida\s+futura|conta\s+a\s+pagar)\s*[:\s-]?\s*/i, '');
      desc = desc.trim() || 'Dívida / Conta a Pagar';
      desc = desc.charAt(0).toUpperCase() + desc.slice(1);

      return {
        recognized: true,
        items: [
          {
            tipo: 'saida_futura',
            descricao: desc,
            valor: numExtract.value,
            data: today,
            dataPrevista: lastDayOfMonth,
            categoria: detectCategory(lower, 'saida_futura'),
            recebido: false,
          },
        ],
        feedback: `✓ Lançamento A Pagar (Dívida/Compromisso) registrado: R$ ${numExtract.value.toFixed(2)} com vencimento para ${lastDayOfMonth}.`,
      };
    } else {
      return {
        recognized: false,
        items: [],
        feedback: `Identifiquei uma despesa/dívida a pagar em "${input}", mas faltou informar o valor. Exemplo: "${input} 50" ou "50 ${input}".`,
      };
    }
  }

  // =========================================================================
  // CENÁRIO 3: Análise Precisa de Tipo: Saída, Entrada ou Serviço
  // =========================================================================
  const isSaida = isExpenseIntent(lower);
  const isEntrada = isIncomeIntent(lower);
  const isServico = isServiceIntent(lower);

  // Extrair custos de serviço caso existam explicitamente na frase
  let cleanInput = input;
  let maoDeObra = 0;
  let gasolina = 0;
  let insumos = 0;
  let acrescimo = 0;
  let dataInicioExtract: string | undefined = undefined;
  let dataFimExtract: string | undefined = undefined;

  if (isServico) {
    // Captura "acréscimo de 300" OU "com 300 de acréscimo"
    const acresMatch =
      cleanInput.match(/(?:acréscimo|acrescimo|adicional|extra)\s*(?:de\s*)?[:\s]?\s*(\d+(?:[.,]\d+)?)/i) ||
      cleanInput.match(/(?:com\s+)?(\d+(?:[.,]\d+)?)\s*(?:reais\s+)?(?:de\s+)?(?:acréscimo|acrescimo|adicional|extra)/i);

    if (acresMatch) {
      const parsedAcres = parseFloat(acresMatch[1].replace(',', '.'));
      if (!isNaN(parsedAcres) && parsedAcres > 0) {
        acrescimo = parsedAcres;
        cleanInput = cleanInput.replace(acresMatch[0], '');
      }
    }

    const mobraMatch = cleanInput.match(/(?:mobra|mão de obra|mao de obra|ajudante)\s*[:\s]?\s*(\d+(?:[.,]\d+)?)/i);
    if (mobraMatch) {
      maoDeObra = parseFloat(mobraMatch[1].replace(',', '.'));
      cleanInput = cleanInput.replace(mobraMatch[0], '');
    }

    const gasMatch = cleanInput.match(/(?:gas|gasolina|combustível|combustivel)\s*[:\s]?\s*(\d+(?:[.,]\d+)?)/i);
    if (gasMatch) {
      gasolina = parseFloat(gasMatch[1].replace(',', '.'));
      cleanInput = cleanInput.replace(gasMatch[0], '');
    }

    const insumosMatch = cleanInput.match(/(?:insumos|ferramentas|materiais)\s*[:\s]?\s*(\d+(?:[.,]\d+)?)/i);
    if (insumosMatch) {
      insumos = parseFloat(insumosMatch[1].replace(',', '.'));
      cleanInput = cleanInput.replace(insumosMatch[0], '');
    }
  }

  // Extração do número principal
  const extracted = extractNumber(cleanInput);

  // Caso o usuário tenha digitado sem valor numérico (ex: "comprei na farmácia", "coloquei gasolina")
  if (!extracted) {
    const anyNumMatch = cleanInput.match(/(\d+(?:[.,]\d+)?)/);
    if (anyNumMatch) {
      const val = parseFloat(anyNumMatch[1].replace(',', '.'));
      if (!isNaN(val) && val > 0) {
        const textWithoutNum = cleanInput.replace(anyNumMatch[0], '').replace(/\s+/g, ' ').trim() || 'Lançamento';
        const finalTipo: TransactionType = isSaida ? 'saida' : isEntrada ? 'entrada' : isServico ? 'servico' : 'saida';
        const finalCat = detectCategory(lower, finalTipo);

        return {
          recognized: true,
          items: [
            {
              tipo: finalTipo,
              descricao: textWithoutNum.charAt(0).toUpperCase() + textWithoutNum.slice(1),
              valor: val,
              data: today,
              categoria: finalCat,
            },
          ],
          feedback: `✓ Registrado no Histórico: ${finalTipo === 'saida' ? 'SAÍDA' : finalTipo === 'entrada' ? 'ENTRADA' : 'SERVIÇO'} "${textWithoutNum}" no valor de R$ ${val.toFixed(2)}`,
        };
      }
    }

    // Orientação inteligente se o usuário digitou a ação mas esqueceu o valor
    if (isServico) {
      const synth = synthesizeJobTitle(cleanInput || input);
      return {
        recognized: false,
        items: [],
        feedback: `✓ Título sugerido: "${synth.title}"${synth.client ? ` (Cliente: ${synth.client})` : ''}. Para registrar no histórico, informe o valor (ex: "${input} 2500").`,
      };
    }
    if (isSaida) {
      return {
        recognized: false,
        items: [],
        feedback: `Identifiquei uma despesa em "${input}", mas faltou informar o valor. Exemplo: "${input} 35" ou "${input} 50 reais".`,
      };
    }
    if (isEntrada) {
      return {
        recognized: false,
        items: [],
        feedback: `Identifiquei uma entrada em "${input}", mas faltou informar o valor. Exemplo: "${input} 100".`,
      };
    }

    return {
      recognized: false,
      items: [],
      feedback: 'Não identifiquei o valor em reais. Digite por exemplo: "coloquei 40 de gasolina", "comprei 35 na farmácia" ou "serviço 250".',
    };
  }

  const valor = extracted.value;
  let desc = extracted.cleanText
    .replace(/^(?:reais|real)\s*/i, '')
    .replace(/\s*(?:reais|real)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Determinar Tipo:
  // Se contiver qualquer palavra de saída (coloquei, comprei, gasolina, farmácia, etc.) -> SAÍDA garantida!
  let tipo: TransactionType = 'saida';

  // Se o usuário digitou expressamente que é serviço, tem prioridade
  if (isServico && !/\b(comprei|coloquei|abasteci|gastei)\b/i.test(lower)) {
    tipo = 'servico';
  } else if (isSaida) {
    tipo = 'saida';
    desc = desc || 'Despesa';
  } else if (isEntrada) {
    tipo = 'entrada';
    desc = desc || 'Receita';
  } else if (isServico) {
    tipo = 'servico';
  } else {
    // Se não há palavras de entrada explícita e parece compra/gasto cotidiano, padrão é Saída
    tipo = 'saida';
    desc = desc || 'Despesa Avulsa';
  }

  let clientExtract: string | undefined = undefined;
  let categoria = detectCategory(lower, tipo);

  // Síntese Inteligente de Título e Cliente para Serviços
  if (tipo === 'servico') {
    const synth = synthesizeJobTitle(cleanInput || input);
    desc = synth.title;
    clientExtract = synth.client;
    if (synth.category) {
      categoria = synth.category;
    }
  } else {
    desc = desc.charAt(0).toUpperCase() + desc.slice(1);
  }

  const finalValorTotal = tipo === 'servico' && acrescimo > 0 ? valor + acrescimo : valor;

  // Para serviços: se o usuário NÃO disse expressamente "já recebi / à vista", fica como A RECEBER (recebido: false)
  const isExplicitlyReceived = /\b(já recebi|ja recebi|recebi na hora|à vista|a vista|pago na hora|já pago|ja pago)\b/i.test(lower);
  const serviceRecebido = tipo === 'servico' ? isExplicitlyReceived : undefined;

  let feedbackMsg = `✓ Registrado no Histórico: ${tipo === 'saida' ? 'SAÍDA' : tipo === 'entrada' ? 'ENTRADA' : 'SERVIÇO'} "${desc}" no valor de R$ ${finalValorTotal.toFixed(2)}${acrescimo > 0 ? ` (Base R$ ${valor.toFixed(2)} + Acréscimo R$ ${acrescimo.toFixed(2)})` : ''}`;

  if (tipo === 'servico') {
    if (serviceRecebido) {
      feedbackMsg = `✓ Serviço RECEBIDO registrado: "${desc}" no valor de R$ ${finalValorTotal.toFixed(2)} creditado no Saldo da Empresa.`;
    } else {
      feedbackMsg = `✓ Serviço registrado: "${desc}" no valor de R$ ${finalValorTotal.toFixed(2)} em A RECEBER (não afeta o Saldo da Empresa até o cliente pagar).`;
    }
  }

  return {
    recognized: true,
    items: [
      {
        tipo,
        descricao: desc,
        cliente: clientExtract,
        valor: finalValorTotal,
        valorServico: tipo === 'servico' ? valor : undefined,
        acrescimos: tipo === 'servico' && acrescimo > 0 ? acrescimo : undefined,
        data: today,
        dataInicio: tipo === 'servico' ? today : undefined,
        dataFim: tipo === 'servico' ? lastDayOfMonth : undefined,
        dataPrevista: tipo === 'servico' && !serviceRecebido ? lastDayOfMonth : undefined,
        categoria,
        recebido: serviceRecebido,
        custos:
          tipo === 'servico' && (maoDeObra > 0 || gasolina > 0 || insumos > 0)
            ? { maoDeObra, gasolina, insumos }
            : undefined,
      },
    ],
    feedback: feedbackMsg,
  };
}
