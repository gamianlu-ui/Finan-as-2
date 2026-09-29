import { getLastDayOfCurrentMonth, getTodayDateString } from './formatters';

export interface ParsedDateResult {
  hasDate: boolean;
  dateString?: string; // YYYY-MM-DD
  friendlyLabel?: string; // Ex: "Próxima Sexta-feira, 02/10"
  matchedText?: string;
  isReceivableIntent?: boolean; // Se mencionou "vou receber", "a receber", etc.
  isPayableIntent?: boolean; // Se mencionou "vou pagar", "a pagar", etc.
}

// Mapeamento dos dias da semana em JavaScript (0 = Domingo, 1 = Segunda, ..., 5 = Sexta, 6 = Sábado)
const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  dom: 0,
  segunda: 1,
  'segunda-feira': 1,
  seg: 1,
  terça: 2,
  terca: 2,
  'terça-feira': 2,
  'terca-feira': 2,
  ter: 2,
  quarta: 3,
  'quarta-feira': 3,
  qua: 3,
  quinta: 4,
  'quinta-feira': 4,
  qui: 4,
  sexta: 5,
  'sexta-feira': 5,
  sex: 5,
  sábado: 6,
  sabado: 6,
  sab: 6,
};

const WEEKDAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

function formatDateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatFriendlyDate(d: Date, extraNote?: string): string {
  const day = String(d.getDate()).padStart(2, '0');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const weekday = WEEKDAY_NAMES[d.getDay()];
  if (extraNote) {
    return `${extraNote} (${weekday}, ${day}/${m})`;
  }
  return `${weekday}, ${day}/${m}`;
}

