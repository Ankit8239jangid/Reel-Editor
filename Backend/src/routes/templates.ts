import { Router, Request, Response, type IRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { uploadTemplate } from '../middleware/upload';
import { createTemplate, getAllTemplates, getTemplateById, deleteTemplate, updateTemplate } from '../database/db';
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

    const templateId = uuidv4();
    const templateDir = path.join(UPLOAD_DIR, 'templates', templateId);
    
    // Create the dedicated folder
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }

    // Move the uploaded file into the new folder
    const ext = path.extname(req.file.originalname);
    const newFileName = `template${ext}`;
    const newFilePath = path.join(templateDir, newFileName);
    fs.renameSync(req.file.path, newFilePath);

    const duration = await getVideoDuration(newFilePath);
    
    // Generate thumbnail inside the folder
    const thumbnail = await generateThumbnail(newFilePath, templateDir);

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
      id: templateId,
      name: req.body.name || path.parse(req.file.originalname).name,
      filename: `${templateId}/${newFileName}`,
      duration,
      thumbnail: thumbnail ? `${templateId}/${thumbnail}` : undefined,
      createdAt: new Date().toISOString(),
      isSlideTemplate,
      slideDurations,
      mediaSlots,
      previewVideo: req.body.previewVideo || undefined,
    };

    createTemplate(template);
    console.log(`🎬 Template uploaded: ${template.name} (${template.id})`);
    res.status(201).json({ success: true, data: template });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/templates/:id — Update template (e.g. slots)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const template = getTemplateById(req.params.id as string);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const updates: Partial<Template> = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.isSlideTemplate !== undefined) updates.isSlideTemplate = req.body.isSlideTemplate;
    if (req.body.slideDurations !== undefined) updates.slideDurations = req.body.slideDurations;
    if (req.body.mediaSlots !== undefined) updates.mediaSlots = req.body.mediaSlots;
    if (req.body.previewVideo !== undefined) updates.previewVideo = req.body.previewVideo;

    updateTemplate(template.id, updates);
    res.json({ success: true, data: { ...template, ...updates } });
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

    // Delete the entire folder
    const templateDir = path.join(UPLOAD_DIR, 'templates', template.id);
    if (fs.existsSync(templateDir)) {
      fs.rmSync(templateDir, { recursive: true, force: true });
    }

    deleteTemplate(template.id);
    console.log(`🗑️ Template deleted: ${template.id}`);
    res.json({ success: true, data: { id: template.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
