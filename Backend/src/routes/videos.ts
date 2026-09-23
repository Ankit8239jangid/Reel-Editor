import { Router, Request, Response, type IRouter } from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { uploadVideo } from '../middleware/upload';
import { createVideo, getAllVideos, getVideoById, deleteVideo } from '../database/db';
import { getVideoDuration, generateThumbnail } from '../services/ffmpeg.service';
import { Video } from '../types';

const router: IRouter = Router();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// GET /api/videos — List all videos
router.get('/', (_req: Request, res: Response) => {
  try {
    const videos = getAllVideos();
    res.json({ success: true, data: videos });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/videos/:id — Get single video
router.get('/:id', (req: Request, res: Response) => {
  try {
    const video = getVideoById(req.params.id as string);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }
    res.json({ success: true, data: video });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/videos — Upload video
router.post('/', uploadVideo.single('video'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No video file uploaded' });
    }

    const filePath = req.file.path;
    const duration = await getVideoDuration(filePath);
    const thumbnailDir = path.join(UPLOAD_DIR, 'videos');
    const thumbnail = await generateThumbnail(filePath, thumbnailDir);

    const video: Video = {
      id: uuidv4(),
      originalName: req.file.originalname,
      filename: req.file.filename,
      duration,
      thumbnail: thumbnail || undefined,
      createdAt: new Date().toISOString(),
    };

    createVideo(video);
    console.log(`📹 Video uploaded: ${video.originalName} (${video.id})`);
    res.status(201).json({ success: true, data: video });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/videos/:id — Delete video
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const video = getVideoById(req.params.id as string);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Delete the file
    const filePath = path.join(UPLOAD_DIR, 'videos', video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete thumbnail if exists
    if (video.thumbnail) {
      const thumbPath = path.join(UPLOAD_DIR, 'videos', video.thumbnail);
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    deleteVideo(video.id);
    console.log(`🗑️ Video deleted: ${video.id}`);
    res.json({ success: true, data: { id: video.id } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
