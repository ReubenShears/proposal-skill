---
name: proposal
description: >-
  Generate a premium, on-brand Optimally PDF proposal for a prospect for the £2,500 Conversion
  Ecosystem (90-day booked-calls engagement), end to end. Use whenever the user wants a proposal,
  pitch document, or "proposal PDF" for a named prospect or company after a sales call, e.g.
  "build a proposal for Ross Powell", "make the Survival 401k proposal", "put together a proposal
  for <company>", "proposal on autopilot for <prospect>". Pulls the call data from Baserow Sales
  Call Data, finds and screenshots the prospect's live demo from the CRM, writes the tailored copy
  (external-cause diagnosis, conservative ROI on their own numbers, objection-matched FAQ, a genuine
  personal P.S.), and renders a 7-page branded PDF. Optimally-internal.
user-invocable: true
---

# Optimally Proposal Builder

One prospect (name or company) becomes a finished, 6-page, on-brand PDF proposal for the **Conversion
Ecosystem** (£2,500 / ~$3,000, 90-day engagement, 5-booked-calls guarantee).

**How it works:** the design is fixed in `template.html`. Claude's only job is to (1) gather the
prospect's real data, (2) write the tailored copy into a `data.json`, and (3) run `build.mjs`, which
screenshots the live demo, fills the template, guards against em dashes, and renders the PDF. The
proposal is a between-calls bridge and a pre-loaded close, so the copy must be tight, specific to the
prospect, and grounded in what they actually said on the call.

Read `references/pitch-flow.md` first — it is the source of truth for the offer, the three gaps, the
guarantee, the conservative-ROI rule, and the objection pre-handles.

## Fixed configuration (Optimally)

| Thing | Value |
|---|---|
| Skill dir | `C:\Users\Reubs\.claude\skills\proposal` (template.html, build.mjs, assets/, references/, examples/) |
| Output dir | `D:\Claude Cowork\proposals\<slug>\` (create it; `<slug>` = kebab company, e.g. `survival-401k`) |
| Baserow — Sales Call Data | table `1028550` (the call transcript + structured KPI fields) |
| Baserow — Objection Data | table `1028590` (objections raised, linked from the call row) |
| CRM (GoHighLevel) | LeadConnector MCP `2a59a55b-bfd6-44e2-bc09-85d430112b39` (via ghl-proxy). Demo URL custom field id **`6dtdKnKMkB659ZVlsRof`** |
| Baserow — Demo Landing Page Data | table `1024310` (fallback source for the demo URL) |
| Offer / pitch spec | `references/pitch-flow.md` (mirror of `D:\Claude Cowork\Conversion-Ecosystem-Offer-Pitch-Flow.md`) |
| Price | **£2,500** primary, **approx $3,000** secondary. Never lead with the dollar figure. |
| Renderer | headless Chrome (build.mjs auto-detects Chrome then Edge; override with `CHROME_PATH`) |

## Workflow

Work in order; short status lines as you go.

**1. Resolve the prospect → the call row.**
`list_table_rows` on Baserow table `1028550` with `search` = the prospect or company name. Pull the row.
You need: Prospect Name, Company, Role, Core Problem, Client Acquisition Method, Client Flow, Stated
Goal, LTV / Current Offer (for average ticket), close rate (from Discovery/Summary), the why-now
(Problem Implications & Personal Stakes), Next Step / Next Step Date, and the linked Objection Data.

**2. Find + confirm the demo URL.**
Search the CRM: `contacts_get-contacts` with the prospect name → read custom field `6dtdKnKMkB659ZVlsRof`
(the deployed demo URL, e.g. `https://demos.optimally.ltd/<slug>`). If absent there, check Baserow
table `1024310`. If there is genuinely no demo yet, tell the user — the proposal's page 2 needs it (run
the `vsl-funnel-demo` skill first, or proceed with `SKIP_DEMO_SHOT: true` and a blank frame).

**3. Write `data.json`** (in the output dir) — every token below. This is the real work. Follow the
copy rules. Use `examples/example.json` as the reference for tone, length, and structure. (A real prior
build, `examples/survival401k.json`, may exist locally but is kept out of the public repo.)

