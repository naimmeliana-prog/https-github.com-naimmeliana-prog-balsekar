import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

import fs from 'fs';
import crypto from 'crypto';
import { spawn } from 'child_process';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Disk cache directory for persistent audio streaming
const TTS_CACHE_DIR = '/tmp/tts_cache';
if (!fs.existsSync(TTS_CACHE_DIR)) {
  fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
}

// Convert WAV buffer to standard 44.1kHz MP3 buffer using ffmpeg
function convertWavToMp3(wavBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-f', 'wav',
      '-i', 'pipe:0',
      '-f', 'mp3',
      '-codec:a', 'libmp3lame',
      '-b:a', '128k',
      '-ar', '44100',
      'pipe:1',
    ]);
    const chunks: Buffer[] = [];
    ffmpeg.stdout.on('data', (c) => chunks.push(c));
    ffmpeg.stderr.on('data', () => {}); // swallow debug
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
    ffmpeg.on('error', reject);
    ffmpeg.stdin.end(wavBuffer);
  });
}

// Handler for TTS generation and streaming (supports both GET and POST)
async function handleTtsRequest(rawText: string, format: string, res: express.Response) {
  try {
    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    const cleaned = rawText
      .replace(/[«»""'']/g, '')
      .replace(/[*_#`~^]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) {
      return res.status(400).json({ error: 'Texto vacío' });
    }

    // Limit text length to ensure fast generation
    const textToSpeak = cleaned.length > 400 ? cleaned.slice(0, 400) + '...' : cleaned;
    const targetFormat = format === 'wav' ? 'wav' : 'mp3';
    const hash = crypto.createHash('md5').update(`${textToSpeak}_${targetFormat}`).digest('hex');
    const cacheFilePath = path.join(TTS_CACHE_DIR, `${hash}.${targetFormat}`);

    // If cached file exists, stream it immediately with Range headers supported
    if (fs.existsSync(cacheFilePath)) {
      res.setHeader('Content-Type', targetFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return res.sendFile(cacheFilePath);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY no configurada' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: textToSpeak,
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part || !part.inlineData?.data) {
      return res.status(502).json({ error: 'No se pudo generar el audio' });
    }

    const wavBuffer = Buffer.from(part.inlineData.data, 'base64');

    if (targetFormat === 'mp3') {
      try {
        const mp3Buffer = await convertWavToMp3(wavBuffer);
        fs.writeFileSync(cacheFilePath, mp3Buffer);
      } catch (err) {
        console.warn('ffmpeg conversion fallback to wav:', err);
        // Fallback to storing wav if ffmpeg failed
        const wavPath = path.join(TTS_CACHE_DIR, `${hash}.wav`);
        fs.writeFileSync(wavPath, wavBuffer);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        return res.sendFile(wavPath);
      }
    } else {
      fs.writeFileSync(cacheFilePath, wavBuffer);
    }

    res.setHeader('Content-Type', targetFormat === 'mp3' ? 'audio/mpeg' : 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.sendFile(cacheFilePath);
  } catch (err: any) {
    const isQuota = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));
    console.warn('TTS API notice:', err.message);
    return res.status(isQuota ? 429 : 500).json({
      error: isQuota ? 'quota_exceeded' : 'generation_failed',
      message: err.message || 'Error generando archivo de audio',
    });
  }
}

// Health/status endpoint
app.get('/api/tts/status', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    cachedFiles: fs.existsSync(TTS_CACHE_DIR) ? fs.readdirSync(TTS_CACHE_DIR).length : 0,
    defaultMimeType: 'audio/mpeg',
    supportedMimeTypes: ['audio/mpeg', 'audio/wav'],
  });
});

// GET endpoint (ideal for HTML5 <audio src="..."> on mobile devices)
app.get('/api/tts', async (req, res) => {
  const text = (req.query.text as string) || '';
  const format = (req.query.format as string) || 'mp3';
  await handleTtsRequest(text, format, res);
});

// POST endpoint
app.post('/api/tts', async (req, res) => {
  const text = req.body?.text || '';
  const format = req.body?.format || 'mp3';
  await handleTtsRequest(text, format, res);
});

// Serve static assets from public
app.use(express.static(path.join(__dirname, 'public')));

// Mount Vite in development
if (process.env.NODE_ENV !== 'production') {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor activo en http://0.0.0.0:${PORT}`);
});
