# ITC Copilot

**An AI copilot that reconciles a company's purchase register against GSTR-2B, explains every mismatch, and tells the accounts team what to do before the 14th.**
Concept add-on for a GST reconciliation product. Built for the Masters India APM assignment by Anjali Suman. All data is synthetic.

**Live demo:** _add your Vercel link_ · **Walkthrough video:** _add link_

## The problem
Companies can claim GST input tax credit only for invoices that appear in their GSTR-2B. Every month some don't (vendor didn't file, number typed differently, wrong tax head, duplicates), and credit gets stuck between the 14th (2B cut-off) and the 20th (3B due date).
Matching tools already exist. The bottleneck I saw during ERP integrations at ClearTax is **explaining** each mismatch and getting someone to act; today that takes specialists and meetings.

## How it works
1. **AI engine (core):** bills are grouped by vendor; the LLM decides every bill (matched, same bill written differently, value mismatch, wrong tax type, GSTIN typo, duplicate, missing, credit note) with a reason and confidence.
2. **Guardrails:** every AI decision is checked against hard facts (amount within ₹2 or 0.1%, tax head, GSTIN, each bill used once). Wrong calls are corrected and logged.
3. **Human approval:** IMS actions and vendor messages need approval; everything is in an audit log.
4. **Baseline engine:** a deterministic engine runs alongside for comparison and as the fallback if the AI is unavailable.

## Results
| Test | Baseline engine | AI engine |
|---|---|---|
| Clean sample, 8 mismatch types (39 labels) | 100% | 100% (live run, 0 guardrail corrections) |
| Messy set, 1,040 bills (used to tune the baseline) | 100% (biased) | – |
| **Unseen messy set, 1,040 bills** | **96.7%** | handles the long tail the baseline misses |

What failed along the way: baseline v1 scored 88.6% on messy data (paise rounding, duplicates typed differently, same invoice number from two vendors, leading zeros). Fixed in v2. A first 100% was biased (tuned on the same data), so I re-tested on an unseen set. An early version used AI only for explanations; I moved AI to the core with guardrails.

## Try it yourself
Open the demo, upload `purchase_register.csv` + `gstr2b.csv` (+ optional `answer_key.csv`) from any folder in `test_pack/`, click **Run reconciliation**, then open **Self-check** for a live score. See `test_pack/README.txt`.
Run the baseline tests locally: `node tests/eval.js test_pack/3_unseen_holdout_1000_bills`

## Repo
`index.html` app · `engine.js` baseline engine and guardrail helpers · `api/ai.js` server function holding the LLM key · `tests/` evals · `test_pack/` labelled data · `docs/prompt_log.md` how AI tools were used at each step

## Deploy
Import into Vercel, add environment variable `GEMINI_API_KEY` (optional `GEMINI_MODEL`, default `gemini-2.5-flash`). Without a key the app runs on the baseline engine.
