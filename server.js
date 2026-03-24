import express from 'express';
import { marked } from 'marked';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const BASE = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free';

const page = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Spec2Test Siren</title>
  <style>
    :root { color-scheme: dark; }
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: linear-gradient(180deg,#0b1020,#151b2f); color: #eef2ff; }
    .wrap { max-width: 980px; margin: 0 auto; padding: 32px 18px 64px; }
    .hero { display:grid; gap: 14px; margin-bottom: 24px; }
    h1 { font-size: clamp(2.2rem, 5vw, 4rem); margin: 0; }
    p.lead { color: #c7d2fe; font-size: 1.1rem; margin: 0; }
    .grid { display:grid; grid-template-columns: 1.15fr 0.85fr; gap: 18px; }
    .card { background: rgba(15,23,42,.7); border: 1px solid rgba(148,163,184,.25); border-radius: 18px; padding: 18px; box-shadow: 0 10px 30px rgba(0,0,0,.2); }
    textarea, input { width: 100%; box-sizing:border-box; border-radius: 14px; border: 1px solid #334155; background: #020617; color: #e2e8f0; padding: 14px; }
    textarea { min-height: 260px; resize: vertical; }
    input { margin-bottom: 10px; }
    button { background: #7c3aed; color: white; border: 0; padding: 12px 16px; border-radius: 12px; cursor: pointer; font-weight: 700; }
    button:hover { background:#8b5cf6; }
    .muted { color:#94a3b8; font-size:.95rem; }
    .chips { display:flex; flex-wrap:wrap; gap:8px; margin-top: 4px; }
    .chip { background:#1e293b; border:1px solid #334155; color:#bfdbfe; padding:6px 10px; border-radius:999px; font-size:.85rem; }
    #status { min-height: 24px; color: #c4b5fd; }
    #output { line-height: 1.6; }
    #output h1, #output h2, #output h3 { color: #a5b4fc; }
    #output code { background:#0f172a; padding:2px 6px; border-radius:6px; }
    #output pre { background:#020617; padding:14px; border-radius:12px; overflow:auto; }
    @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div class="chips">
        <span class="chip">AI test-plan generator</span>
        <span class="chip">Abuse-case prompts</span>
        <span class="chip">OpenRouter free model</span>
      </div>
      <h1>Spec2Test Siren</h1>
      <p class="lead">Paste a product spec and get happy-path tests, edge cases, failure probes, and red-team prompts before bugs escape into prod.</p>
    </section>
    <section class="grid">
      <div class="card">
        <label for="spec">Product spec</label>
        <textarea id="spec" placeholder="Describe the feature, inputs, constraints, failure modes, and what success looks like..."></textarea>
        <label for="risk">What would hurt most if this shipped wrong?</label>
        <input id="risk" placeholder="Example: billing mistakes, data loss, false positives, broken mobile UX" />
        <button onclick="runAudit()">Generate test map</button>
        <p id="status" class="muted"></p>
      </div>
      <div class="card">
        <h3>What you get</h3>
        <ul>
          <li>Happy-path scenarios worth automating first</li>
          <li>Edge cases most teams forget</li>
          <li>Abuse and prompt-injection probes</li>
          <li>Release checklist + one brutal shipping warning</li>
        </ul>
        <p class="muted">The result renders as readable markdown instead of a raw model dump.</p>
      </div>
    </section>
    <section class="card" style="margin-top:18px;">
      <h3>Generated test map</h3>
      <div id="output" class="muted">Your AI-generated plan will appear here.</div>
    </section>
  </div>
  <script>
    async function runAudit() {
      const spec = document.getElementById('spec').value.trim();
      const risk = document.getElementById('risk').value.trim();
      if (!spec) return;
      const status = document.getElementById('status');
      const output = document.getElementById('output');
      status.textContent = 'Interrogating the spec...';
      output.innerHTML = '<p class="muted">Working...</p>';
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spec, risk })
      });
      const data = await res.json();
      if (!res.ok) {
        status.textContent = 'Failed';
        output.textContent = data.error || 'Request failed';
        return;
      }
      status.textContent = 'Done with ' + data.model;
      output.innerHTML = data.html;
    }
  </script>
</body>
</html>`;

app.get('/', (_req, res) => res.type('html').send(page));
app.get('/healthz', (_req, res) => res.json({ ok: true, model: MODEL }));

app.post('/api/generate', async (req, res) => {
  try {
    const spec = (req.body?.spec || '').slice(0, 12000);
    const risk = (req.body?.risk || '').slice(0, 500);
    if (!spec) return res.status(400).json({ error: 'spec required' });
    if (!process.env.OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY missing' });

    const prompt = `You are Spec2Test Siren, an expert QA strategist for fast-moving AI products. Analyze the product spec below.

Highest-risk failure to emphasize: ${risk || 'not provided'}

Return markdown with these exact sections:
# TL;DR
# Happy Path Tests
# Edge Cases Everyone Misses
# Abuse / Adversarial Probes
# Release Checklist
# The Scariest Bug If We Ship Today

Rules:
- Be concrete and product-specific.
- Use bullets and short numbered tests.
- Include at least 3 adversarial probes.
- Mention observability or rollback where relevant.
- No filler preamble.

Product spec:
${spec}`;

    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://spec2test-siren.local',
        'X-Title': 'Spec2Test Siren'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.4,
        messages: [
          { role: 'system', content: 'You produce crisp markdown QA plans for new software features.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(500).json({ error: data?.error?.message || 'OpenRouter request failed', raw: data });
    }

    const markdown = data?.choices?.[0]?.message?.content || 'No response';
    const html = marked.parse(markdown);
    res.json({ markdown, html, model: MODEL });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.listen(PORT, () => console.log(`listening on ${PORT}`));