export function parseNaturalDate(text: string, baseDate = new Date()): ParsedDateResult {
  if (!text || !text.trim()) {
    return { hasDate: false };
  }

  const lower = text.toLowerCase().trim();

  // Detectar intenção de recebimento ou pagamento futuro
  const isReceivableIntent =
    lower.includes('vou receber') ||
    lower.includes('receberei') ||
    lower.includes('a receber') ||
    lower.includes('receber') ||
    lower.includes('previsão') ||
    lower.includes('previsao') ||
    lower.includes('combinado');

  const isPayableIntent =
    lower.includes('vou pagar') ||
    lower.includes('pagarei') ||
    lower.includes('pagaria') ||
    lower.includes('a pagar') ||
    lower.includes('pra pagar') ||
    lower.includes('para pagar') ||
    lower.includes('tenho que pagar') ||
    lower.includes('preciso pagar') ||
    lower.includes('pagar') ||
    lower.includes('devia') ||
    lower.includes('devo') ||
    lower.includes('devendo') ||
    lower.includes('dívida') ||
    lower.includes('divida') ||
    lower.includes('débito') ||
    lower.includes('debito') ||
    lower.includes('fiquei devendo') ||
    lower.includes('vencimento') ||
    lower.includes('vence') ||
    lower.includes('para o ajudante') ||
    lower.includes('pro ajudante') ||
    lower.includes('ao ajudante') ||
    lower.includes('ajudante') ||
    lower.includes('até dia') ||
    lower.includes('ate dia') ||
    lower.includes('até o dia') ||
    lower.includes('ate o dia');

  // 1. "Amanhã" ou "Depois de amanhã"
  if (lower.includes('depois de amanhã') || lower.includes('depois de amanha')) {
    const target = new Date(baseDate);
    target.setDate(target.getDate() + 2);
    return {
      hasDate: true,
      dateString: formatDateToIso(target),
      friendlyLabel: formatFriendlyDate(target, 'Depois de amanhã'),
      matchedText: 'depois de amanhã',
      isReceivableIntent,
      isPayableIntent,
    };
  }

  if (lower.includes('amanhã') || lower.includes('amanha')) {
    const target = new Date(baseDate);
    target.setDate(target.getDate() + 1);
    return {
      hasDate: true,
      dateString: formatDateToIso(target),
      friendlyLabel: formatFriendlyDate(target, 'Amanhã'),
      matchedText: 'amanhã',
      isReceivableIntent,
      isPayableIntent,
    };
  }

  if (lower.includes('hoje')) {
    const target = new Date(baseDate);
    return {
      hasDate: true,
      dateString: formatDateToIso(target),
      friendlyLabel: formatFriendlyDate(target, 'Hoje'),
      matchedText: 'hoje',
      isReceivableIntent,
      isPayableIntent,
    };
  }

  // 2. Fim do mês / final do mês
  if (
    lower.includes('fim do mês') ||
    lower.includes('fim do mes') ||
    lower.includes('final do mês') ||
    lower.includes('final do mes') ||
    lower.includes('último dia do mês') ||
    lower.includes('ultimo dia do mes')
  ) {
    const lastDay = getLastDayOfCurrentMonth(baseDate);
    return {
      hasDate: true,
      dateString: lastDay,
      friendlyLabel: `Último dia do mês (${lastDay.split('-')[2]}/${lastDay.split('-')[1]})`,
      matchedText: 'fim do mês',
      isReceivableIntent,
      isPayableIntent,
    };
  }

  // 3. Dias da semana (ex: "próxima sexta", "vou receber na próxima sexta", "sexta que vem", "nessa sexta", "quarta-feira")
  // Expressões regulares para capturar dia da semana com variações: "próxima sexta", "sexta que vem", "na sexta", "sexta"
  const weekdayRegex = /(?:na\s+|no\s+|para\s+|em\s+)?(?:(próxima|proxima|nessa|esta|que\s+vem)\s+)?(segunda-feira|terça-feira|terca-feira|quarta-feira|quinta-feira|sexta-feira|sábado|sabado|segunda|terça|terca|quarta|quinta|sexta|domingo)(?:\s+(que\s+vem|próxima|proxima))?/i;

  const weekdayMatch = lower.match(weekdayRegex);
  if (weekdayMatch) {
    const prefix = (weekdayMatch[1] || '').trim();
    const dayWord = weekdayMatch[2].toLowerCase();
    const suffix = (weekdayMatch[3] || '').trim();
    const matchedFull = weekdayMatch[0];

    const targetDayIndex = WEEKDAYS[dayWord];
    if (targetDayIndex !== undefined) {
      const currentDayIndex = baseDate.getDay();
      let daysAhead = targetDayIndex - currentDayIndex;

      const isNextExplicit =
        prefix.includes('próxim') ||
        prefix.includes('proxim') ||
        suffix.includes('que vem') ||
        suffix.includes('próxim') ||
        suffix.includes('proxim');

      if (daysAhead <= 0) {
        // Se o dia já passou nesta semana (ex: hoje é segunda e pede domingo passado, ou hoje é sexta e pede sexta), avança para a próxima
        daysAhead += 7;
      } else if (isNextExplicit && daysAhead === 0) {
        daysAhead += 7;
      }

      const target = new Date(baseDate);
      target.setDate(target.getDate() + daysAhead);

      const capitalizedDay = WEEKDAY_NAMES[targetDayIndex];
      const friendlyPrefix = isNextExplicit ? `Próxima ${capitalizedDay}` : capitalizedDay;

      return {
        hasDate: true,
        dateString: formatDateToIso(target),
        friendlyLabel: formatFriendlyDate(target, friendlyPrefix),
        matchedText: matchedFull,
        isReceivableIntent,
        isPayableIntent,
      };
    }
  }

  // 4. Data explícita: "dia 15", "dia 25", "até dia 02", "ate dia 2", "pro dia 10"
  const dayOfMonthMatch = lower.match(/(?:até\s+o\s+dia|ate\s+o\s+dia|até\s+dia|ate\s+dia|pro\s+dia|para\s+o\s+dia|para\s+dia|no\s+dia|dia|data)\s*(\d{1,2})/i);
  if (dayOfMonthMatch) {
    const dayNum = parseInt(dayOfMonthMatch[1], 10);
    if (dayNum >= 1 && dayNum <= 31) {
      const target = new Date(baseDate);
      const currentDay = target.getDate();
      if (dayNum < currentDay) {
        // Se o dia já passou neste mês, joga para o próximo mês
        target.setMonth(target.getMonth() + 1);
      }
      target.setDate(dayNum);

      const isAte = dayOfMonthMatch[0].toLowerCase().includes('at');
      const labelPrefix = isAte ? `Até dia ${dayNum}` : `Dia ${dayNum}`;

      return {
        hasDate: true,
        dateString: formatDateToIso(target),
        friendlyLabel: formatFriendlyDate(target, labelPrefix),
        matchedText: dayOfMonthMatch[0],
        isReceivableIntent,
        isPayableIntent,
      };
    }
  }

  // 5. Data formato dd/mm ou dd/mm/aaaa
  const slashDateMatch = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (slashDateMatch) {
    const day = parseInt(slashDateMatch[1], 10);
    const month = parseInt(slashDateMatch[2], 10) - 1;
    const year = slashDateMatch[3]
      ? slashDateMatch[3].length === 2
        ? parseInt(`20${slashDateMatch[3]}`, 10)
        : parseInt(slashDateMatch[3], 10)
      : baseDate.getFullYear();

    const target = new Date(year, month, day);
    if (!isNaN(target.getTime())) {
      return {
        hasDate: true,
        dateString: formatDateToIso(target),
        friendlyLabel: formatFriendlyDate(target),
        matchedText: slashDateMatch[0],
        isReceivableIntent,
        isPayableIntent,
      };
    }
  }

  return { hasDate: false };
}
