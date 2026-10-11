import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// In-memory cache for generated TTS audio with MIME types
interface CachedAudio {
  buffer: Buffer;
  mimeType: string;
}
const ttsCache = new Map<string, CachedAudio>();

// Health/status endpoint for Audio Diagnostics
app.get('/api/tts/status', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    cachedCount: ttsCache.size,
    defaultMimeType: 'audio/wav',
    supportedMimeTypes: ['audio/wav', 'audio/mpeg', 'audio/mp3'],
  });
});

// API endpoint for Text-to-Speech audio file generation
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    const trimmed = text.trim();
    if (ttsCache.has(trimmed)) {
      const cached = ttsCache.get(trimmed)!;
      res.setHeader('Content-Type', cached.mimeType);
      res.setHeader('Content-Length', cached.buffer.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.buffer);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY no configurada' });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Truncate to reasonable length
    const textToSpeak = trimmed.length > 350 ? trimmed.slice(0, 350) + '...' : trimmed;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: textToSpeak,
      config: {
        responseModalities: ['AUDIO'],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part || !part.inlineData?.data) {
      return res.status(502).json({ error: 'No se pudo generar el stream de audio' });
    }

    const rawMime = part.inlineData?.mimeType || 'audio/wav';
    // Normalize MIME type
    const mimeType = rawMime.includes('wav') ? 'audio/wav' : rawMime;
    const buffer = Buffer.from(part.inlineData.data, 'base64');
    
    ttsCache.set(trimmed, { buffer, mimeType });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(buffer);
  } catch (err: any) {
    const isQuota = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));
    console.warn('TTS API notice:', err.message);
    return res.status(isQuota ? 429 : 500).json({
      error: isQuota ? 'quota_exceeded' : 'generation_failed',
      message: err.message || 'Error generando archivo de audio',
    });
  }
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
