import { Router, Request, Response } from 'express';
import db from '../db/client';
import { invalidateRulesCache } from '../services/categorizer';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const rules = db.prepare(`SELECT * FROM category_rules ORDER BY priority DESC`).all();
  res.json(rules);
});

router.post('/', (req: Request, res: Response) => {
  const { pattern, txn_type, category, sub_category, priority, is_regex } = req.body;
  if (!pattern || !category) {
    res.status(400).json({ error: 'pattern and category are required' });
    return;
  }
  const result = db.prepare(`
    INSERT INTO category_rules (pattern, txn_type, category, sub_category, priority, is_regex)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    pattern,
    txn_type || 'any',
    category,
    sub_category || null,
    priority || 10,
    is_regex ? 1 : 0
  );
  invalidateRulesCache();
  res.json({ id: result.lastInsertRowid });
});

router.put('/:id', (req: Request, res: Response) => {
  const { pattern, txn_type, category, sub_category, priority, is_regex } = req.body;
  db.prepare(`
    UPDATE category_rules SET pattern=?, txn_type=?, category=?, sub_category=?, priority=?, is_regex=? WHERE id=?
  `).run(
    pattern, txn_type || 'any', category, sub_category || null,
    priority || 10, is_regex ? 1 : 0, parseInt(req.params.id)
  );
  invalidateRulesCache();
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response) => {
  db.prepare(`DELETE FROM category_rules WHERE id = ?`).run(parseInt(req.params.id));
  invalidateRulesCache();
  res.json({ success: true });
});

export default router;
