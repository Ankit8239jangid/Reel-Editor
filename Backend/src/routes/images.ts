import { Router, Request, Response, type IRouter } from 'express';
import { uploadImage } from '../middleware/upload';

const router: IRouter = Router();

// POST /api/images — Upload a single image
router.post('/', uploadImage.single('image'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }

    res.status(201).json({
      success: true,
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
