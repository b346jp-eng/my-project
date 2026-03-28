import { Router, Request, Response } from 'express';
import {
  getGroupedCollections,
  getCollectionSummary,
  CATEGORY_LABELS,
} from '../services/aggregator';
import db from '../db/client';

const router = Router();

// GET /api/collections?from=&to=&category=&groupBy=day|week|month
router.get('/', (req: Request, res: Response) => {
  const { from, to, category, groupBy } = req.query as Record<string, string>;
  const rows = getGroupedCollections({ from, to, category, groupBy });
  res.json(rows);
});

// GET /api/collections/summary?from=&to=
router.get('/summary', (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  const raw = getCollectionSummary(from, to);
  const summary = Object.entries(raw).map(([category, total_fen]) => ({
    category,
    category_label: CATEGORY_LABELS[category] || category,
    total_fen,
  }));
  res.json(summary);
});

// GET /api/collections/items?groupKey=
router.get('/items', (req: Request, res: Response) => {
  const { groupKey } = req.query as Record<string, string>;
  if (!groupKey) {
    res.status(400).json({ error: 'groupKey is required' });
    return;
  }
  const [period, category] = (groupKey as string).split('__');
  let dateFilter = '';
  const bindings: (string | number)[] = [category];

  if (period.length === 7) {
    dateFilter = `AND txn_date LIKE ?`;
    bindings.push(period + '%');
  } else {
    const weekEnd = new Date(period + 'T00:00:00Z');
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    dateFilter = `AND txn_date BETWEEN ? AND ?`;
    bindings.push(period, weekEnd.toISOString().slice(0, 10));
  }

  const rows = db.prepare(`
    SELECT id, txn_date, description, counterparty, reference_no, amount_fen, auto_categorized
    FROM transactions
    WHERE txn_type = 'collection' AND category = ?
    ${dateFilter}
    ORDER BY txn_date ASC, id ASC
  `).all(...bindings) as {
    id: number; txn_date: string; description: string;
    counterparty: string | null; reference_no: string | null;
    amount_fen: number; auto_categorized: number;
  }[];

  res.json(rows.map(r => ({ ...r, auto_categorized: r.auto_categorized === 1 })));
});

export default router;
