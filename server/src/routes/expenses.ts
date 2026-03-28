import { Router, Request, Response } from 'express';
import {
  getGroupedExpenses,
  getExpenseSummary,
  getLineItems,
  CATEGORY_LABELS,
} from '../services/aggregator';

const router = Router();

// GET /api/expenses?from=&to=&category=&groupBy=day|week|month
router.get('/', (req: Request, res: Response) => {
  const { from, to, category, groupBy } = req.query as Record<string, string>;
  const rows = getGroupedExpenses({ from, to, category, groupBy });
  res.json(rows);
});

// GET /api/expenses/summary?from=&to=
router.get('/summary', (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  const raw = getExpenseSummary(from, to);
  const summary = Object.entries(raw).map(([category, total_fen]) => ({
    category,
    category_label: CATEGORY_LABELS[category] || category,
    total_fen,
  }));
  res.json(summary);
});

// GET /api/expenses/items?groupKey=
router.get('/items', (req: Request, res: Response) => {
  const { groupKey } = req.query as Record<string, string>;
  if (!groupKey) {
    res.status(400).json({ error: 'groupKey is required' });
    return;
  }
  const items = getLineItems(groupKey);
  res.json(items);
});

export default router;
