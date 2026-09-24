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
  duration: number;
  isSlideTemplate?: boolean;
  slideImages?: string[];
  slideDurations?: number[];
  slideMutes?: boolean[];
}

/**
 * Get video duration using ffprobe
 */
export function getVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'csv=p=0',
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
        resolve(0);
      }
    });

    ffprobe.on('error', () => {
      console.warn('ffprobe not found, skipping duration detection');
      resolve(0);
    });
  });
}

/**
 * Check if media has an audio stream
 */
export function hasAudio(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type',
      '-of',
      'csv=p=0',
      '-select_streams',
      'a',
      filePath,
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', () => {
      resolve(output.trim().includes('audio'));
    });

    ffprobe.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check if media contains a video stream.
 *
 * This is used to distinguish:
 *   - image → needs frame looping
 *   - video → must keep original video frames
 */
export function isVideoFile(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_type',
      '-of',
      'csv=p=0',
      filePath,
    ]);

    let output = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        resolve(output.trim() === 'video');
      } else {
        resolve(false);
      }
    });

    ffprobe.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Generate a thumbnail from a video file
 */
export function generateThumbnail(
  videoPath: string,
  outputDir: string
): Promise<string> {
  return new Promise((resolve) => {
    const thumbnailName = `thumb_${uuidv4()}.jpg`;
    const thumbnailPath = path.join(outputDir, thumbnailName);

    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i',
      videoPath,
      '-ss',
      '00:00:01',
      '-vframes',
      '1',
      '-vf',
      'scale=320:-1',
      '-q:v',
      '5',
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
        console.warn(
          `Thumbnail generation failed: ${errorOutput}`
        );

        resolve('');
      }
    });

    ffmpeg.on('error', () => {
      console.warn(
        'ffmpeg not found, skipping thumbnail generation'
      );

      resolve('');
    });
  });
}

/**
 * Create slide base video.
 *
 * Supported media:
 *
 * IMAGE
 *   → converted to a fixed-duration video
 *   → silent
 *
 * VIDEO + muted=true
 *   → video frames continue playing
 *   → original audio removed
 *
 * VIDEO + muted=false
 *   → video frames continue playing
 *   → original audio retained
 *
 * IMPORTANT:
 * We DO NOT apply the `loop` filter to actual videos.
 * The loop filter is only used for static images.
 */
