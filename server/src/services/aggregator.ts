import db from '../db/client';

interface Transaction {
  id: number;
  txn_date: string;
  txn_type: string;
  category: string;
  sub_category: string | null;
  description: string;
  amount_fen: number;
  counterparty: string | null;
  reference_no: string | null;
  auto_categorized: number;
}

export interface GroupedRow {
  group_key: string;
  category: string;
  category_label: string;
  txn_type: string;
  total_fen: number;
  count: number;
}

export interface LineItem {
  id: number;
  txn_date: string;
  description: string;
  counterparty: string | null;
  reference_no: string | null;
  amount_fen: number;
  auto_categorized: boolean;
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

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function getGroupedExpenses(params: {
  from?: string;
  to?: string;
  category?: string;
  groupBy?: string;
}): GroupedRow[] {
  const { from, to, category, groupBy = 'day' } = params;

  let query = `
    SELECT id, txn_date, txn_type, category, sub_category, description, amount_fen, counterparty, reference_no, auto_categorized
    FROM transactions
    WHERE txn_type = 'expense'
  `;
  const bindings: (string | number)[] = [];

  if (from) { query += ` AND txn_date >= ?`; bindings.push(from); }
  if (to)   { query += ` AND txn_date <= ?`; bindings.push(to); }
  if (category) { query += ` AND category = ?`; bindings.push(category); }

  query += ` ORDER BY txn_date ASC`;

  const txns = db.prepare(query).all(...bindings) as Transaction[];

  // Group in memory by period + category
  const map = new Map<string, GroupedRow & { ids: number[] }>();

  for (const t of txns) {
    let period: string;
    if (groupBy === 'month') {
      period = getMonthKey(t.txn_date);
    } else if (groupBy === 'week') {
      period = getWeekStart(t.txn_date);
    } else {
      period = t.txn_date;
    }

    const key = `${period}__${t.category}`;
    if (!map.has(key)) {
      map.set(key, {
        group_key: key,
        category: t.category,
        category_label: CATEGORY_LABELS[t.category] || t.category,
        txn_type: t.txn_type,
        total_fen: 0,
        count: 0,
        ids: [],
      });
    }
    const g = map.get(key)!;
    g.total_fen += t.amount_fen;
    g.count += 1;
    g.ids.push(t.id);
  }

  // Convert to flat array with period embedded in group_key
  return Array.from(map.values()).map(({ ids: _ids, ...rest }) => rest);
}

export function getLineItems(groupKey: string): LineItem[] {
  const [period, category] = groupKey.split('__');
  let dateFilter = '';
  const bindings: (string | number)[] = [category];

  if (period.length === 7) {
    // month: YYYY-MM
    dateFilter = `AND txn_date LIKE ?`;
    bindings.push(period + '%');
  } else if (period.length === 10) {
    // check if it's a week start date (used as week key) or exact date
    dateFilter = `AND (txn_date = ? OR txn_date BETWEEN ? AND ?)`;
    const weekEnd = new Date(period + 'T00:00:00Z');
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    bindings.push(period, period, weekEnd.toISOString().slice(0, 10));
  }

  const query = `
    SELECT id, txn_date, description, counterparty, reference_no, amount_fen, auto_categorized
    FROM transactions
    WHERE txn_type = 'expense' AND category = ?
    ${dateFilter}
    ORDER BY txn_date ASC, id ASC
  `;

  const rows = db.prepare(query).all(...bindings) as (Transaction & { auto_categorized: number })[];
  return rows.map(r => ({
    id: r.id,
    txn_date: r.txn_date,
    description: r.description,
    counterparty: r.counterparty,
    reference_no: r.reference_no,
    amount_fen: r.amount_fen,
    auto_categorized: r.auto_categorized === 1,
  }));
}

export function getExpenseSummary(from?: string, to?: string): Record<string, number> {
  let query = `
    SELECT category, SUM(amount_fen) as total_fen
    FROM transactions
    WHERE txn_type = 'expense'
  `;
  const bindings: string[] = [];
  if (from) { query += ` AND txn_date >= ?`; bindings.push(from); }
  if (to)   { query += ` AND txn_date <= ?`; bindings.push(to); }
  query += ` GROUP BY category`;

  const rows = db.prepare(query).all(...bindings) as { category: string; total_fen: number }[];
  const result: Record<string, number> = {};
  for (const r of rows) result[r.category] = r.total_fen;
  return result;
}

export function getGroupedCollections(params: {
  from?: string;
  to?: string;
  category?: string;
  groupBy?: string;
}): GroupedRow[] {
  const { from, to, category, groupBy = 'day' } = params;

  let query = `
    SELECT id, txn_date, txn_type, category, amount_fen, description, counterparty, reference_no, auto_categorized
    FROM transactions
    WHERE txn_type = 'collection'
  `;
  const bindings: (string | number)[] = [];

  if (from) { query += ` AND txn_date >= ?`; bindings.push(from); }
  if (to)   { query += ` AND txn_date <= ?`; bindings.push(to); }
  if (category) { query += ` AND category = ?`; bindings.push(category); }

  query += ` ORDER BY txn_date ASC`;

  const txns = db.prepare(query).all(...bindings) as Transaction[];
  const map = new Map<string, GroupedRow>();

  for (const t of txns) {
    let period: string;
    if (groupBy === 'month') {
      period = getMonthKey(t.txn_date);
    } else if (groupBy === 'week') {
      period = getWeekStart(t.txn_date);
    } else {
      period = t.txn_date;
    }

    const key = `${period}__${t.category}`;
    if (!map.has(key)) {
      map.set(key, {
        group_key: key,
        category: t.category,
        category_label: CATEGORY_LABELS[t.category] || t.category,
        txn_type: t.txn_type,
        total_fen: 0,
        count: 0,
      });
    }
    const g = map.get(key)!;
    g.total_fen += t.amount_fen;
    g.count += 1;
  }

  return Array.from(map.values());
}

export function getCollectionSummary(from?: string, to?: string): Record<string, number> {
  let query = `
    SELECT category, SUM(amount_fen) as total_fen
    FROM transactions
    WHERE txn_type = 'collection'
  `;
  const bindings: string[] = [];
  if (from) { query += ` AND txn_date >= ?`; bindings.push(from); }
  if (to)   { query += ` AND txn_date <= ?`; bindings.push(to); }
  query += ` GROUP BY category`;

  const rows = db.prepare(query).all(...bindings) as { category: string; total_fen: number }[];
  const result: Record<string, number> = {};
  for (const r of rows) result[r.category] = r.total_fen;
  return result;
}

export function rebuildBalanceSnapshots(): void {
  // Get all unique dates with transactions
  const dates = db.prepare(
    `SELECT DISTINCT txn_date FROM transactions ORDER BY txn_date ASC`
  ).all() as { txn_date: string }[];

  const upsert = db.prepare(`
    INSERT INTO balance_snapshots (snapshot_date, cash_fen, payables_fen, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(snapshot_date) DO UPDATE SET
      cash_fen = excluded.cash_fen,
      payables_fen = excluded.payables_fen,
      updated_at = excluded.updated_at
  `);

  const rebuild = db.transaction(() => {
    for (const { txn_date } of dates) {
      const collections = db.prepare(
        `SELECT COALESCE(SUM(amount_fen), 0) as total FROM transactions WHERE txn_type = 'collection' AND txn_date <= ?`
      ).get(txn_date) as { total: number };

      const expenses = db.prepare(
        `SELECT COALESCE(SUM(amount_fen), 0) as total FROM transactions WHERE txn_type = 'expense' AND txn_date <= ?`
      ).get(txn_date) as { total: number };

      const payables = db.prepare(
        `SELECT COALESCE(SUM(amount_fen), 0) as total FROM transactions WHERE txn_type = 'expense' AND category = 'procurement' AND paid = 0 AND txn_date <= ?`
      ).get(txn_date) as { total: number };

      const cash_fen = collections.total - expenses.total;
      upsert.run(txn_date, cash_fen, payables.total);
    }
  });

  rebuild();
}
