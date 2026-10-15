// Vercel serverless function: the browser never sees the API key.
// Resilient to free-tier hiccups: retries when the model is busy, and falls back
// to other Flash models if the main one is overloaded or unavailable.
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const primary = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const extra = (process.env.GEMINI_FALLBACK_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  const models = [...new Set([primary, ...extra, 'gemini-flash-latest', 'gemini-flash-lite-latest'])];
  if (req.method === 'GET') return res.status(200).json({ ok: !!key, model: primary, fallbacks: models.slice(1) });
  if (!key) return res.status(503).json({ error: 'AI not configured', code: 'sampling_disabled' });
  const { prompt, json } = req.body || {};
  if (typeof prompt !== 'string' || !prompt || prompt.length > 200000)
    return res.status(400).json({ error: 'Invalid prompt', code: 'invalid_request' });

  const deadline = Date.now() + 50000; // stay inside Vercel's 60s limit
  let last = { status: 502, msg: 'Upstream error' };

  const call = async (model, withThinking) => {
    const generationConfig = { temperature: 0.1, ...(withThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}), ...(json ? { responseMimeType: 'application/json' } : {}) };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig })
    });
    let d = {}; try { d = await r.json(); } catch (_) {}
    return { r, d };
  };

  for (const model of models) {
    let withThinking = true;
    for (let attempt = 0; attempt < 3 && Date.now() < deadline; attempt++) {
      try {
        const { r, d } = await call(model, withThinking);
        if (r.ok) {
          const text = (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
          if (text) return res.status(200).json({ text, model });
          last = { status: 502, msg: 'Empty answer' }; break;
        }
        const msg = d.error?.message || `HTTP ${r.status}`;
        last = { status: r.status, msg: `${model}: ${msg}` };
        if (r.status === 400 && /thinking/i.test(msg) && withThinking) { withThinking = false; attempt--; continue; }
        // "retry in 17h55m15s" or "retry in 4.2s" -> seconds
        const rm = msg.match(/retry in ((?:(\d+)h)?(?:(\d+)m)?([\d.]+)s)/i);
        const retrySec = rm ? (+(rm[2] || 0)) * 3600 + (+(rm[3] || 0)) * 60 + parseFloat(rm[4]) : null;
        const daily = /per ?day/i.test(msg) || (retrySec !== null && retrySec > 60);
        if (r.status === 404 || /no longer available|not found|not supported/i.test(msg) || daily) break; // try next model
        if (r.status === 429 || r.status === 503 || r.status === 500) {
          const wait = Math.min(retrySec !== null ? Math.ceil(retrySec * 1000) + 500 : 2000 * (attempt + 1), 15000);
          if (Date.now() + wait < deadline) { await sleep(wait); continue; }
        }
        break;
      } catch (e) { last = { status: 502, msg: `${model}: ${String(e)}` }; await sleep(1500); }
    }
  }
  const code = last.status === 429 ? 'rate_limited' : 'upstream_error';
  return res.status(last.status === 429 ? 429 : 502).json({ error: last.msg, code });
};
