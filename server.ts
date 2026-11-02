import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import multer from 'multer';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname);

const UPLOADS_DIR = path.join(ROOT, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max
});

interface RenderState {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  step: string;
  progress: number;
  logs: string[];
  outputFile: string | null;
  error: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

let currentRender: RenderState = {
  status: 'idle',
  step: '',
  progress: 0,
  logs: [],
  outputFile: fs.existsSync(path.join(ROOT, 'youtube_ready.mp4')) ? 'youtube_ready.mp4' : null,
  error: null,
  startedAt: null,
  completedAt: null,
};

const sseClients: Response[] = [];

function broadcastState() {
  const data = JSON.stringify(currentRender);
  sseClients.forEach((client) => {
    client.write(`data: ${data}\n\n`);
  });
}

function appendLog(line: string) {
  const cleanLine = line.trimEnd();
  if (!cleanLine) return;
  currentRender.logs.push(cleanLine);
  if (currentRender.logs.length > 500) {
    currentRender.logs.shift();
  }
  try {
    fs.appendFileSync(path.join(ROOT, 'render.log'), cleanLine + '\n', 'utf-8');
  } catch (err) {
    console.error('Failed to write to render.log', err);
  }
  broadcastState();
}

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    ffprobe.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    ffprobe.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        const val = parseFloat(stdout.trim());
        if (!isNaN(val)) {
          resolve(val);
          return;
        }
      }
      reject(new Error(`Failed to probe duration for ${filePath}: ${stderr || stdout}`));
    });

    ffprobe.on('error', (err) => {
      reject(err);
    });
  });
}

