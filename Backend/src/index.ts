import express, { type Application } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase } from './database/db';
import videosRouter from './routes/videos';
import templatesRouter from './routes/templates';
import rendersRouter from './routes/renders';
import imagesRouter from './routes/images';

const app: Application = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// ─── Ensure upload directories exist ─────────────────────────────────────────
const dirs = [
  path.join(UPLOAD_DIR, 'videos'),
  path.join(UPLOAD_DIR, 'templates'),
  path.join(UPLOAD_DIR, 'renders'),
  path.join(UPLOAD_DIR, 'images'),
];

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files (serve uploaded files) ──────────────────────────────────────
app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/videos', videosRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/renders', rendersRouter);
app.use('/api/images', imagesRouter);

// ─── Health check ────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── Error handling middleware ────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File too large. Maximum size is 500MB.',
    });
  }

  if (err instanceof Error && err.message.includes('Only video files')) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

// ─── Initialize & Start ──────────────────────────────────────────────────────
initDatabase();

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   🎬 Vibe Editor Backend                    ║
  ║   Running on: http://localhost:${PORT}         ║
  ║   Uploads:    ${path.resolve(UPLOAD_DIR).padEnd(27)}║
  ╚══════════════════════════════════════════════╝
  `);
});

export default app;