export async function createSlideBaseVideo(
  images: string[],
  durations: number[],
  slideMutes: boolean[] | undefined,
  outputPath: string
): Promise<void> {
  if (!images.length) {
    throw new Error('No slide images provided');
  }

  if (images.length !== durations.length) {
    throw new Error(
      `Images count (${images.length}) does not match durations count (${durations.length})`
    );
  }

  // Detect media type + audio for every uploaded file.
  const [videoInputs, audioInputs] = await Promise.all([
    Promise.all(
      images.map((img) => isVideoFile(img))
    ),
    Promise.all(
      images.map((img) => hasAudio(img))
    ),
  ]);

  return new Promise((resolve, reject) => {
    const args: string[] = ['-y'];

    // ---------------------------------------------------------
    // INPUTS
    // ---------------------------------------------------------

    images.forEach((img) => {
      args.push('-i', img);
    });

    const filters: string[] = [];

    // IMPORTANT:
    //
    // concat requires:
    //
    // [v0][a0][v1][a1][v2][a2]
    //
    // NOT:
    //
    // [v0][v1][v2][a0][a1][a2]
    //
    let concatInputs = '';

    images.forEach((_, index) => {
      const duration = Number(durations[index]);

      if (!Number.isFinite(duration) || duration <= 0) {
        reject(
          new Error(
            `Invalid duration for slide ${index + 1}: ${duration}`
          )
        );

        return;
      }

      const isVideo = videoInputs[index];
      const hasSnd = audioInputs[index];
      const muted = slideMutes?.[index] ?? false;

      // -------------------------------------------------------
      // VIDEO PROCESSING
      // -------------------------------------------------------

      if (isVideo) {
        /**
         * ACTUAL VIDEO
         *
         * Do NOT use:
         *
         * loop=loop=-1:size=1:start=0
         *
         * because that would repeat a single frame and make
         * the uploaded video appear frozen.
         */
        filters.push(
          `[${index}:v]` +
            `scale=1080:1920:force_original_aspect_ratio=decrease,` +
            `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,` +
            `setsar=1,` +
            `fps=30,` +
            `trim=duration=${duration},` +
            `setpts=PTS-STARTPTS` +
            `[v${index}]`
        );
      } else {
        /**
         * STATIC IMAGE
         *
         * An image contains only one frame, so we need to
         * repeat that frame for the requested duration.
         */
        filters.push(
          `[${index}:v]` +
            `scale=1080:1920:force_original_aspect_ratio=decrease,` +
            `pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,` +
            `setsar=1,` +
            `fps=30,` +
            `loop=loop=-1:size=1:start=0,` +
            `trim=duration=${duration},` +
            `setpts=PTS-STARTPTS` +
            `[v${index}]`
        );
      }

      // -------------------------------------------------------
      // AUDIO PROCESSING
      // -------------------------------------------------------

      /**
       * VIDEO WITH AUDIO + NOT MUTED
       *
       * Keep original audio.
       */
      if (isVideo && hasSnd && !muted) {
        filters.push(
          `[${index}:a]` +
            `atrim=duration=${duration},` +
            `apad,` +
            `asetpts=PTS-STARTPTS,` +
            `atrim=duration=${duration}` +
            `[a${index}]`
        );
      } else {
        /**
         * Everything else is silent:
         *
         * - image
         * - video without audio
         * - video + muted=true
         */
        filters.push(
          `anullsrc=` +
            `channel_layout=stereo:` +
            `sample_rate=44100:` +
            `duration=${duration}` +
            `[a${index}]`
        );
      }

      // -------------------------------------------------------
      // CONCAT INPUTS
      // -------------------------------------------------------

      concatInputs += `[v${index}][a${index}]`;

      console.log(
        `Slide ${index + 1}:`,
        {
          file: images[index],
          type: isVideo ? 'VIDEO' : 'IMAGE',
          duration,
          hasAudio: hasSnd,
          muted,
          finalAudio: isVideo && hasSnd && !muted,
        }
      );
    });

    // ---------------------------------------------------------
    // CONCAT
    // ---------------------------------------------------------

    filters.push(
      `${concatInputs}` +
        `concat=` +
        `n=${images.length}:` +
        `v=1:` +
        `a=1` +
        `[outv][outa]`
    );

    const filterComplex = filters.join(';');

    // ---------------------------------------------------------
    // OUTPUT
    // ---------------------------------------------------------

    args.push(
      '-filter_complex',
      filterComplex,

      '-map',
      '[outv]',

      '-map',
      '[outa]',

      '-c:v',
      'libx264',

      '-preset',
      'fast',

      '-crf',
      '23',

      '-pix_fmt',
      'yuv420p',

      '-r',
      '30',

      '-c:a',
      'aac',

      '-b:a',
      '128k',

      '-ar',
      '44100',

      '-ac',
      '2',

      '-movflags',
      '+faststart',

      outputPath
    );

    console.log('\n========================================');
    console.log('🎞 Creating slide base video');
    console.log('========================================');
    console.log(`Slides: ${images.length}`);
    console.log(`Durations: ${durations.join(', ')}`);
    console.log(
      `Video inputs: ${videoInputs.join(', ')}`
    );
    console.log(
      `Audio inputs: ${audioInputs.join(', ')}`
    );
    console.log(
      `Mute states: ${(slideMutes ?? []).join(', ')}`
    );

    console.log('\n🔧 Filter graph:\n');
    console.log(filterComplex);

    const ffmpeg = spawn('ffmpeg', args);

    let errorOutput = '';

    ffmpeg.stderr.on('data', (data) => {
      const output = data.toString();

      errorOutput += output;

      process.stdout.write(output);
    });

    ffmpeg.on('error', (error) => {
      reject(
        new Error(
          `FFmpeg process error: ${error.message}`
        )
      );
    });

    ffmpeg.on('close', (code) => {
      if (
        code === 0 &&
        fs.existsSync(outputPath)
      ) {
        console.log(
          `\n✅ Slide base video created: ${outputPath}`
        );

        resolve();
        return;
      }

      reject(
        new Error(
          `Failed to create slide video. ` +
            `FFmpeg exited with code ${code}.\n\n` +
            errorOutput.slice(-5000)
        )
      );
    });
  });
}

