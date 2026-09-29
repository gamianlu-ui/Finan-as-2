export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatDateBr(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-');
    if (day && month) {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const mIdx = parseInt(month, 10) - 1;
      return `${day} ${months[mIdx] || month}`;
    }
    return dateString;
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getTomorrowDateString(baseDate?: Date): string {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysToDateString(dateString: string, days: number): string {
  try {
    const [y, m, d] = dateString.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const resY = date.getFullYear();
    const resM = String(date.getMonth() + 1).padStart(2, '0');
    const resD = String(date.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  } catch {
    return getTodayDateString();
  }
}

export function getDaysDifference(targetDateString: string, baseDateString?: string): number {
  try {
    const base = baseDateString || getTodayDateString();
    const [y1, m1, d1] = base.split('-').map(Number);
    const [y2, m2, d2] = targetDateString.split('-').map(Number);
    const t1 = new Date(y1, m1 - 1, d1).getTime();
    const t2 = new Date(y2, m2 - 1, d2).getTime();
    return Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
  } catch {
    return 999;
  }
}

export function getLastDayOfCurrentMonth(baseDate?: Date): string {
  const d = baseDate || new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const y = lastDay.getFullYear();
  const m = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
