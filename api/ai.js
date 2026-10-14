// Vercel serverless function: the browser never sees the API key.
module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  if (req.method === 'GET') return res.status(200).json({ ok: !!key, model });
  if (!key) return res.status(503).json({ error: 'AI not configured', code: 'sampling_disabled' });
  const { prompt, json } = req.body || {};
  if (typeof prompt !== 'string' || !prompt || prompt.length > 200000)
    return res.status(400).json({ error: 'Invalid prompt', code: 'invalid_request' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, ...(json ? { responseMimeType: 'application/json' } : {}) } })
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ error: d.error?.message || 'Upstream error', code: r.status === 429 ? 'rate_limited' : 'upstream_error' });
    const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
    if (!text) return res.status(502).json({ error: 'Empty answer', code: 'empty_completion' });
    return res.status(200).json({ text });
  } catch (e) { return res.status(502).json({ error: String(e), code: 'upstream_error' }); }
};
