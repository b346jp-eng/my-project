import db from './client';

const DDL = `
CREATE TABLE IF NOT EXISTS imports (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  filename    TEXT    NOT NULL,
  uploaded_at TEXT    NOT NULL DEFAULT (datetime('now')),
  row_count   INTEGER NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'ok'
);

CREATE TABLE IF NOT EXISTS raw_transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id   INTEGER NOT NULL REFERENCES imports(id),
  row_index   INTEGER NOT NULL,
  raw_json    TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  import_id        INTEGER REFERENCES imports(id),
  raw_id           INTEGER REFERENCES raw_transactions(id),
  txn_date         TEXT    NOT NULL,
  txn_type         TEXT    NOT NULL,
  category         TEXT    NOT NULL,
  sub_category     TEXT,
  description      TEXT    NOT NULL,
  amount_fen       INTEGER NOT NULL,
  counterparty     TEXT,
  reference_no     TEXT,
  paid             INTEGER NOT NULL DEFAULT 0,
  auto_categorized INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(txn_type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

CREATE TABLE IF NOT EXISTS balance_snapshots (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  snapshot_date TEXT    NOT NULL UNIQUE,
  cash_fen      INTEGER NOT NULL,
  payables_fen  INTEGER NOT NULL,
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS category_rules (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern      TEXT    NOT NULL,
  txn_type     TEXT    NOT NULL DEFAULT 'any',
  category     TEXT    NOT NULL,
  sub_category TEXT,
  priority     INTEGER NOT NULL DEFAULT 10,
  is_regex     INTEGER NOT NULL DEFAULT 0
);
`;

const DEFAULT_RULES = [
  { pattern: '采购', txn_type: 'expense', category: 'procurement', sub_category: null, priority: 20 },
  { pattern: '货款', txn_type: 'expense', category: 'procurement', sub_category: null, priority: 20 },
  { pattern: '原料', txn_type: 'expense', category: 'procurement', sub_category: null, priority: 20 },
  { pattern: '原材料', txn_type: 'expense', category: 'procurement', sub_category: null, priority: 20 },
  { pattern: '工资', txn_type: 'expense', category: 'salaries', sub_category: null, priority: 20 },
  { pattern: '薪酬', txn_type: 'expense', category: 'salaries', sub_category: null, priority: 20 },
  { pattern: '薪资', txn_type: 'expense', category: 'salaries', sub_category: null, priority: 20 },
  { pattern: '租金', txn_type: 'expense', category: 'operations', sub_category: 'rent', priority: 15 },
  { pattern: '物业', txn_type: 'expense', category: 'operations', sub_category: 'rent', priority: 15 },
  { pattern: '水电', txn_type: 'expense', category: 'operations', sub_category: 'utilities', priority: 15 },
  { pattern: '办公', txn_type: 'expense', category: 'operations', sub_category: null, priority: 15 },
  { pattern: '报销', txn_type: 'expense', category: 'operations', sub_category: null, priority: 10 },
  { pattern: '税', txn_type: 'expense', category: 'tax', sub_category: null, priority: 20 },
  { pattern: '增值税', txn_type: 'expense', category: 'tax', sub_category: null, priority: 25 },
  { pattern: '所得税', txn_type: 'expense', category: 'tax', sub_category: null, priority: 25 },
  { pattern: '回款', txn_type: 'collection', category: 'collection_income', sub_category: null, priority: 20 },
  { pattern: '收款', txn_type: 'collection', category: 'collection_income', sub_category: null, priority: 15 },
  { pattern: '预收', txn_type: 'collection', category: 'advance_payment', sub_category: null, priority: 20 },
];

export function initSchema(): void {
  db.exec(DDL);

  const insertRule = db.prepare(`
    INSERT OR IGNORE INTO category_rules (pattern, txn_type, category, sub_category, priority, is_regex)
    SELECT ?, ?, ?, ?, ?, 0
    WHERE NOT EXISTS (SELECT 1 FROM category_rules WHERE pattern = ? AND txn_type = ?)
  `);

  const seedRules = db.transaction(() => {
    for (const rule of DEFAULT_RULES) {
      insertRule.run(
        rule.pattern, rule.txn_type, rule.category, rule.sub_category, rule.priority,
        rule.pattern, rule.txn_type
      );
    }
  });

  seedRules();
  console.log('Database schema initialized.');
}
