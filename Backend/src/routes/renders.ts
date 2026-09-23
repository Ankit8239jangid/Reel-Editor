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
    const { videoId, templateId } = req.body as RenderRequest;

    if (!videoId || !templateId) {
      return res.status(400).json({
        success: false,
        error: 'Both videoId and templateId are required',
      });
    }

    // Validate video exists
    const video = getVideoById(videoId);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Validate template exists
    const template = getTemplateById(templateId);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const renderId = uuidv4();
    const render: Render = {
      id: renderId,
      videoId,
      templateId,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    };

    createRender(render);
    console.log(`🚀 Render job created: ${renderId}`);

    // Start render asynchronously
    const videoPath = path.join(UPLOAD_DIR, 'videos', video.filename);
    const templatePath = path.join(UPLOAD_DIR, 'templates', template.filename);

    renderReel({
      renderId,
      videoPath,
      templatePath,
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
