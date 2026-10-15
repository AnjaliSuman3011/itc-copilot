# ITC Copilot

**An AI copilot that reconciles a company's purchase register against GSTR-2B, explains every mismatch, and tells the accounts team what to do before the 14th.**
Concept add-on for a GST reconciliation product. Built for the Masters India APM assignment by Anjali Suman. All data is synthetic.

**Live demo:** https://itc-copilot.vercel.app

## The problem
Companies can claim GST input tax credit only for invoices that appear in their GSTR-2B. Every month some don't (vendor didn't file, number typed differently, wrong tax head, duplicates), and credit gets stuck between the 14th (2B cut-off) and the 20th (3B due date).
Matching is already well automated. The bottleneck I saw during ERP integrations at ClearTax is **explaining** each mismatch and getting someone to act.

## How it works
1. **AI engine (core):** bills are grouped by vendor; the LLM decides every bill (matched, same bill written differently, value mismatch, wrong tax type, GSTIN typo, duplicate, missing, credit note) with a reason and confidence.
2. **Guardrails:** every AI decision is checked against hard facts (amount within ₹2 or 0.1%, tax head, GSTIN, each bill used once, allowed IMS action). Wrong calls are corrected and logged.
3. **Human approval:** IMS actions and vendor messages need approval; everything is in an audit log.
4. **Fallback:** a deterministic engine is used as the benchmark, and takes over if the AI is unavailable.

## Results
| Test | Baseline engine | AI engine |
|---|---|---|
| Clean sample, 8 mismatch types (39 labels) | 100% | 100% (live run: 39/39 decided by AI, 0 guardrail corrections) |
| Messy set, 1,040 bills (used to tune the baseline) | 100% (biased, discarded) | – |
| **Unseen messy set, 1,040 bills** | **96.7%** (every miss flagged, none wrongly marked safe) | not run live (free-tier limits) |
| AI explanations, LLM-as-judge (8 issues) | – | 75% pass all 4 checks; fix: one action per step |

What failed along the way: baseline v1 scored 88.6% on messy data (paise rounding, duplicates typed differently, same invoice number from two vendors, leading zeros), fixed in v2. A first 100% was biased (tuned on the same data), so I re-tested on an unseen set. An early version used AI only for explanations; I moved AI to the core with guardrails. The first live run timed out on 110-row batches; fixed with smaller batches and no model "thinking" step.

## Try it yourself
Open the demo and click **Run reconciliation**. To use other data, upload `purchase_register.csv` + `gstr2b.csv` (+ optional `answer_key.csv`) from any folder in `test_pack/`, run it, then open **Accuracy & evals** for a live score. GST-portal column names ("GSTIN of supplier", "Integrated Tax" …) are accepted. See `test_pack/README.txt`.

## About the live AI
The live demo runs on a free-tier Gemini key, which has small per-minute and daily limits; each run uses about 2 requests. If a limit is hit, the app automatically uses the fallback engine and the engine bar shows exactly how many bills it handled, so the demo never breaks.

**To run it with live AI on your own free key (about 3 minutes):**
1. Get a free key at https://aistudio.google.com/apikey
2. Fork this repo and import it into Vercel (vercel.com → Add New → Project).
3. Add environment variables `GEMINI_API_KEY` = your key and `GEMINI_MODEL` = `gemini-3.8-flash` (or any current Flash model).
4. Deploy and open your link. Your key stays on the server and is never sent to the browser.

**No key needed for accuracy checks:** `node tests/eval.js test_pack/<folder>` scores the labelled test packs offline.

## Repo
`index.html` app · `engine.js` baseline engine and guardrail helpers · `api/ai.js` server function holding the LLM key · `tests/` evals · `test_pack/` labelled data · `docs/prompt_log.md` how AI was used at each step
