import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 8787;
const host = process.env.HOST || '127.0.0.1';

app.use(cors());
app.use(express.json());

const SYSTEM_PROMPT = `You are Vividia's AI engine - a warm, grounded life coach built for college students.

Your job is to turn big dreams into structured, achievable daily actions.

Tone rules:
- Encouraging but honest. Never toxic positivity.
- Speak like a smart older friend, not a corporate chatbot.
- Short sentences. Actionable language. Present tense.
- Warm but not cheesy.

Output rules:
- Respond in valid JSON only.
- No markdown. No preamble. No explanation outside the JSON.
- No apologies. No filler phrases.
- Do not reproduce copyrighted song lyrics, poems, or article text.
- For media suggestions, use only titles + one-sentence original description.
- If you cannot generate a field, use null - never omit the key.`;

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/ai', async (req, res) => {
  const { prompt } = req.body ?? {};

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'OPENAI_API_KEY is missing.' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1500,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'OpenAI request failed.',
      });
    }

    const content = data?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return res.json(parsed);
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error.',
    });
  }
});

app.listen(port, host, () => {
  console.log(`Vividia backend listening on http://${host}:${port}`);
});
