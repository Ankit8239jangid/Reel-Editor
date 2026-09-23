import { Router, Request, Response, type IRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { uploadTemplate } from '../middleware/upload';
import { createTemplate, getAllTemplates, getTemplateById, deleteTemplate } from '../database/db';
import { getVideoDuration, generateThumbnail } from '../services/ffmpeg.service';
import { Template } from '../types';

const router: IRouter = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// GET /api/templates — List all templates
router.get('/', (_req: Request, res: Response) => {
  try {
    const templates = getAllTemplates();
    res.json({ success: true, data: templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/templates/:id — Get single template
router.get('/:id', (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id as string);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    res.json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/templates — Upload template
router.post('/', uploadTemplate.single('template'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No template file uploaded' });
    }

    const filePath = req.file.path;
    const duration = await getVideoDuration(filePath);
    const thumbnailDir = path.join(UPLOAD_DIR, 'templates');
    const thumbnail = await generateThumbnail(filePath, thumbnailDir);

    const template: Template = {
      id: uuidv4(),
      name: req.body.name || path.parse(req.file.originalname).name,
      filename: req.file.filename,
      duration,
      thumbnail: thumbnail || undefined,
      createdAt: new Date().toISOString(),
    };

    createTemplate(template);
    console.log(`🎬 Template uploaded: ${template.name} (${template.id})`);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/templates/:id — Delete template
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id as string);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    // Delete the file
    const filePath = path.join(UPLOAD_DIR, 'templates', template.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete thumbnail
    if (template.thumbnail) {
      const thumbPath = path.join(UPLOAD_DIR, 'templates', template.thumbnail);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    deleteTemplate(template.id);
    console.log(`🗑️ Template deleted: ${template.id}`);
    res.json({ success: true, data: { id: template.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
