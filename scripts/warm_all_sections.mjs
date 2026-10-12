import http from 'http';
import fs from 'fs';

function cleanSpokenText(raw) {
  if (!raw) return '';
  return raw
    .replace(/[«»""'']/g, '')
    .replace(/[*_#`~^]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function warmOne(text) {
  const clean = cleanSpokenText(text);
  const textSample = clean.length > 380 ? clean.slice(0, 380) + '...' : clean;
  const url = `http://localhost:3000/api/tts?text=${encodeURIComponent(textSample)}&format=mp3`;

  return new Promise((resolve) => {
    http.get(url, (res) => {
      let bytes = 0;
      res.on('data', (c) => { bytes += c.length; });
      res.on('end', () => {
        console.log(`[Warmed] ${res.statusCode} (${bytes}b): ${textSample.slice(0, 45)}...`);
        resolve();
      });
    }).on('error', (err) => {
      console.warn(`[Warm Error]: ${err.message}`);
      resolve();
    });
  });
}

async function main() {
  const fileContent = fs.readFileSync('src/data/balsekarData.ts', 'utf-8');

  // Extract quotes
  const quoteTexts = [];
  const quoteRegex = /text:\s*'([^']+)'/g;
  let m;
  while ((m = quoteRegex.exec(fileContent)) !== null) {
    quoteTexts.push(m[1]);
  }

  console.log(`Found ${quoteTexts.length} quotes to warm.`);
  for (const q of quoteTexts.slice(0, 15)) {
    await warmOne(`Cita de Ramesh Balsekar. ${q}`);
  }

  console.log('Finished warming all sections.');
}

main();
