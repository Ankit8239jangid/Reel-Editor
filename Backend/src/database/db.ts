import Database from 'better-sqlite3';
import path from 'path';
import { Video, Template, Render } from '../types';

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'database.sqlite');

let db: Database.Database;

export function initDatabase(): void {
  const fs = require('fs');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      originalName TEXT NOT NULL,
      filename TEXT NOT NULL,
      duration REAL DEFAULT 0,
      thumbnail TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      duration REAL DEFAULT 0,
      thumbnail TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS renders (
      id TEXT PRIMARY KEY,
      videoId TEXT NOT NULL,
      templateId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      progress REAL DEFAULT 0,
      outputFilename TEXT,
      error TEXT,
      createdAt TEXT NOT NULL,
      completedAt TEXT,
      FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (templateId) REFERENCES templates(id) ON DELETE CASCADE
    );
  `);

  console.log('📦 Database initialized successfully');
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// ─── Video CRUD ──────────────────────────────────────────────────────────────

export function createVideo(video: Video): Video {
  const stmt = getDb().prepare(`
    INSERT INTO videos (id, originalName, filename, duration, thumbnail, createdAt)
    VALUES (@id, @originalName, @filename, @duration, @thumbnail, @createdAt)
  `);
  stmt.run(video);
  return video;
}

export function getAllVideos(): Video[] {
  return getDb().prepare('SELECT * FROM videos ORDER BY createdAt DESC').all() as Video[];
}

export function getVideoById(id: string): Video | undefined {
  return getDb().prepare('SELECT * FROM videos WHERE id = ?').get(id) as Video | undefined;
}

export function deleteVideo(id: string): boolean {
  const result = getDb().prepare('DELETE FROM videos WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

export function createTemplate(template: Template): Template {
  const stmt = getDb().prepare(`
    INSERT INTO templates (id, name, filename, duration, thumbnail, createdAt)
    VALUES (@id, @name, @filename, @duration, @thumbnail, @createdAt)
  `);
  stmt.run(template);
  return template;
}

export function getAllTemplates(): Template[] {
  return getDb().prepare('SELECT * FROM templates ORDER BY createdAt DESC').all() as Template[];
}

export function getTemplateById(id: string): Template | undefined {
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id) as Template | undefined;
}

export function deleteTemplate(id: string): boolean {
  const result = getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
  return result.changes > 0;
}

// ─── Render CRUD ─────────────────────────────────────────────────────────────

export function createRender(render: Render): Render {
  const stmt = getDb().prepare(`
    INSERT INTO renders (id, videoId, templateId, status, progress, outputFilename, error, createdAt, completedAt)
    VALUES (@id, @videoId, @templateId, @status, @progress, @outputFilename, @error, @createdAt, @completedAt)
  `);
  stmt.run({
    ...render,
    progress: render.progress ?? 0,
    outputFilename: render.outputFilename ?? null,
    error: render.error ?? null,
    completedAt: render.completedAt ?? null,
  });
  return render;
}

export function getAllRenders(): Render[] {
  return getDb().prepare('SELECT * FROM renders ORDER BY createdAt DESC').all() as Render[];
}

export function getRenderById(id: string): Render | undefined {
  return getDb().prepare('SELECT * FROM renders WHERE id = ?').get(id) as Render | undefined;
}

export function updateRender(id: string, updates: Partial<Render>): boolean {
  const current = getRenderById(id);
  if (!current) return false;

  const merged = { ...current, ...updates };
  const stmt = getDb().prepare(`
    UPDATE renders
    SET status = @status,
        progress = @progress,
        outputFilename = @outputFilename,
        error = @error,
        completedAt = @completedAt
    WHERE id = @id
  `);
  const result = stmt.run({
    id,
    status: merged.status,
    progress: merged.progress ?? 0,
    outputFilename: merged.outputFilename ?? null,
    error: merged.error ?? null,
    completedAt: merged.completedAt ?? null,
  });
  return result.changes > 0;
}

export function deleteRender(id: string): boolean {
  const result = getDb().prepare('DELETE FROM renders WHERE id = ?').run(id);
  return result.changes > 0;
}
