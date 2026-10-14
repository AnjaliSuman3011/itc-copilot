ITC Copilot – test pack (all data is synthetic; vendors and GSTINs are fictional)

How it works
Claude (the AI engine) reconciles every bill and explains each issue; guardrails check every AI decision; a deterministic
baseline engine runs alongside for comparison and as the fallback.
- Signed in to Claude: the AI engine runs automatically (it asks once to use your Claude account).
- Not signed in: the fallback engine runs on the same data; everything else works.
Note: the 1,000-bill packs make about 18 AI calls when signed in.

How to test
1. Open the ITC Copilot prototype link.
2. In the Data bar, upload a purchase_register.csv and the matching gstr2b file from one folder below.
3. (Optional) Upload that folder's answer_key.csv, then click "Run reconciliation".
4. Open the Self-check tab: "AI engine vs baseline engine" is scored live against the answer key in your browser.
You can also edit any CSV in Excel (change an amount, delete a bill, retype an invoice number), save as CSV and re-upload.

Folders
1_clean_sample            36 bills, 8 planted mismatch types. Baseline engine 100%; AI engine 100% in a live run on 15 Oct 2026.
2_messy_1000_bills        1,040 labelled bills with real-world noise: 7 invoice-number formats, paise rounding,
                          duplicates typed differently, GSTIN typos, same invoice number from two vendors.
                          This set was used to find v1's failures. Baseline engine: 100% (biased: used for tuning).
3_unseen_holdout_1000_bills  Fresh set, different random seed, plus a financial-year format the engine never saw
                          ("26-27" vs "2026-27"). Baseline engine: 96.7%; the long tail is what the AI engine handles. All baseline misses are safe misses (flagged for review,
                          never wrongly marked "credit safe").
4_portal_format           GSTR-2B laid out like the GST portal's B2B sheet (title rows, "GSTIN of supplier",
                          "Integrated Tax(₹)" headers, ₹ amounts with commas). One bill (GPT-1045) removed on purpose:
                          it should show as "Missing in 2B". No answer key.

Answer key format: _id, expected, pair_group. Rows marked "Duplicate pair" share a pair_group; the pair counts as
correct if one copy is flagged "Duplicate in books" and the other is matched.
