import { Router, Request, Response } from 'express';
import db from '../db/client';

const router = Router();

// GET /api/balance — latest snapshot
router.get('/', (_req: Request, res: Response) => {
  const snapshot = db.prepare(
    `SELECT snapshot_date, cash_fen, payables_fen, updated_at FROM balance_snapshots ORDER BY snapshot_date DESC LIMIT 1`
  ).get() as { snapshot_date: string; cash_fen: number; payables_fen: number; updated_at: string } | undefined;

  if (!snapshot) {
    res.json({ cashFen: 0, payablesFen: 0, asOf: null });
    return;
  }
  res.json({
    cashFen: snapshot.cash_fen,
    payablesFen: snapshot.payables_fen,
    asOf: snapshot.snapshot_date,
  });
});

// GET /api/balance/history?from=&to=
router.get('/history', (req: Request, res: Response) => {
  const { from, to } = req.query as Record<string, string>;
  let query = `SELECT snapshot_date, cash_fen, payables_fen FROM balance_snapshots`;
  const bindings: string[] = [];

  const conditions: string[] = [];
  if (from) { conditions.push('snapshot_date >= ?'); bindings.push(from); }
  if (to)   { conditions.push('snapshot_date <= ?'); bindings.push(to); }
  if (conditions.length) query += ` WHERE ${conditions.join(' AND ')}`;
  query += ` ORDER BY snapshot_date ASC`;

  const rows = db.prepare(query).all(...bindings);
  res.json(rows);
});

// PATCH /api/balance/pay/:txnId — mark procurement as paid
router.patch('/pay/:txnId', (req: Request, res: Response) => {
  const { txnId } = req.params;
  const result = db.prepare(
    `UPDATE transactions SET paid = 1 WHERE id = ? AND category = 'procurement'`
  ).run(parseInt(txnId));

  if (result.changes === 0) {
    res.status(404).json({ error: '未找到对应采购记录' });
    return;
  }

  // Rebuild balance snapshots
  const { rebuildBalanceSnapshots } = require('../services/aggregator');
  rebuildBalanceSnapshots();

  res.json({ success: true });
});

export default router;
