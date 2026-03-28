import { Router, Request, Response } from 'express';
import multer from 'multer';
import db from '../db/client';
import { parseExcelBuffer } from '../services/parser';
import { categorize } from '../services/categorizer';
import { rebuildBalanceSnapshots } from '../services/aggregator';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (parseInt(process.env.UPLOAD_MAX_MB || '10')) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.(xlsx|xls|csv)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .xlsx、.xls、.csv 格式'));
    }
  },
});

// POST /api/upload/preview — parse but don't save
router.post('/preview', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请上传文件' });
    return;
  }
  const result = parseExcelBuffer(req.file.buffer);
  const preview = result.rows.slice(0, 10).map(r => {
    const cat = categorize(r);
    return {
      txn_date: r.txn_date,
      txn_type: cat.txn_type,
      category: cat.category,
      category_label: cat.category,
      description: r.description,
      amount_fen: r.amount_fen,
      counterparty: r.counterparty,
      auto_categorized: cat.auto_categorized,
    };
  });
  res.json({
    total_rows: result.rows.length,
    error_count: result.errors.length,
    preview,
    errors: result.errors.slice(0, 20),
  });
});

// POST /api/upload/confirm — save to DB
router.post('/confirm', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: '请上传文件' });
    return;
  }

  const result = parseExcelBuffer(req.file.buffer);
  if (result.rows.length === 0) {
    res.status(400).json({ error: '文件中没有可解析的有效数据', errors: result.errors });
    return;
  }

  const insertImport = db.prepare(
    `INSERT INTO imports (filename, row_count, status) VALUES (?, ?, ?)`
  );
  const insertRaw = db.prepare(
    `INSERT INTO raw_transactions (import_id, row_index, raw_json) VALUES (?, ?, ?)`
  );
  const insertTxn = db.prepare(`
    INSERT INTO transactions
      (import_id, raw_id, txn_date, txn_type, category, sub_category, description, amount_fen, counterparty, reference_no, auto_categorized)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const doInsert = db.transaction(() => {
    const importInfo = insertImport.run(
      req.file!.originalname,
      result.rows.length,
      result.errors.length > 0 ? 'partial' : 'ok'
    );
    const importId = importInfo.lastInsertRowid as number;

    for (const row of result.rows) {
      const rawInfo = insertRaw.run(importId, row.row_index, JSON.stringify(row));
      const rawId = rawInfo.lastInsertRowid as number;
      const cat = categorize(row);
      insertTxn.run(
        importId, rawId,
        row.txn_date,
        cat.txn_type,
        cat.category,
        cat.sub_category,
        row.description,
        row.amount_fen,
        row.counterparty || null,
        row.reference_no || null,
        cat.auto_categorized ? 1 : 0
      );
    }

    return importId;
  });

  const importId = doInsert();
  rebuildBalanceSnapshots();

  res.json({
    import_id: importId,
    row_count: result.rows.length,
    error_count: result.errors.length,
    errors: result.errors.slice(0, 20),
  });
});

// GET /api/upload/imports — list import history
router.get('/imports', (_req: Request, res: Response) => {
  const imports = db.prepare(
    `SELECT * FROM imports ORDER BY uploaded_at DESC LIMIT 50`
  ).all();
  res.json(imports);
});

export default router;