function probeMediaInfo(filePath: string): Promise<{ duration: number; width?: number; height?: number; format: string }> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration,format_name:stream=width,height,codec_type',
      '-of',
      'json',
      filePath,
    ]);

    let stdout = '';
    ffprobe.stdout.on('data', (d) => (stdout += d.toString()));
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdout);
          const duration = parseFloat(parsed.format?.duration || '0');
          const videoStream = parsed.streams?.find((s: any) => s.codec_type === 'video');
          resolve({
            duration: isNaN(duration) ? 0 : duration,
            width: videoStream?.width,
            height: videoStream?.height,
            format: parsed.format?.format_name || '',
          });
          return;
        } catch {
          // fallback
        }
      }
      resolve({ duration: 0, format: 'unknown' });
    });
    ffprobe.on('error', () => resolve({ duration: 0, format: 'unknown' }));
  });
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    appendLog(`$ ${cmd} ${args.join(' ')}`);
    const proc = spawn(cmd, args, { cwd: ROOT });

    proc.stdout.on('data', (data) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) appendLog(line);
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString('utf-8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.trim()) appendLog(line);
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Process ${cmd} exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

function escapeFilterValue(val: string): string {
  return val.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

function getFontPath(bold = false): string {
  const fontName = bold ? 'NotoSans-Bold.ttf' : 'NotoSans-Regular.ttf';
  const bundled = path.join(ROOT, 'fonts', fontName);
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  return 'Arial';
}

async function startServer() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.options('*', cors({ origin: true, credentials: true }));
  app.use(express.json());

  // Static sample files routing
  app.use('/fonts', express.static(path.join(ROOT, 'fonts')));
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Serve sample audio / video / overlay directly
  app.get('/media/sample/video/:name', (req, res) => {
    const file = path.join(ROOT, 'video', req.params.name);
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.get('/media/sample/audio/:name', (req, res) => {
    const file = path.join(ROOT, 'audio', req.params.name);
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.get('/media/sample/overlay', (_req, res) => {
    const file = path.join(ROOT, 'overlay.png');
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      res.status(404).send('Not found');
    }
  });

  app.get('/media/output', (_req, res) => {
    const file = path.join(ROOT, 'youtube_ready.mp4');
    if (fs.existsSync(file)) {
      res.sendFile(file);
    } else {
      res.status(404).send('Not found');
    }
  });

  // API status
  app.get('/api/status', async (_req, res) => {
    const videoFiles: { name: string; path: string; duration: number }[] = [];
    const videoDir = path.join(ROOT, 'video');
    if (fs.existsSync(videoDir)) {
      const files = fs.readdirSync(videoDir).filter((f) => f.endsWith('.mp4'));
      for (const f of files) {
        const fullPath = path.join(videoDir, f);
        try {
          const info = await probeMediaInfo(fullPath);
          videoFiles.push({ name: f, path: `sample/video/${f}`, duration: info.duration });
        } catch {
          videoFiles.push({ name: f, path: `sample/video/${f}`, duration: 0 });
        }
      }
    }

    let audioDuration = 0;
    const defaultAudio = path.join(ROOT, 'audio', 'voice.mp3');
    if (fs.existsSync(defaultAudio)) {
      try {
        const info = await probeMediaInfo(defaultAudio);
        audioDuration = info.duration;
      } catch {}
    }

    let soundFxInfo = undefined;
    const defaultSoundFx = path.join(ROOT, 'audio', 'nature_river.mp3');
    if (fs.existsSync(defaultSoundFx)) {
      try {
        const info = await probeMediaInfo(defaultSoundFx);
        soundFxInfo = {
          name: 'nature_river.mp3 (Sungai Alami)',
          path: 'sample/audio/nature_river.mp3',
          duration: info.duration,
        };
      } catch {}
    }

    const hasOverlay = fs.existsSync(path.join(ROOT, 'overlay.png'));
    const hasFinal = fs.existsSync(path.join(ROOT, 'youtube_ready.mp4'));

    res.json({
      defaultVideos: videoFiles,
      defaultAudio: {
        name: 'voice.mp3',
        path: 'sample/audio/voice.mp3',
        duration: audioDuration,
      },
      defaultSoundFx: soundFxInfo,
      hasOverlay,
      hasFinal,
      currentRender,
    });
  });

  // Media info probe
  app.post('/api/probe', async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }
    let resolvedPath = filePath;
    if (filePath.startsWith('uploads/')) {
      resolvedPath = path.join(ROOT, filePath);
    } else if (filePath.startsWith('sample/video/')) {
      resolvedPath = path.join(ROOT, 'video', path.basename(filePath));
    } else if (filePath.startsWith('sample/audio/')) {
      resolvedPath = path.join(ROOT, 'audio', path.basename(filePath));
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File does not exist' });
    }

    try {
      const info = await probeMediaInfo(resolvedPath);
      res.json(info);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chunked upload handler (supports raw binary Octet-Stream and Multipart FormData)
  const chunkUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
  });

  const rawChunkParser = express.raw({
    type: ['application/octet-stream', 'application/x-binary', 'binary/octet-stream'],
    limit: '25mb',
  });

  app.post('/api/upload-chunk', rawChunkParser, (req: Request, res: Response) => {
    // 1. Raw binary stream mode (most reliable, no multipart overhead)
    if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      const uploadId = (req.query.uploadId || req.headers['x-upload-id']) as string;
      const chunkIndex = parseInt((req.query.chunkIndex || req.headers['x-chunk-index']) as string, 10);
      const totalChunks = parseInt((req.query.totalChunks || req.headers['x-total-chunks']) as string, 10);
      const rawFilename = (req.query.filename || req.headers['x-filename'] || 'file.mp4') as string;
      const filename = decodeURIComponent(rawFilename);

      if (!uploadId || isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ error: 'Missing chunk upload parameters (raw)' });
      }

      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const tempPath = path.join(UPLOADS_DIR, `temp-${uploadId}.part`);

      try {
        fs.appendFileSync(tempPath, req.body);

        if (chunkIndex + 1 >= totalChunks) {
          const finalFilename = `${uploadId}-${sanitized}`;
          const finalPath = path.join(UPLOADS_DIR, finalFilename);
          if (fs.existsSync(finalPath)) {
            try {
              fs.unlinkSync(finalPath);
            } catch {}
          }
          fs.renameSync(tempPath, finalPath);
          const stats = fs.statSync(finalPath);

          return res.json({
            success: true,
            done: true,
            filename: finalFilename,
            originalName: filename,
            path: `uploads/${finalFilename}`,
            size: stats.size,
          });
        }

        return res.json({ success: true, done: false, chunkIndex, totalChunks });
      } catch (writeErr: any) {
        console.error('Failed writing raw chunk to disk:', writeErr);
        return res.status(500).json({ error: writeErr.message || 'Disk write error' });
      }
    }

    // 2. Fallback: multipart FormData mode
    chunkUpload.single('chunk')(req, res, (err) => {
      if (err) {
        console.error('Chunk upload multer error:', err);
        return res.status(400).json({ error: err.message || 'Chunk upload failed' });
      }

      const uploadId = (req.body?.uploadId || req.query.uploadId) as string;
      const chunkIndex = parseInt((req.body?.chunkIndex || req.query.chunkIndex) as string, 10);
      const totalChunks = parseInt((req.body?.totalChunks || req.query.totalChunks) as string, 10);
      const rawFilename = (req.body?.filename || req.query.filename || 'file.mp4') as string;
      const filename = decodeURIComponent(rawFilename);

      if (!uploadId || !req.file || isNaN(chunkIndex) || isNaN(totalChunks)) {
        return res.status(400).json({ error: 'Missing chunk upload parameters' });
      }

      const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const tempPath = path.join(UPLOADS_DIR, `temp-${uploadId}.part`);

      try {
        fs.appendFileSync(tempPath, req.file.buffer);

        if (chunkIndex + 1 >= totalChunks) {
          const finalFilename = `${uploadId}-${sanitized}`;
          const finalPath = path.join(UPLOADS_DIR, finalFilename);
          if (fs.existsSync(finalPath)) {
            try {
              fs.unlinkSync(finalPath);
            } catch {}
          }
          fs.renameSync(tempPath, finalPath);
          const stats = fs.statSync(finalPath);

          return res.json({
            success: true,
            done: true,
            filename: finalFilename,
            originalName: filename,
            path: `uploads/${finalFilename}`,
            size: stats.size,
          });
        }

        return res.json({ success: true, done: false, chunkIndex, totalChunks });
      } catch (writeErr: any) {
        console.error('Failed writing chunk to disk:', writeErr);
        return res.status(500).json({ error: writeErr.message || 'Disk write error' });
      }
    });
  });

  // Single file upload handler (with graceful error handling)
  app.post('/api/upload', (req: Request, res: Response) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error('Single upload error:', err);
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const relativePath = `uploads/${req.file.filename}`;
      res.json({
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: relativePath,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    });
  });

  // SSE for live render logs
  app.get('/api/render/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);
    res.write(`data: ${JSON.stringify(currentRender)}\n\n`);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // Reset defaults
  app.post('/api/reset', (_req, res) => {
    currentRender = {
      status: 'idle',
      step: '',
      progress: 0,
      logs: [],
      outputFile: fs.existsSync(path.join(ROOT, 'youtube_ready.mp4')) ? 'youtube_ready.mp4' : null,
      error: null,
      startedAt: null,
      completedAt: null,
    };
    broadcastState();
    res.json({ success: true });
  });

  // Format duration helper
  function formatDuration(sec: number): string {
    const s = Math.round(sec);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const remainingSec = s % 60;
    if (h > 0) {
      return `${h}h ${m}m ${remainingSec}s`;
    }
    return `${m}m ${remainingSec}s`;
  }

  // Render pipeline trigger
  app.post('/api/render', async (req, res) => {
    if (currentRender.status === 'rendering') {
      return res.status(409).json({ error: 'Render already in progress' });
    }

    const {
      heading = '#HEADING',
      name = 'Name',
      extra = 'Country',
      date = 'Event date',
      videos = [],
      audio = 'sample/audio/voice.mp3',
      audioFiles = [],
      soundFxFiles = [],
      mainAudioVolume = 1.0,
      soundFxVolume = 0.5,
      targetDurationSeconds = 0,
      overlay = 'sample/overlay',
    } = req.body;

    if (!Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ error: 'At least one video clip is required' });
    }

    const resolvePath = (filePath: string) => {
      if (filePath.startsWith('sample/video/')) {
        return path.join(ROOT, 'video', path.basename(filePath));
      }
      if (filePath.startsWith('sample/audio/')) {
        return path.join(ROOT, 'audio', path.basename(filePath));
      }
      if (filePath.startsWith('uploads/')) {
        return path.join(ROOT, filePath);
      }
      return path.resolve(ROOT, filePath);
    };

    // Resolve video file paths
    const resolvedVideos: string[] = [];
    for (const v of videos) {
      const p = resolvePath(v);
      if (!fs.existsSync(p)) {
        return res.status(400).json({ error: `Video file not found: ${v}` });
      }
      resolvedVideos.push(p);
    }

    // Resolve main audio files (list or single)
    const rawAudioList = Array.isArray(audioFiles) && audioFiles.length > 0 ? audioFiles : [audio];
    const resolvedAudioList: string[] = [];
    for (const a of rawAudioList) {
      const p = resolvePath(a);
      if (!fs.existsSync(p)) {
        return res.status(400).json({ error: `Audio file not found: ${a}` });
      }
      resolvedAudioList.push(p);
    }

    // Resolve Sound FX files (nature sounds)
    const resolvedSoundFxList: string[] = [];
    if (Array.isArray(soundFxFiles) && soundFxFiles.length > 0) {
      for (const sfx of soundFxFiles) {
        const p = resolvePath(sfx);
        if (fs.existsSync(p)) {
          resolvedSoundFxList.push(p);
        }
      }
    }

    // Resolve Overlay
    let resolvedOverlay = overlay;
    if (overlay === 'sample/overlay' || overlay.startsWith('sample/overlay')) {
      resolvedOverlay = path.join(ROOT, 'overlay.png');
    } else {
      resolvedOverlay = resolvePath(overlay);
    }
    if (!fs.existsSync(resolvedOverlay)) {
      return res.status(400).json({ error: `Overlay PNG not found: ${overlay}` });
    }

    // Setup state
    currentRender = {
      status: 'rendering',
      step: 'Initializing build...',
      progress: 5,
      logs: [],
      outputFile: null,
      error: null,
      startedAt: Date.now(),
      completedAt: null,
    };
    broadcastState();

    try {
      fs.writeFileSync(path.join(ROOT, 'render.log'), `Build started at ${new Date().toISOString()}\n`, 'utf-8');
    } catch {}

    res.status(202).json({ message: 'Render started', state: currentRender });

    // Execute background pipeline
    (async () => {
      const mediumFile = path.join(ROOT, 'medium.mp4');
      const mainAudioCombined = path.join(ROOT, 'temp_main_audio.m4a');
      const sfxCombined = path.join(ROOT, 'temp_sfx.m4a');
      const preparedAudio = path.join(ROOT, 'temp_prepared_audio.m4a');
      const finalFile = path.join(ROOT, 'youtube_ready.mp4');

      const textFiles: Record<string, string> = {
        heading: path.join(ROOT, 'drawtext_heading.txt'),
        name: path.join(ROOT, 'drawtext_name.txt'),
        extra: path.join(ROOT, 'drawtext_extra.txt'),
        date: path.join(ROOT, 'drawtext_date.txt'),
      };

      try {
        appendLog('Writing text files for drawtext filters...');
        fs.writeFileSync(textFiles.heading, (heading || '').slice(0, 20), 'utf-8');
        fs.writeFileSync(textFiles.name, (name || '').slice(0, 20), 'utf-8');
        fs.writeFileSync(textFiles.extra, (extra || '').slice(0, 20), 'utf-8');
        fs.writeFileSync(textFiles.date, (date || '').slice(0, 20), 'utf-8');

        // Step 1: Create medium.mp4 (scale, crop to 1280x720, concat, overlay, drawtext)
        currentRender.step = 'Step 1/3: Scaling, concatenating video clips, and compositing overlay + text...';
        currentRender.progress = 25;
        broadcastState();

        const regularFont = escapeFilterValue(getFontPath(false));
        const boldFont = escapeFilterValue(getFontPath(true));

        const filters: string[] = [];
        const scaledLabels: string[] = [];
        for (let i = 0; i < resolvedVideos.length; i++) {
          const label = `v${i}`;
          scaledLabels.push(`[${label}]`);
          filters.push(`[${i}:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,setsar=1[${label}]`);
        }

        filters.push(`${scaledLabels.join('')}concat=n=${resolvedVideos.length}:v=1:a=0[base]`);
        const overlayIndex = resolvedVideos.length;
        filters.push(`[${overlayIndex}:v]scale=1280:720[overlay]`);
        filters.push('[base][overlay]overlay=0:0:format=auto[with_overlay]');

        const headingEsc = escapeFilterValue(textFiles.heading);
        const nameEsc = escapeFilterValue(textFiles.name);
        const extraEsc = escapeFilterValue(textFiles.extra);
        const dateEsc = escapeFilterValue(textFiles.date);

        const drawCommands = [
          `drawtext=fontfile='${regularFont}':textfile='${headingEsc}':fontsize=68:fontcolor=white:x=(w-text_w)/2:y=150`,
          `drawtext=fontfile='${boldFont}':textfile='${nameEsc}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=250`,
          `drawtext=fontfile='${regularFont}':textfile='${extraEsc}':fontsize=42:fontcolor=white:x=(w-text_w)/2:y=300`,
          `drawtext=fontfile='${regularFont}':textfile='${dateEsc}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=400`,
        ];

        filters.push(`[with_overlay]${drawCommands.join(',')}[outv]`);

        const mediumArgs = ['-hide_banner', '-stats', '-y'];
        for (const vid of resolvedVideos) {
          mediumArgs.push('-i', vid);
        }
        mediumArgs.push('-i', resolvedOverlay);
        mediumArgs.push(
          '-filter_complex',
          filters.join(';'),
          '-map',
          '[outv]',
          '-an',
          '-r',
          '24',
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-pix_fmt',
          'yuv420p',
          mediumFile
        );

        appendLog('Executing Step 1: ffmpeg video composite...');
        await runCommand('ffmpeg', mediumArgs);

        // Step 2: Audio preparation (concatenate multi-audio + mix sound FX)
        currentRender.step = 'Step 2/3: Processing audio tracks and mixing Sound FX (Suara Alam)...';
        currentRender.progress = 55;
        broadcastState();

        let mainAudioTarget = resolvedAudioList[0];
        if (resolvedAudioList.length > 1) {
          appendLog(`Concatenating ${resolvedAudioList.length} main audio tracks...`);
          const concatArgs = ['-hide_banner', '-y'];
          const audioInputs: string[] = [];
          for (let i = 0; i < resolvedAudioList.length; i++) {
            concatArgs.push('-i', resolvedAudioList[i]);
            audioInputs.push(`[${i}:a]`);
          }
          concatArgs.push(
            '-filter_complex',
            `${audioInputs.join('')}concat=n=${resolvedAudioList.length}:v=0:a=1[outa]`,
            '-map',
            '[outa]',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            mainAudioCombined
          );
          await runCommand('ffmpeg', concatArgs);
          mainAudioTarget = mainAudioCombined;
        }

        // Handle Sound FX mixing
        let finalAudioTarget = mainAudioTarget;
        if (resolvedSoundFxList.length > 0) {
          let sfxTarget = resolvedSoundFxList[0];
          if (resolvedSoundFxList.length > 1) {
            appendLog(`Concatenating ${resolvedSoundFxList.length} sound FX tracks...`);
            const sfxConcatArgs = ['-hide_banner', '-y'];
            const sfxInputs: string[] = [];
            for (let i = 0; i < resolvedSoundFxList.length; i++) {
              sfxConcatArgs.push('-i', resolvedSoundFxList[i]);
              sfxInputs.push(`[${i}:a]`);
            }
            sfxConcatArgs.push(
              '-filter_complex',
              `${sfxInputs.join('')}concat=n=${resolvedSoundFxList.length}:v=0:a=1[outa]`,
              '-map',
              '[outa]',
              '-c:a',
              'aac',
              '-b:a',
              '192k',
              sfxCombined
            );
            await runCommand('ffmpeg', sfxConcatArgs);
            sfxTarget = sfxCombined;
          }

          const mainVol = Math.max(0, Math.min(2.0, mainAudioVolume ?? 1.0));
          const sfxVol = Math.max(0, Math.min(2.0, soundFxVolume ?? 0.5));
          appendLog(`Mixing main audio (vol: ${mainVol}) with Sound FX (vol: ${sfxVol})...`);

          await runCommand('ffmpeg', [
            '-hide_banner',
            '-y',
            '-i',
            mainAudioTarget,
            '-i',
            sfxTarget,
            '-filter_complex',
            `[0:a]volume=${mainVol}[a1];[1:a]volume=${sfxVol}[a2];[a1][a2]amix=inputs=2:duration=longest:dropout_transition=2[outa]`,
            '-map',
            '[outa]',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            preparedAudio,
          ]);
          finalAudioTarget = preparedAudio;
        }

        // Step 3: Probe durations & loop to reach target duration (15m to 5h)
        const audioDuration = await probeDuration(finalAudioTarget);
        const videoDuration = await probeDuration(mediumFile);

        const targetSec = Number(targetDurationSeconds) || 0;
        const finalDuration = targetSec > 0 ? targetSec : audioDuration;

        appendLog(`Base video duration: ${videoDuration.toFixed(1)}s`);
        appendLog(`Combined audio duration: ${audioDuration.toFixed(1)}s`);
        appendLog(`Target output duration: ${finalDuration.toFixed(1)}s (${formatDuration(finalDuration)})`);

        const videoRepeats = Math.max(1, Math.ceil(finalDuration / videoDuration));
        const videoLoop = videoRepeats - 1;
        const audioRepeats = Math.max(1, Math.ceil(finalDuration / audioDuration));
        const audioLoop = audioRepeats - 1;

        appendLog(`Looping: video ${videoRepeats}x, audio ${audioRepeats}x`);

        currentRender.step = `Step 3/3: Looping to ${formatDuration(finalDuration)} and muxing final MP4...`;
        currentRender.progress = 80;
        broadcastState();

        await runCommand('ffmpeg', [
          '-hide_banner',
          '-stats',
          '-y',
          '-stream_loop',
          videoLoop.toString(),
          '-i',
          mediumFile,
          '-stream_loop',
          audioLoop.toString(),
          '-i',
          finalAudioTarget,
          '-map',
          '0:v',
          '-map',
          '1:a',
          '-c:v',
          'copy',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-t',
          finalDuration.toString(),
          finalFile,
        ]);

        // Clean temporary files
        appendLog('Cleaning temporary intermediate files...');
        for (const f of [
          mediumFile,
          mainAudioCombined,
          sfxCombined,
          preparedAudio,
          ...Object.values(textFiles),
        ]) {
          if (fs.existsSync(f)) {
            try {
              fs.unlinkSync(f);
            } catch {}
          }
        }

        currentRender.status = 'completed';
        currentRender.step = `Complete! Output: youtube_ready.mp4 (${formatDuration(finalDuration)})`;
        currentRender.progress = 100;
        currentRender.outputFile = 'youtube_ready.mp4';
        currentRender.completedAt = Date.now();
        appendLog(`Build successfully completed! File: youtube_ready.mp4 (${formatDuration(finalDuration)})`);
        broadcastState();
      } catch (err: any) {
        console.error('Render pipeline error:', err);
        currentRender.status = 'error';
        currentRender.step = 'Build failed.';
        currentRender.error = err.message || 'Build failed. See logs for details.';
        appendLog(`ERROR: ${currentRender.error}`);
        broadcastState();
      }
    })();
  });


  // Attach Vite or static middleware
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(ROOT, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(ROOT, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Replicator server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
