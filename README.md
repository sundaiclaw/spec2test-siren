# Spec2Test Siren

Turn product specs into AI-generated test maps, edge cases, adversarial probes, and release warnings.

## What it does

Spec2Test Siren helps a builder paste in a feature spec and instantly get:
- happy-path tests worth automating first
- edge cases that often get missed
- abuse / adversarial probes
- a short release checklist and the scariest bug to watch for

The AI output is powered by an OpenRouter free model and rendered as readable markdown in the UI.

## How to Run (from zero)

1. Prerequisites
   - Node.js 20+
   - npm
   - OpenRouter API key
2. `git clone https://github.com/sundaiclaw/spec2test-siren.git`
3. `cd spec2test-siren`
4. `npm install`
5. Run:
   - `OPENROUTER_API_KEY=your_key OPENROUTER_BASE_URL=https://openrouter.ai/api/v1 OPENROUTER_MODEL=google/gemma-3-27b-it:free npm start`
6. Open `http://localhost:8080`

## Limitations / known gaps

- No saved history yet
- No auth or rate limiting
- Quality depends on the chosen OpenRouter model and the clarity of the input spec


Build on Sundai Club on March 24, 2026  
Sundai Project: https://www.sundai.club/projects/59f346b0-6481-47a8-989b-e49a6474c5e1