**4. Build.**
`node "C:\Users\Reubs\.claude\skills\proposal\build.mjs" "<outDir>\data.json" "<outDir>"`
It screenshots the demo, fills the template, copies assets, guards em dashes, renders `proposal.pdf`.
Watch its stderr: `[warn] unfilled tokens` means a token is missing; `[guard] replaced N em dash(es)`
means you left an em dash in the copy — go fix the source text, do not rely on the guard.

**5. Deliver.** Render the pages to PNG for a visual check (see below), fix anything, then `SendUserFile`
the PDF. Do not auto-send until you have eyeballed the pages.

Render pages to check:
```
python -c "import fitz; d=fitz.open(r'<outDir>\proposal.pdf'); [p.get_pixmap(dpi=110).save(rf'<outDir>\pg{i+1}.png') for i,p in enumerate(d)]"
```

## Copy rules (non-negotiable — these are why the proposal works)

- **No em dashes. Ever.** They read as AI. Use commas, periods, or colons. Ranges use "to" or a hyphen
  ("85 to 90 percent", "10-20"). The build script strips them as a last resort and warns; never lean on it.
- **The prospect's company is the hero, not Optimally.** It is their document. The cover name is huge;
  every page header says "Proposal for <Company>".
- **Diagnose without blame. Point the finger outward.** Credit what is strong (delivery, close rate,
  track record). Attribute the gap to external causes (channels drying up, a revenue stream falling away,
  no structured system feeding the funnel). Never write "you have a problem" or accusatory "you". The
  headline must not be fluffy and must not read as insulting.
- **ROI is illustrated, never promised.** Only the 5 booked calls are guaranteed. Label the return line
  "Estimated" and keep the disclaimer that the figures come from the numbers they provided.
- **Conservative-ROI rule (the whole game):** take their stated close rate and cut it well below their own
  expectation, as high as stays credible but clearly under their number (e.g. 85-90% → 60%). Use their
  **average ticket**, not top-end LTV. Round clients **down**. The floor revenue (5 × cut-rate × ticket)
  must still clear the ~$3,000 fee comfortably (aim 2x+). Then the kicker line shows the same maths at
  their real rate. If the floor does not clear the fee, the prospect is likely a poor fit — flag it.
- **FAQ = their actual objections.** Pull from the linked Objection Data + transcript. Do not invent
  generic FAQs. Answer each the way the pitch-flow doc prescribes.
- **Next step = the real next step** from the call row (usually a decision on the follow-up call). Do not
  reference internal mechanics (e.g. granting Framer access).
- **The P.S. is optional, and only genuine.** Include one ONLY if there is a real, specific moment from the
  transcript worth naming, something about the person's character or values that actually resonated. If there
  is nothing genuine to say, **omit `PS_BODY` entirely** (leave the key out of data.json) and the block drops
  automatically. Never force a generic P.S.; a fake one does more harm than none. If it could apply to anyone,
  it is wrong, cut it.
- Brand voice: we/you, confident, specific numbers, Title Case headlines, no "supercharge/unlock", no
  exclamation marks, no emoji in flow text.

## Token reference (keys in data.json)

All keys are UPPERCASE. Values may contain inline HTML (`<strong>`, `<br>`) and HTML entities
(`&#8776;` = ≈, `&#215;` = ×). Control key `SKIP_DEMO_SHOT: true` skips the screenshot.

