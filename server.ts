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

// In-memory cache for generated TTS audio
const ttsCache = new Map<string, Buffer>();

// API endpoint for Text-to-Speech
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'El texto es obligatorio' });
    }

    const trimmed = text.trim();
    if (ttsCache.has(trimmed)) {
      const cached = ttsCache.get(trimmed)!;
      res.setHeader('Content-Type', 'audio/wav');
      return res.send(cached);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY no está configurada' });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Truncate to reasonable length if too long
    const textToSpeak = trimmed.length > 350 ? trimmed.slice(0, 350) + '...' : trimmed;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: textToSpeak,
      config: {
        responseModalities: ['AUDIO'],
      },
    });

    const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part || !part.inlineData?.data) {
      return res.status(500).json({ error: 'No se pudo generar el audio' });
    }

    const buffer = Buffer.from(part.inlineData.data, 'base64');
    ttsCache.set(trimmed, buffer);

    res.setHeader('Content-Type', 'audio/wav');
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error en TTS:', err.message);
    return res.status(500).json({ error: err.message || 'Error generando audio' });
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
