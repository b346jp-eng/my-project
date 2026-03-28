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

export interface BalanceInfo {
  cashFen: number;
  payablesFen: number;
  asOf: string | null;
}

export interface BalanceSnapshot {
  snapshot_date: string;
  cash_fen: number;
  payables_fen: number;
}

export interface SummaryItem {
  category: string;
  category_label: string;
  total_fen: number;
}

export interface ImportRecord {
  id: number;
  filename: string;
  uploaded_at: string;
  row_count: number;
  status: string;
}

export interface PreviewRow {
  txn_date: string;
  txn_type: string;
  category: string;
  description: string;
  amount_fen: number;
  counterparty: string;
  auto_categorized: boolean;
}

export interface ParseError {
  row_index: number;
  reason: string;
}

export type GroupBy = 'day' | 'week' | 'month';