| Token | What goes in it |
|---|---|
| COMPANY | Full company name (used in page headers + alt text) |
| COMPANY_LEAD / COMPANY_TAIL | Cover name split; TAIL is highlighted olive (e.g. "Survival" / "401k") |
| COVER_SUB | One-line outcome subhead. Not fluffy, not offensive. |
| PREPARED_FOR / PREPARED_BY / DATE | Cover meta |
| REVIEW_LABEL / REVIEW_VALUE | 4th meta cell (e.g. "Review call" / "Friday") |
| DIAGNOSIS_HEADLINE | The situation headline. External, complimentary, unambiguous. |
| DIAGNOSIS_BODY | 4-5 tight sentences: what is proven, what slowed (external cause), the one gap left. |
| STAT1/2/3_NUM, _UNIT, _LABEL | Three skimmable proof stats (track record, close rate, current vs target volume) |
| DEMO_INTRO | One line introducing the funnel screenshot |
| DEMO_URL / DEMO_LINK_TEXT | Live demo URL (also the screenshot source) + its display text |
| GAP1_WHAT / GAP1_WHY / GAP1_RESULT | Offer gap, tailored (reference their failed ads if any) |
| GAP2_WHAT / GAP2_WHY / GAP2_RESULT | Video gap, tailored (reference their close rate) |
| GAP3_WHAT / GAP3_BONUS / GAP3_RESULT | Traffic gap (newsletter included; ads optional bonus) |
| ROI_INTRO | Sets up the conservative assumption. Ends "Only the five booked calls are guaranteed." |
| ROI_REAL_RANGE / ROI_CLOSE / ROI_TICKET | Their real close range, the cut rate used, the average ticket |
| ROI_FLOOR_CLIENTS / ROI_FLOOR_REV / ROI_INVEST / ROI_MULTIPLE | Computed floor figures + investment + estimated multiple |
| ROI_KICKER | "And that is the floor..." the same maths at their real rate |
| PS_BODY | **Optional.** A genuine, personal P.S. referencing something real from the call. Include ONLY if there is something true and specific worth saying; otherwise omit the key entirely and the block is dropped. Never generic. |
| PRICE_MAIN / PRICE_SUB / PRICE_EXPLANATION | £2,500 primary, approx $3,000 sub, the value framing (~£830/mo) |
| FAQ1..5_Q / FAQ1..5_A | Five Q&A matched to their real objections |
| NEXT_STEP_BODY | The actual next step + decision ask |
| SIGN_NAME / SIGN_ROLE | "Reuben Shears" / "Founder, Optimally" |

## Fixed content (baked into template.html, do not tokenise)

Standard for every proposal, edit `template.html` (or `assets/`) to change them for all future proposals:
- The three "missing" warning cards, guarantee wording, shell/parked-car line, ROI disclaimer.
- **Deliverables** (page 6): 9-item 2-column grid + the 4-step **connected timeline** (Day 1 onboarding, Day 7 funnel live, Days 7-90 newsletter sprint, Day 90 ROI + long term; dotted line links the nodes). Revenue-share positioning is folded into the Day 90 milestone, no separate band.
- **Proof page** (page 5): three client results with square headshots (`assets/liam.jpg` Liam Evans / Unorthodox Digital $40k→$180k/mo + quote, `assets/kasey.jpg` Kasey Jones / Essentialist CEO $0→$40k/mo ~550 leads/mo, `assets/matt.jpg` Matthew DiMarcantonio / Ember $50k→$90k/mo), then a link to more results at optimally.ltd/success.
- **"See how we operate" videos** (bottom of the Proof page): three Reuben Shears YouTube videos. Thumbnails live in `assets/vid1.jpg` (QtrBokKeTyg), `vid2.jpg` (3Uu31_SIVLI), `vid3.jpg` (fuV46q7BPpI); links are hardcoded in the template. Re-download a thumbnail with `curl -sfL https://img.youtube.com/vi/<id>/maxresdefault.jpg` (fall back to `hqdefault.jpg`).
- **Live calculator link**: a CTA block under the ROI model (page 4) linking `https://demos.optimally.ltd/calculator`.
- **Referral offer** (page 6, under the price): introduce another business owner via a three-way WhatsApp; if they close, £500 (~$700) off the engagement, refunded on their close.

`build.mjs` copies every file in `assets/` into the output dir, so add an asset there and reference it by filename.

## Notes

- Page fit is tuned so each section is exactly one A4 page (6 total). If tailored copy overflows, tighten
  the prose rather than shrinking fonts. The demo screenshot is capped at 70mm and top-cropped.
- To evolve the design for all proposals, edit `template.html`. To change the offer/pitch itself, edit the
  master `D:\Claude Cowork\Conversion-Ecosystem-Offer-Pitch-Flow.md` first, then this skill's copy rules.
