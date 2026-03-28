import db from '../db/client';
import { NormalizedRow } from './parser';

interface CategoryRule {
  id: number;
  pattern: string;
  txn_type: string;
  category: string;
  sub_category: string | null;
  priority: number;
  is_regex: number;
}

export interface CategorizeResult {
  txn_type: 'expense' | 'collection';
  category: string;
  sub_category: string | null;
  auto_categorized: boolean;
}

let rulesCache: CategoryRule[] | null = null;

export function invalidateRulesCache(): void {
  rulesCache = null;
}

function loadRules(): CategoryRule[] {
  if (rulesCache) return rulesCache;
  rulesCache = db.prepare(
    'SELECT * FROM category_rules ORDER BY priority DESC'
  ).all() as CategoryRule[];
  return rulesCache;
}

export function categorize(row: NormalizedRow): CategorizeResult {
  const rawType = row.txn_type_raw.toLowerCase();
  const isCollection =
    /收入|回款|收款|入|credit/.test(rawType) ||
    (row.amount_sign === 1);
  const txn_type: 'expense' | 'collection' = isCollection ? 'collection' : 'expense';

  const searchText = [row.description, row.category_hint, row.counterparty]
    .join(' ')
    .toLowerCase();

  const rules = loadRules();

  for (const rule of rules) {
    // Filter by txn_type scope
    if (rule.txn_type !== 'any' && rule.txn_type !== txn_type) continue;

    let matched = false;
    if (rule.is_regex) {
      try {
        matched = new RegExp(rule.pattern, 'i').test(searchText);
      } catch {
        // invalid regex, skip
      }
    } else {
      matched = searchText.includes(rule.pattern.toLowerCase());
    }

    if (matched) {
      return {
        txn_type,
        category: rule.category,
        sub_category: rule.sub_category,
        auto_categorized: false,
      };
    }
  }

  // Heuristic fallback
  if (txn_type === 'expense') {
    if (/工资|薪资|薪酬/.test(searchText)) {
      return { txn_type, category: 'salaries', sub_category: null, auto_categorized: true };
    }
    if (/采购|货款|原料|原材料/.test(searchText)) {
      return { txn_type, category: 'procurement', sub_category: null, auto_categorized: true };
    }
    if (/租金|物业|租/.test(searchText)) {
      return { txn_type, category: 'operations', sub_category: 'rent', auto_categorized: true };
    }
    if (/税|税款/.test(searchText)) {
      return { txn_type, category: 'tax', sub_category: null, auto_categorized: true };
    }
    return { txn_type, category: 'other_expense', sub_category: null, auto_categorized: true };
  } else {
    if (/回款|货款回/.test(searchText)) {
      return { txn_type, category: 'collection_income', sub_category: null, auto_categorized: true };
    }
    if (/预收/.test(searchText)) {
      return { txn_type, category: 'advance_payment', sub_category: null, auto_categorized: true };
    }
    return { txn_type, category: 'other_income', sub_category: null, auto_categorized: true };
  }
}
