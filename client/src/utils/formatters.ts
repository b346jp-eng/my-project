/**
 * Format fen (integer) to CNY display string
 */
export function formatCNY(fen: number): string {
  const yuan = fen / 100;
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(yuan);
}

/**
 * Format fen to compact display (e.g. ¥12.34万)
 */
export function formatCNYCompact(fen: number): string {
  const yuan = fen / 100;
  if (Math.abs(yuan) >= 100_000_000) {
    return `¥${(yuan / 100_000_000).toFixed(2)}亿`;
  }
  if (Math.abs(yuan) >= 10_000) {
    return `¥${(yuan / 10_000).toFixed(2)}万`;
  }
  return formatCNY(fen);
}

/**
 * Format fen to plain number string for chart axis
 */
export function fenToYuan(fen: number): number {
  return Math.round((fen / 100) * 100) / 100;
}

export const CATEGORY_LABELS: Record<string, string> = {
  procurement:       '采购/货款',
  salaries:          '工资/薪酬',
  operations:        '运营费用',
  tax:               '税费',
  other_expense:     '其他支出',
  collection_income: '回款',
  advance_payment:   '预收款',
  other_income:      '其他收入',
};

export const CATEGORY_COLORS: Record<string, string> = {
  procurement:       '#FF6B6B',
  salaries:          '#4ECDC4',
  operations:        '#45B7D1',
  tax:               '#96CEB4',
  other_expense:     '#FFEAA7',
  collection_income: '#6C5CE7',
  advance_payment:   '#A29BFE',
  other_income:      '#74B9FF',
};

export function formatDate(dateStr: string): string {
  return dateStr;
}

export function formatPeriod(groupKey: string): string {
  const period = groupKey.split('__')[0];
  if (period.length === 7) {
    // YYYY-MM → YYYY年MM月
    const [y, m] = period.split('-');
    return `${y}年${m}月`;
  }
  if (period.length === 10) {
    return period;
  }
  return period;
}
