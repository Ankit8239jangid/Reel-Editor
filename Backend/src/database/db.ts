import fs from 'fs';
import path from 'path';
import { Video, Template, Render } from '../types';

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'store.json');

interface StoreData {
  videos: Video[];
  templates: Template[];
  renders: Render[];
}

let store: StoreData = {
  videos: [],
  templates: [],
  renders: []
};

export function initDatabase(): void {
  const dataDir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(STORE_PATH)) {
    try {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      store = JSON.parse(data);
      console.log('📦 In-memory database loaded from store.json');
    } catch (err) {
      console.error('Failed to parse store.json. Initializing empty store.', err);
    }
  } else {
    saveStore();
    console.log('📦 Created new in-memory database at store.json');
  }
}

function saveStore(): void {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('Failed to save store.json', err);
  }
}

// ─── Video CRUD ──────────────────────────────────────────────────────────────

export function createVideo(video: Video): Video {
  store.videos.unshift(video);
  saveStore();
  return video;
}

export function getAllVideos(): Video[] {
  return [...store.videos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getVideoById(id: string): Video | undefined {
  return store.videos.find(v => v.id === id);
}

export function deleteVideo(id: string): boolean {
  const initialLength = store.videos.length;
  store.videos = store.videos.filter(v => v.id !== id);
  if (store.videos.length < initialLength) {
    saveStore();
    return true;
  }
  return false;
}

// ─── Template CRUD ───────────────────────────────────────────────────────────

export function createTemplate(template: Template): Template {
  store.templates.unshift(template);
  saveStore();
  return template;
}

export function getAllTemplates(): Template[] {
  return [...store.templates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getTemplateById(id: string): Template | undefined {
  return store.templates.find(t => t.id === id);
}

export function deleteTemplate(id: string): boolean {
  const initialLength = store.templates.length;
  store.templates = store.templates.filter(t => t.id !== id);
  if (store.templates.length < initialLength) {
    saveStore();
    return true;
  }
  return false;
}

// ─── Render CRUD ─────────────────────────────────────────────────────────────

export function createRender(render: Render): Render {
  store.renders.unshift(render);
  saveStore();
  return render;
}

export function getAllRenders(): Render[] {
  return [...store.renders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getRenderById(id: string): Render | undefined {
  return store.renders.find(r => r.id === id);
}

export function updateRender(id: string, updates: Partial<Render>): boolean {
  const index = store.renders.findIndex(r => r.id === id);
  if (index === -1) return false;

  store.renders[index] = { ...store.renders[index], ...updates };
  saveStore();
  return true;
}

export function deleteRender(id: string): boolean {
  const initialLength = store.renders.length;
  store.renders = store.renders.filter(r => r.id !== id);
  if (store.renders.length < initialLength) {
    saveStore();
    return true;
  }
  return false;
}
