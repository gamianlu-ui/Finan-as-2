// Utilitário para síntese inteligente de Títulos e Nomes de Serviços/Trabalhos
// a partir de linguagem natural e falada cotidiana.

export interface SynthesizedTitleResult {
  title: string;
  client?: string;
  category: string;
}

const STOP_WORDS = new Set([
  'e', 'de', 'do', 'da', 'dos', 'das', 'para', 'pra', 'pro', 'com', 'em', 'no', 'na',
  'que', 'valor', 'reais', 'real', 'hoje', 'ontem', 'amanha', 'amanhã', 'a', 'o',
  'um', 'uma', 'uns', 'umas', 'meu', 'minha', 'dia', 'mes', 'ano'
]);

export function synthesizeJobTitle(rawInput: string): SynthesizedTitleResult {
  let text = rawInput;

  // 1. Extrair número se houver e limpar da análise do texto
  const formattedRegex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?(?:\s*(?:reais|real))?/i;
  const plainRegex = /(?:R\$\s*)?(\d+)(?:[.,](\d{1,2}))?(?:\s*(?:reais|real))?/i;
  text = text.replace(formattedRegex, ' ').replace(plainRegex, ' ');

  // 2. Extrair Cliente e Pronome
  let client: string | undefined = undefined;
  let clientPreposition = 'do';

  // Padrão 1: "na casa / no apartamento / no escritório / na loja d[oa] [Nome]"
  const matchCasa = text.match(
    /(?:na\s+casa|no\s+ap(?:artamento)?|no\s+escritório|no\s+comércio|na\s+loja|no\s+prédio)\s+(?:(d[oa]s?|de)\s+)?(?:(dona|seu|sr\.?|sra\.?)\s+)?([A-ZÀ-ÿa-z]+)/i
  );

  if (matchCasa) {
    const prep = matchCasa[1]?.toLowerCase() || 'do';
    const pronoun = matchCasa[2]
      ? matchCasa[2].charAt(0).toUpperCase() + matchCasa[2].slice(1).toLowerCase() + ' '
      : '';
    const name = matchCasa[3].charAt(0).toUpperCase() + matchCasa[3].slice(1).toLowerCase();

    if (!/^(cozinha|banheiro|sala|quarto|forro|parede|teto|empresa|reforma|piso)$/i.test(name)) {
      client = pronoun + name;
      clientPreposition =
        prep === 'da' || pronoun.includes('Dona') || pronoun.includes('Sra') ? 'da' : 'do';
      text = text.replace(matchCasa[0], ' ');
    }
  }

  // Padrão 2: "pro cliente / para o cliente / cliente [Nome]"
  if (!client) {
    const matchCliente = text.match(
      /(?:pro\s+cliente|para\s+o\s+cliente|cliente)\s+(?:(dona|seu|sr\.?|sra\.?)\s+)?([A-ZÀ-ÿa-z]+)/i
    );
    if (matchCliente) {
      const pronoun = matchCliente[1]
        ? matchCliente[1].charAt(0).toUpperCase() + matchCliente[1].slice(1).toLowerCase() + ' '
        : '';
      const name = matchCliente[2].charAt(0).toUpperCase() + matchCliente[2].slice(1).toLowerCase();
      if (!/^(de|que|em|com|no|na|reais|valor|dia|mes|ano)$/i.test(name)) {
        client = pronoun + name;
        clientPreposition = pronoun.includes('Dona') || pronoun.includes('Sra') ? 'da' : 'do';
        text = text.replace(matchCliente[0], ' ');
      }
    }
  }

  // Padrão 3: "d[oa] [Nome]" no texto
  if (!client) {
    const matchDo = text.match(/\b(d[oa]|de)\s+(?:(dona|seu|sr\.?|sra\.?)\s+)?([A-ZÀ-ÿ][a-z]+)\b/);
    if (matchDo) {
      const prep = matchDo[1].toLowerCase();
      const pronoun = matchDo[2]
        ? matchDo[2].charAt(0).toUpperCase() + matchDo[2].slice(1).toLowerCase() + ' '
        : '';
      const name = matchDo[3];
      if (
        !/^(cozinha|banheiro|sala|quarto|forro|parede|teto|casa|empresa|serviço|trabalho|cliente|ajudante|mão|obra|peça|peças|material|ar)$/i.test(
          name
        )
      ) {
        client = pronoun + (name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        clientPreposition = prep === 'da' || pronoun.includes('Dona') ? 'da' : 'do';
        text = text.replace(matchDo[0], ' ');
      }
    }
  }

  // 3. Limpeza de preâmbulos e ruídos de fala
  text = text.replace(
    /^(?:iniciei|peguei|fechei|fiz|vou\s+fazer|estou\s+fazendo|tenho|comecei|trabalho)\s+(?:um\s+)?(?:serviço|servico|trabalho|contrato|obra|projeto)?\s*/i,
    ' '
  );
  text = text.replace(
    /\b(?:e\s+para|que\s+é\s+para|que\s+e\s+para|para\s+fazer|pra\s+fazer|para|pra|pro)\b/gi,
    ' '
  );
  text = text.replace(/\b(?:e\s+também|e\s+tambem|também|tambem)\b/gi, ' e ');
  text = text.replace(/\s+/g, ' ').trim();

  // 4. Identificar Ações
  const actions: string[] = [];
  if (/\b(reformar|reforma|reformas|reformando)\b/i.test(text)) actions.push('Reforma');
  // Trata também erros comuns de digitação/autocorreção (como "Internet o forro" citado pelo usuário para pintura/arrumar)
  if (/\b(pintar|pintura|pintando|internet\s+o\s+forro|internet\s+forro)\b/i.test(text)) {
    actions.push('Pintura');
  }
  if (/\b(trocar|troca|substituir|substituição|trocando)\b/i.test(text)) actions.push('Troca');
  if (/\b(colocar\s+piso|assentar\s+piso|colocação\s+de\s+piso)\b/i.test(text)) {
    actions.push('Colocação de piso');
  } else if (/\b(instalar|instalação|instalando|colocar|colocação)\b/i.test(text)) {
    actions.push('Instalação');
  }
  if (/\b(consertar|conserto|arrumar|reparo|reparar|reparando)\b/i.test(text)) {
    actions.push('Conserto');
  }
  if (/\b(manutenção|manutencao|revisão|revisao)\b/i.test(text)) actions.push('Manutenção');
  if (/\b(limpar|limpeza)\b/i.test(text)) actions.push('Limpeza');

  // 5. Identificar Áreas e Elementos
  const elements: string[] = [];
  if (/\bcozinha\b/i.test(text)) elements.push('na cozinha');
  if (/\bbanheiro\b/i.test(text)) elements.push('no banheiro');
  if (/\b(sala|quarto|garagem|varanda|sacada|quintal|fachada)\b/i.test(text)) {
    const matchArea = text.match(/\b(sala|quarto|garagem|varanda|sacada|quintal|fachada)\b/i);
    if (matchArea) elements.push('na ' + matchArea[1].toLowerCase());
  }
  if (/\b(forro|teto|gesso)\b/i.test(text)) elements.push('e forro');
  if (/\b(fiação|fiacao|elétrica|eletrica)\b/i.test(text)) elements.push('de fiação elétrica');
  if (/\b(ar\s+condicionado)\b/i.test(text)) elements.push('de ar condicionado');
  if (/\bpiso\b/i.test(text) && !actions.includes('Colocação de piso')) elements.push('de piso');
  if (/\btelhado\b/i.test(text)) elements.push('no telhado');
  if (/\b(computador|computadores|pc|rede|servidor)\b/i.test(text)) {
    elements.push('de rede e informática');
  }

  // 6. Construir Título Inteligente
  let title = '';
  if (actions.length > 0) {
    title = actions.join(' e ');
    if (elements.length > 0) {
      title += ' ' + elements.join(' ');
    }
  }

  // Fallback se não casou pelas palavras-chave exatas: limpa e aproveita o texto digitado
  if (!title) {
    let clean = text.replace(/^(?:de|para|na|no|com)\s+/i, '').trim();
    if (clean) {
      title = clean.charAt(0).toUpperCase() + clean.slice(1);
    } else {
      title = 'Serviço sob Demanda';
    }
  }

  // Acoplar o cliente com concordância gramatical perfeita (ex: "do José", "da Dona Maria")
  if (client && !title.toLowerCase().includes(client.toLowerCase())) {
    title += ` ${clientPreposition} ${client}`;
  }

  title = title.replace(/\s{2,}/g, ' ').trim();

  // 7. Categoria Automática
  let category = 'Serviços';
  if (/\b(pintura|pintar|forro|gesso)\b/i.test(title)) {
    category = 'Pintura & Acabamento';
  } else if (/\b(reforma|construção|piso)\b/i.test(title)) {
    category = 'Reforma & Obra';
  } else if (/\b(elétrica|eletrica|fiação|fiacao)\b/i.test(title)) {
    category = 'Instalação Elétrica';
  } else if (/\b(ar\s+condicionado|climatização)\b/i.test(title)) {
    category = 'Climatização';
  } else if (/\b(informática|rede|computador)\b/i.test(title)) {
    category = 'Tecnologia';
  }

  return { title, client, category };
}
