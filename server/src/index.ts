import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initSchema } from './db/schema';
import uploadRouter from './routes/upload';
import expensesRouter from './routes/expenses';
import collectionsRouter from './routes/collections';
import balanceRouter from './routes/balance';
import rulesRouter from './routes/rules';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());

// Initialize DB schema
initSchema();

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/collections', collectionsRouter);
app.use('/api/balance', balanceRouter);
app.use('/api/rules', rulesRouter);

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Serve frontend static files
const clientDist = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
