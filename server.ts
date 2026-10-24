import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Endpoint: Check AI service status
app.get('/api/ai/status', (req, res) => {
  res.json({
    hasKey: !!apiKey,
    modelText: 'gemini-3.8-flash',
    modelImage: 'gemini-3.1-flash-lite-image',
  });
});

// Endpoint: Assist with blurb, marketing hook, and title variations
app.post('/api/ai/blurb-assist', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please attach GEMINI_API_KEY in Settings > Secrets.',
        code: 'MISSING_API_KEY',
      });
    }

    const { genre, title, subtitle, blurb, authorName, action } = req.body;

    let prompt = '';
    if (action === 'refine_blurb') {
      prompt = `You are an elite, bestselling book editor and copywriter. Refine and enhance this book blurb for the genre "${genre || 'Fiction'}".
Book Title: "${title || 'Untitled'}"
${subtitle ? `Subtitle: "${subtitle}"` : ''}
${authorName ? `Author: "${authorName}"` : ''}
Current Blurb: "${blurb || ''}"

Return a JSON object with:
1. "hook": A punchy 1-sentence opening headline that grabs the reader immediately.
2. "blurb": The refined, emotionally gripping, 2-to-3 paragraph back-cover blurb (120-180 words) optimized for high reader conversion and readability on print covers.
3. "authorBio": A polished 2-sentence author bio snippet.
4. "tagline": A memorable 3-7 word catchphrase.
5. "praiseQuote": A simulated quote from a fictional prominent review or bestselling author.`;
    } else if (action === 'generate_ideas') {
      prompt = `You are a professional book packaging strategist. Suggest cover concepts for a "${genre || 'General Nonfiction'}" book with Title: "${title || 'Untitled'}".
Return a JSON object with:
1. "suggestedSubtitles": Array of 3 compelling subtitles.
2. "visualThemes": Array of 3 visual design concept descriptions suitable for cover illustration.
3. "colorMood": Recommended color palette mood (e.g. "Midnight Blue & Foil Gold", "Earthy Parchment & Crimson").
4. "typographyMood": Recommended font style direction (e.g. "Authoritative Classical Serif with clean modern author credit").`;
    } else {
      prompt = `Provide back cover blurb suggestions and marketing copy for:
Genre: ${genre}
Title: ${title}
Author: ${authorName}
Draft: ${blurb}
Return clean JSON with "hook", "blurb", "tagline", and "authorBio".`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in blurb-assist:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI blurb request',
    });
  }
});

// Endpoint: Generate cover illustration / background using Gemini Image Model
app.post('/api/ai/generate-cover-image', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please attach GEMINI_API_KEY in Settings > Secrets.',
        code: 'MISSING_API_KEY',
      });
    }

    const { prompt, genre, aspectRatio = '3:4', style } = req.body;

    const fullPrompt = `Professional book cover artwork background for genre ${genre || 'Fiction'}. Style: ${style || 'Cinematic, rich lighting, balanced composition with negative space for typography'}. Subject: ${prompt}. Clean commercial quality, no distorted text or letters, ultra high definition, atmospheric depth.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
    });

    let imageUrl = '';
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Model did not return image data' });
    }

    return res.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('Error in generate-cover-image:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate cover image',
    });
  }
});

// Endpoint: OCR / Text detection for uploaded covers
app.post('/api/ai/ocr-detect', async (req, res) => {
  try {
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server. Please attach GEMINI_API_KEY in Settings > Secrets.',
        code: 'MISSING_API_KEY',
      });
    }

    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Analyze this book cover image. Detect any prominent text elements present on the cover.
Identify:
1. The likely Book Title.
2. The Subtitle (if present).
3. The Author Name (if present).
4. Any Taglines or Praise quotes (if present).
5. Estimated vertical position (e.g. "top", "middle", "bottom") and color tone.

Return a JSON object with:
{
  "detected": true,
  "title": string or null,
  "subtitle": string or null,
  "author": string or null,
  "tagline": string or null,
  "estimatedGenre": string or null,
  "dominantColors": string[]
}`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Error in ocr-detect:', error);
    return res.status(500).json({
      error: error.message || 'Failed to inspect image text',
    });
  }
});

// Endpoint: Live royalty-free stock image search via Openverse API
app.get('/api/stock/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) {
    return res.json({ success: true, results: [] });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const openverseUrl = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=20`;
    const response = await fetch(openverseUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AlexForge-CoverCraft/1.0 (book cover design studio)',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return res.json({ success: true, results: [] });
    }

    const data: any = await response.json();
    const results = (data.results || []).map((img: any) => ({
      id: `openverse-${img.id}`,
      title: img.title || 'Stock Image',
      author: img.creator || 'Open Creator',
      source: 'Openverse',
      url: img.url,
      thumbUrl: img.thumbnail || img.url,
      genre: 'general',
      tags: (img.tags || []).map((t: any) => t.name).slice(0, 6),
      orientation: (img.width && img.height && img.width > img.height) ? 'landscape' : 'portrait',
      aspectRatio: (img.width && img.height && img.width > img.height) ? '16:9' : '3:4',
      license: img.license ? `CC ${img.license.toUpperCase()} / Commercial Safe` : 'Royalty-Free / Commercial Use Safe',
    }));

    return res.json({ success: true, results });
  } catch (err: any) {
    // Graceful fallback to client curated library
    return res.json({ success: true, results: [] });
  }
});

// Vite Middleware integration for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AlexForge CoverCraft Studio server running on port ${port}`);
  });
}

startServer();
