import { Router, Request, Response, type IRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import {
  createRender,
  getAllRenders,
  getRenderById,
  deleteRender,
  getVideoById,
  getTemplateById,
} from '../database/db';
import { renderReel } from '../services/ffmpeg.service';
import { Render, RenderRequest } from '../types';

const router: IRouter = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// GET /api/renders — List all renders
router.get('/', (_req: Request, res: Response) => {
  try {
    const renders = getAllRenders();
    
    // Append downloadUrl to completed renders
    const augmentedRenders = renders.map(render => {
      const data: any = { ...render };
      if (render.status === 'completed' && render.outputFilename) {
        data.downloadUrl = `/uploads/renders/${render.outputFilename}`;
      }
      return data;
    });

    res.json({ success: true, data: augmentedRenders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/renders/:id — Get render status + download URL
router.get('/:id', (req: Request, res: Response) => {
  try {
    const render = getRenderById(req.params.id as string);
    if (!render) {
      return res.status(404).json({ success: false, error: 'Render not found' });
    }

    const data: any = { ...render };
    if (render.status === 'completed' && render.outputFilename) {
      data.downloadUrl = `/uploads/renders/${render.outputFilename}`;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/renders — Start a new render
router.post('/', async (req: Request, res: Response) => {
  try {
    const { videoId, templateId, slideImages } = req.body as RenderRequest;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'templateId is required',
      });
    }

    // Validate template exists
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    let videoPath = '';

    // Determine expected slot count from mediaSlots or legacy slideDurations
    const expectedSlotCount = template.mediaSlots?.length ?? template.slideDurations?.length ?? 0;
    
    if (template.isSlideTemplate && expectedSlotCount > 0) {
      if (!slideImages || slideImages.length !== expectedSlotCount) {
        return res.status(400).json({ success: false, error: `Exactly ${expectedSlotCount} media files are required for this template.` });
      }
    } else {
      if (!videoId) {
        return res.status(400).json({ success: false, error: 'videoId is required for this template.' });
      }
      const video = getVideoById(videoId);
      if (!video) {
        return res.status(404).json({ success: false, error: 'Video not found' });
      }
      videoPath = path.join(UPLOAD_DIR, 'videos', video.filename);
    }

    const renderId = uuidv4();
    const render: Render = {
      id: renderId,
      videoId: videoId || '',
      templateId,
      status: 'pending',
      progress: 0,
      slideImages,
      createdAt: new Date().toISOString(),
    };

    createRender(render);
    console.log(`🚀 Render job created: ${renderId}`);

    // Start render asynchronously
    const templatePath = path.join(UPLOAD_DIR, 'templates', template.filename);

    // Use mediaSlots durations if available, else fall back to legacy slideDurations
    const effectiveSlideDurations = template.mediaSlots
      ? template.mediaSlots.sort((a, b) => a.order - b.order).map(s => s.duration)
      : template.slideDurations;

    const effectiveSlideMutes = template.mediaSlots
      ? template.mediaSlots.sort((a, b) => a.order - b.order).map(s => s.muted ?? false)
      : undefined;

    renderReel({
      renderId,
      videoPath,
      templatePath,
      duration: template.duration,
      isSlideTemplate: template.isSlideTemplate,
      slideImages,
      slideDurations: effectiveSlideDurations,
      slideMutes: effectiveSlideMutes,
    }).catch((err) => {
      console.error(`Render ${renderId} failed:`, err.message);
    });

    // Return immediately with pending status
    res.status(202).json({ success: true, data: render });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/renders/:id — Delete render
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const render = getRenderById(req.params.id as string);
    if (!render) {
      return res.status(404).json({ success: false, error: 'Render not found' });
    }

    // Delete output file if exists
    if (render.outputFilename) {
      const filePath = path.join(UPLOAD_DIR, 'renders', render.outputFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    deleteRender(render.id);
    console.log(`🗑️ Render deleted: ${render.id}`);
    res.json({ success: true, data: { id: render.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
