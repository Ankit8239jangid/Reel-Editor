import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { updateRender } from '../database/db';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export interface RenderOptions {
  renderId: string;
  videoPath: string;
  templatePath: string;
}

/**
 * Get video duration using ffprobe
 */
export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath,
    ]);

    let output = '';
    let errorOutput = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? 0 : duration);
      } else {
        console.warn(`ffprobe warning: ${errorOutput}`);
        resolve(0); // Return 0 if ffprobe fails instead of rejecting
      }
    });

    ffprobe.on('error', () => {
      console.warn('ffprobe not found, skipping duration detection');
      resolve(0);
    });
  });
}

/**
 * Generate a thumbnail from a video file
 */
export function generateThumbnail(videoPath: string, outputDir: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const thumbnailName = `thumb_${uuidv4()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailName);

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i', videoPath,
      '-ss', '00:00:01',
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-q:v', '5',
      thumbnailPath,
    ]);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(thumbnailPath)) {
        resolve(thumbnailName);
      } else {
        console.warn(`Thumbnail generation failed: ${errorOutput}`);
        resolve(''); // Return empty string if thumbnail fails
      }
    });

    ffmpeg.on('error', () => {
      console.warn('ffmpeg not found, skipping thumbnail generation');
      resolve('');
    });
  });
}

/**
 * Render the final reel by chromakeying the template onto the main video.
 * This is the core FFmpeg pipeline from the PRD.
 */
export function renderReel(options: RenderOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const { renderId, videoPath, templatePath } = options;
    const rendersDir = path.join(UPLOAD_DIR, 'renders');

    if (!fs.existsSync(rendersDir)) {
      fs.mkdirSync(rendersDir, { recursive: true });
    }

    const outputFilename = `render_${renderId}.mp4`;
    const outputPath = path.join(rendersDir, outputFilename);

    updateRender(renderId, { status: 'processing', progress: 0 });

    // Clean & robust filter matching EDITOR.js reference
    const filterComplex = [
      // 1. Main video → scale + pad + soft vignette
      '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,',
      'vignette=PI/2.6:aspect=0.55[base];',

      // 2. Template → scale, pad, setsar=1, THEN chromakey (exactly like EDITOR.js)
      '[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1,',
      'chromakey=0x00FF00:0.28:0.08[gs];',

      // 3. Overlay
      '[base][gs]overlay=0:0:format=auto[outv]'
    ].join('');

    const args = [
      '-y',
      '-i', videoPath,
      '-i', templatePath,
      '-filter_complex', filterComplex,
      '-map', '[outv]',
      '-map', '1:a?',                 // template audio
      '-c:v', 'libx264',
      '-preset', 'medium',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      '-shortest',
      outputPath,
    ];

    console.log(`🎬 Starting render: ${renderId}`);
    console.log(`   Video: ${videoPath}`);
    console.log(`   Template: ${templatePath}`);
    console.log(`   Output: ${outputPath}`);

    const ffmpeg = spawn('ffmpeg', args);

    let stderrData = '';
    let totalDuration = 0;

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();
      stderrData += output;

      // Duration
      const durationMatch = output.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (durationMatch && totalDuration === 0) {
        const hours = parseInt(durationMatch[1]);
        const minutes = parseInt(durationMatch[2]);
        const seconds = parseInt(durationMatch[3]);
        const centiseconds = parseInt(durationMatch[4]);
        totalDuration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
      }

      // Progress
      const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
      if (timeMatch && totalDuration > 0) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);
        const centiseconds = parseInt(timeMatch[4]);
        const currentTime = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;
        const progress = Math.min(Math.round((currentTime / totalDuration) * 100), 99);
        updateRender(renderId, { status: 'processing', progress });
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`✅ Render completed: ${renderId}`);
        updateRender(renderId, {
          status: 'completed',
          progress: 100,
          outputFilename,
          completedAt: new Date().toISOString(),
        });
        resolve(outputFilename);
      } else {
        const errorMsg = `FFmpeg exited with code ${code}. ${stderrData.slice(-600)}`;
        console.error(`❌ Render failed: ${renderId}`, errorMsg);
        updateRender(renderId, {
          status: 'failed',
          error: errorMsg,
          completedAt: new Date().toISOString(),
        });
        reject(new Error(errorMsg));
      }
    });

    ffmpeg.on('error', (err) => {
      const errorMsg = `FFmpeg process error: ${err.message}`;
      console.error(`❌ Render error: ${renderId}`, errorMsg);
      updateRender(renderId, {
        status: 'failed',
        error: errorMsg,
        completedAt: new Date().toISOString(),
      });
      reject(new Error(errorMsg));
    });
  });
}
