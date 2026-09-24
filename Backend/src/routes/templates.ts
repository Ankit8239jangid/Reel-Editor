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

    // Parse media slots (new system)
    let mediaSlots: any[] | undefined = undefined;
    let isSlideTemplate = false;
    let slideDurations: number[] | undefined = undefined;

    if (req.body.mediaSlots) {
      try {
        mediaSlots = JSON.parse(req.body.mediaSlots);
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Invalid mediaSlots JSON' });
      }

      // Validate slots
      if (!Array.isArray(mediaSlots) || mediaSlots.length === 0) {
        return res.status(400).json({ success: false, error: 'mediaSlots must be a non-empty array' });
      }

      for (const slot of mediaSlots) {
        if (slot.startTime < 0) {
          return res.status(400).json({ success: false, error: `Slot "${slot.slotId}": startTime cannot be negative` });
        }
        if (slot.endTime <= slot.startTime) {
          return res.status(400).json({ success: false, error: `Slot "${slot.slotId}": endTime must be after startTime` });
        }
        if (slot.duration <= 0) {
          return res.status(400).json({ success: false, error: `Slot "${slot.slotId}": duration must be positive` });
        }
        if (!['image', 'video', 'image_or_video'].includes(slot.mediaType)) {
          return res.status(400).json({ success: false, error: `Slot "${slot.slotId}": invalid mediaType "${slot.mediaType}"` });
        }
      }

      // Check for overlapping slots
      const sorted = [...mediaSlots].sort((a, b) => a.startTime - b.startTime);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].startTime < sorted[i - 1].endTime) {
          return res.status(400).json({ success: false, error: `Slots "${sorted[i - 1].slotId}" and "${sorted[i].slotId}" overlap` });
        }
      }

      // Derive legacy fields for backward compat
      isSlideTemplate = true;
      slideDurations = mediaSlots.sort((a, b) => a.order - b.order).map(s => s.duration);
    } else {
      // Legacy: check old-style isSlideTemplate/slideDurations
      isSlideTemplate = req.body.isSlideTemplate === 'true';
      if (isSlideTemplate && req.body.slideDurations) {
        try {
          slideDurations = JSON.parse(req.body.slideDurations);
        } catch (e) {
          console.warn('Failed to parse slideDurations', e);
        }
      }
    }

    const template: Template = {
      id: uuidv4(),
      name: req.body.name || path.parse(req.file.originalname).name,
      filename: req.file.filename,
      duration,
      thumbnail: thumbnail || undefined,
      createdAt: new Date().toISOString(),
      isSlideTemplate,
      slideDurations,
      mediaSlots,
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
