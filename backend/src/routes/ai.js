import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

async function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

/* ── Caption generation ─────────────────────────────────────────────── */
router.post('/caption', async (req, res) => {
  const { title, clientName, platforms = [], contentType, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  const anthropic = await getAnthropic();
  if (!anthropic) return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Add ANTHROPIC_API_KEY to backend/.env to enable AI captions.' });

  try {
    const platformList = platforms.join(', ') || 'social media';
    const prompt = `Write a compelling social media caption for the following post.

Post title: ${title}
Client/Brand: ${clientName || 'Not specified'}
Platforms: ${platformList}
Content type: ${contentType || 'Not specified'}
Additional notes: ${notes || 'None'}

Requirements:
- Direct, engaging tone — not corporate or generic
- No em dashes
- Include a clear hook in the first line
- Natural hashtag placement at the end (5-8 relevant hashtags)
- Match the platform style (Instagram = visual storytelling, LinkedIn = professional insights, Facebook = conversational, TikTok = punchy and casual, Threads = conversational, Bluesky = community-first)
- Keep it under 280 characters if Twitter/X is included, under 300 if Bluesky is included

Return ONLY the caption text. No explanations, no alternatives, no meta-commentary.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const caption = message.content[0]?.text?.trim() ?? '';
    res.json({ caption });
  } catch (err) {
    console.error('AI caption error:', err.message);
    res.status(500).json({ error: 'Caption generation failed. Try again.' });
  }
});

/* ── Hashtag suggestions ─────────────────────────────────────────────── */
router.post('/hashtags', async (req, res) => {
  const { caption, title, platforms = [], clientName, industry } = req.body;
  if (!caption && !title) return res.status(400).json({ error: 'caption or title is required' });

  const anthropic = await getAnthropic();
  if (!anthropic) return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Add ANTHROPIC_API_KEY to enable AI hashtags.' });

  try {
    const platformList = platforms.join(', ') || 'social media';
    const prompt = `Generate 15-20 relevant hashtags for this social media post.

Post title: ${title || ''}
Caption: ${caption || ''}
Brand: ${clientName || 'Not specified'}
Industry: ${industry || 'Not specified'}
Platforms: ${platformList}

Rules:
- Mix popular (1M+ posts) and niche (<100K posts) hashtags for reach + discoverability
- Include 2-3 brand-adjacent tags and 2-3 hyper-specific tags
- No generic spam hashtags like #like4like #followforfollow
- TikTok hashtags should lean toward trends; Instagram should be topic-specific; LinkedIn should use very few
- Return ONLY a space-separated list of hashtags starting with #. No explanations. No numbering.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.text?.trim() ?? '';
    const hashtags = raw.split(/\s+/).filter((t) => t.startsWith('#'));
    res.json({ hashtags });
  } catch (err) {
    console.error('AI hashtags error:', err.message);
    res.status(500).json({ error: 'Hashtag generation failed. Try again.' });
  }
});

/* ── Post ideas engine ─────────────────────────────────────────────── */
router.post('/ideas', async (req, res) => {
  const { clientName, industry, platforms = [], tone, recentTopics = [] } = req.body;

  const anthropic = await getAnthropic();
  if (!anthropic) return res.status(503).json({ error: 'AI_UNAVAILABLE', message: 'Add ANTHROPIC_API_KEY to enable AI ideas.' });

  try {
    const platformList = platforms.join(', ') || 'social media';
    const avoid = recentTopics.length ? `Avoid these topics already covered recently: ${recentTopics.join(', ')}.` : '';
    const prompt = `Generate 8 original social media post ideas for this brand.

Brand: ${clientName || 'Not specified'}
Industry: ${industry || 'Not specified'}
Platforms: ${platformList}
Tone: ${tone || 'Direct and professional'}
${avoid}

For each idea, provide:
- A punchy post title (max 10 words)
- A one-line description of the angle or hook

Format as a numbered list like:
1. [Title] | [Description]
2. [Title] | [Description]

No fluff. No explanations. Return ONLY the numbered list.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0]?.text?.trim() ?? '';
    const ideas = raw.split('\n')
      .filter((line) => /^\d+\./.test(line.trim()))
      .map((line) => {
        const withoutNum = line.replace(/^\d+\.\s*/, '').trim();
        const [title, description] = withoutNum.split('|').map((s) => s.trim());
        return { title: title || withoutNum, description: description || '' };
      })
      .filter((idea) => idea.title);

    res.json({ ideas });
  } catch (err) {
    console.error('AI ideas error:', err.message);
    res.status(500).json({ error: 'Ideas generation failed. Try again.' });
  }
});

/* ── Image generation (OpenAI DALL-E 3) ─────────────────────────────── */
router.post('/image', async (req, res) => {
  const { prompt, style = 'vivid', size = '1024x1024' } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'IMAGE_UNAVAILABLE',
      message: 'Add OPENAI_API_KEY to backend/.env to enable AI image generation.',
    });
  }

  try {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Social media post visual: ${prompt}. Clean, professional, high-quality photography or illustration style suitable for brand marketing. No text or watermarks.`,
      n: 1,
      size,
      style,
      response_format: 'url',
    });

    const imageUrl = response.data[0]?.url;
    if (!imageUrl) throw new Error('No image returned');
    res.json({ url: imageUrl });
  } catch (err) {
    console.error('AI image error:', err.message);
    if (err.status === 400) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: 'Image generation failed. Try again.' });
  }
});

export default router;