/**
 * Render the final reel by chromakeying the template
 * onto the main video.
 */
export function renderReel(
  options: RenderOptions
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    let {
      renderId,
      videoPath,
      templatePath,
      duration,
      isSlideTemplate,
      slideImages,
      slideDurations,
      slideMutes,
    } = options;

    const rendersDir = path.join(
      UPLOAD_DIR,
      'renders'
    );

    if (!fs.existsSync(rendersDir)) {
      fs.mkdirSync(rendersDir, {
        recursive: true,
      });
    }

    const outputFilename =
      `render_${renderId}.mp4`;

    const outputPath = path.join(
      rendersDir,
      outputFilename
    );

    let tempVideoPath = '';

    updateRender(renderId, {
      status: 'processing',
      progress: 0,
    });

    try {
      // -------------------------------------------------------
      // SLIDE TEMPLATE
      // -------------------------------------------------------

      if (
        isSlideTemplate &&
        slideImages &&
        slideDurations
      ) {
        tempVideoPath = path.join(
          rendersDir,
          `temp_slides_${renderId}.mp4`
        );

        const fullImagePaths =
          slideImages.map((img) =>
            path.join(
              UPLOAD_DIR,
              'images',
              img
            )
          );

        await createSlideBaseVideo(
          fullImagePaths,
          slideDurations,
          slideMutes,
          tempVideoPath
        );

        videoPath = tempVideoPath;
      }
    } catch (err: any) {
      updateRender(renderId, {
        status: 'failed',
        error: err.message,
      });

      return reject(err);
    }

    // ---------------------------------------------------------
    // AUDIO DETECTION
    // ---------------------------------------------------------

    const mainHasAudio =
      await hasAudio(videoPath);

    const templateHasAudio =
      await hasAudio(templatePath);

    // ---------------------------------------------------------
    // FILTER GRAPH
    // ---------------------------------------------------------

    const filterComplexArray = [
      // Main video
      '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,',
      'vignette=PI/2.6:aspect=0.55[base];',

      // Green-screen template
      '[1:v]scale=1080:1920:force_original_aspect_ratio=decrease,',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,',
      'setsar=1,',
      'chromakey=0x00FF00:0.28:0.08[gs];',

      // Overlay
      '[base][gs]overlay=0:0:format=auto[outv]',
    ];

    // ---------------------------------------------------------
    // AUDIO MIXING
    // ---------------------------------------------------------

    let audioMapArgs: string[] = [];

    if (
      mainHasAudio &&
      templateHasAudio
    ) {
      filterComplexArray.push(
        ';',
        '[0:a][1:a]' +
          'amix=' +
          'inputs=2:' +
          'duration=longest:' +
          'dropout_transition=2:' +
          'normalize=0' +
          '[aout]'
      );

      audioMapArgs = [
        '-map',
        '[aout]',
      ];
    } else if (mainHasAudio) {
      audioMapArgs = [
        '-map',
        '0:a',
      ];
    } else if (templateHasAudio) {
      audioMapArgs = [
        '-map',
        '1:a',
      ];
    }

    const filterComplex =
      filterComplexArray.join('');

    // ---------------------------------------------------------
    // FINAL FFMPEG COMMAND
    // ---------------------------------------------------------

    const args = [
      '-y',

      '-i',
      videoPath,

      '-i',
      templatePath,

      '-filter_complex',
      filterComplex,

      '-map',
      '[outv]',

      ...audioMapArgs,

      '-c:v',
      'libx264',

      '-preset',
      'medium',

      '-crf',
      '23',

      '-pix_fmt',
      'yuv420p',

      '-c:a',
      'aac',

      '-b:a',
      '128k',

      '-movflags',
      '+faststart',

      '-t',
      String(duration),

      outputPath,
    ];

    console.log(
      `🎬 Starting render: ${renderId}`
    );

    console.log(
      `   Video: ${videoPath}`
    );

    console.log(
      `   Template: ${templatePath}`
    );

    console.log(
      `   Output: ${outputPath}`
    );

    const ffmpeg = spawn(
      'ffmpeg',
      args
    );

    let stderrData = '';
    let totalDuration = 0;

    ffmpeg.stderr.on(
      'data',
      (data) => {
        const output =
          data.toString();

        stderrData += output;

        // -----------------------------------------------------
        // Duration
        // -----------------------------------------------------

        const durationMatch =
          output.match(
            /Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2})/
          );

        if (
          durationMatch &&
          totalDuration === 0
        ) {
          const hours =
            parseInt(durationMatch[1]);

          const minutes =
            parseInt(durationMatch[2]);

          const seconds =
            parseInt(durationMatch[3]);

          const centiseconds =
            parseInt(durationMatch[4]);

          totalDuration =
            hours * 3600 +
            minutes * 60 +
            seconds +
            centiseconds / 100;
        }

        // -----------------------------------------------------
        // Progress
        // -----------------------------------------------------

        const timeMatch =
          output.match(
            /time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/
          );

        if (
          timeMatch &&
          totalDuration > 0
        ) {
          const hours =
            parseInt(timeMatch[1]);

          const minutes =
            parseInt(timeMatch[2]);

          const seconds =
            parseInt(timeMatch[3]);

          const centiseconds =
            parseInt(timeMatch[4]);

          const currentTime =
            hours * 3600 +
            minutes * 60 +
            seconds +
            centiseconds / 100;

          const progress =
            Math.min(
              Math.round(
                (currentTime /
                  totalDuration) *
                  100
              ),
              99
            );

          updateRender(
            renderId,
            {
              status: 'processing',
              progress,
            }
          );
        }
      }
    );

    ffmpeg.on(
      'close',
      (code) => {
        // -----------------------------------------------------
        // Cleanup temporary slide video
        // -----------------------------------------------------

        if (
          tempVideoPath &&
          fs.existsSync(tempVideoPath)
        ) {
          try {
            fs.unlinkSync(
              tempVideoPath
            );
          } catch (e) {}
        }

        // -----------------------------------------------------
        // Success
        // -----------------------------------------------------

        if (
          code === 0 &&
          fs.existsSync(outputPath)
        ) {
          console.log(
            `✅ Render completed: ${renderId}`
          );

          updateRender(
            renderId,
            {
              status: 'completed',
              progress: 100,
              outputFilename,
              completedAt:
                new Date().toISOString(),
            }
          );

          resolve(outputFilename);
        } else {
          // ---------------------------------------------------
          // Failure
          // ---------------------------------------------------

          const errorMsg =
            `FFmpeg exited with code ${code}. ` +
            stderrData.slice(-2000);

          console.error(
            `❌ Render failed: ${renderId}`,
            errorMsg
          );

          updateRender(
            renderId,
            {
              status: 'failed',
              error: errorMsg,
              completedAt:
                new Date().toISOString(),
            }
          );

          reject(
            new Error(errorMsg)
          );
        }
      }
    );

    ffmpeg.on(
      'error',
      (err) => {
        if (
          tempVideoPath &&
          fs.existsSync(tempVideoPath)
        ) {
          try {
            fs.unlinkSync(
              tempVideoPath
            );
          } catch (e) {}
        }

        const errorMsg =
          `FFmpeg process error: ${err.message}`;

        console.error(
          `❌ FFmpeg process error: ${renderId}`,
          errorMsg
        );

        updateRender(
          renderId,
          {
            status: 'failed',
            error: errorMsg,
            completedAt:
              new Date().toISOString(),
          }
        );

        reject(
          new Error(errorMsg)
        );
      }
    );
  });
}