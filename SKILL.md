---
name: proposal
description: >-
  Generate a premium, on-brand Optimally PDF proposal for a prospect for the £2,500 Conversion
  Ecosystem (90-day booked-calls engagement), end to end. Use whenever the user wants a proposal,
  pitch document, or "proposal PDF" for a named prospect or company after a sales call, e.g.
  "build a proposal for Ross Powell", "make the Survival 401k proposal", "put together a proposal
  for <company>", "proposal on autopilot for <prospect>". Pulls the call data from Baserow Sales
  Call Data, finds and screenshots the prospect's live demo from the CRM, writes the tailored copy
  (external-cause diagnosis, conservative ROI on their own numbers, objection-matched FAQ), and renders
  a 7-page branded PDF. Optimally-internal.
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
| Public repo | `github.com/ReubenShears/proposal-skill` — self-contained; a routine `git clone`s this and runs `build.mjs` from the clone root |
| Output dir | `D:\Claude Cowork\proposals\<slug>\` (create it; `<slug>` = kebab company, e.g. `survival-401k`) |
| Delivery (Drive) | finished PDF uploads to the Google Drive **Proposals** folder, id `17Np2D13OsubTeWe0xwqK6-4d219hiVbZ` |
| Baserow — Sales Call Data | table `1028550` (the call transcript + structured KPI fields) |
| Baserow — Objection Data | table `1028590` (objections raised, linked from the call row) |
| CRM (GoHighLevel) | LeadConnector MCP `2a59a55b-bfd6-44e2-bc09-85d430112b39` (via ghl-proxy). Demo URL custom field id **`6dtdKnKMkB659ZVlsRof`** |
| Baserow — Demo Landing Page Data | table `1024310` (fallback source for the demo URL) |
| Baserow — Proposals Data | table `1079548` (one row per proposal produced; `Sales Call` is a link to Sales Call Data, `Date Created` is auto) |
| Slack notify | `#5-asset-generation` (id `C0AN653QCF2`), asset-house notification format (see below) |
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

**5. Deliver.** Interactive: render the pages to PNG for a visual check (below), fix anything, then `SendUserFile` the PDF. Then (both modes):
  a. **Host the PDF (canonical link, MUST succeed)** — git-push it to `ReubenShears/demos` at `proposals/<slug>.pdf`; it serves at `https://demos.optimally.ltd/proposals/<slug>.pdf`. That URL is the Proposal PDF link everywhere below. **NEVER upload the PDF through the native Google Drive MCP — it requires inline base64 and a real PDF is far too large for a single turn. Do not attempt it.**
  b. **Google Drive** — also upload the local PDF into the **Proposals** folder (id `17Np2D13OsubTeWe0xwqK6-4d219hiVbZ`) via the **Composio** Google Drive upload action (server-side, from the file — not base64).
  c. **Baserow** — create a row in **Proposals Data** (`1079548`): Prospect Name, Company, Quoted Ticket (e.g. `£2,500`), Demo URL, Proposal PDF = the **hosted URL**, Status = `Rendered`, Sales Call = link to the Sales Call Data row (by id), Notes. (`Date Created` is auto.)
  d. **Slack** — post the proposal notification to `#5-asset-generation` in the asset-house format (below), linking the hosted URL.

Render pages to check:
```
python -c "import fitz; d=fitz.open(r'<outDir>\proposal.pdf'); [p.get_pixmap(dpi=110).save(rf'<outDir>\pg{i+1}.png') for i,p in enumerate(d)]"
```

## Running in a routine (headless, self-contained)

**The routine's only input is the lead's name (text).** Everything else is pulled from that. Everything
needed to build ships in the public repo.

1. `git clone https://github.com/ReubenShears/proposal-skill` (or reuse a cached clone). `build.mjs`,
   `template.html`, and `assets/` sit at the repo root, so run `build.mjs` from there.
2. From the **name**, gather the full context (workflow steps 1-2): the **Sales Call Data** row (transcript
   + KPIs), the **GHL contact** (and its demo URL), and the **live demo itself**. Actually read the deployed
   demo page, not just screenshot it: it already encodes the prospect's offer, positioning, and audience
   (a lot of the research was done when it was built), and combined with the call transcript it is what
   makes the tailored copy sharp. Then write `data.json` (step 3).
3. `node <repo>/build.mjs <data.json> <outDir>` → produces `proposal.pdf`.
4. Deliver all three (step 5): upload to the Drive **Proposals** folder, log a row in Baserow **Proposal
   Data**, and post the Slack notification.

**Runtime requirements (the routine's environment must have these):**
- **Node.js** — `build.mjs` uses only Node built-ins (`fs`, `child_process`, `path`, `url`). No `npm install`, no third-party packages.
- **Headless Chrome, Chromium, or Edge** — used for the demo screenshot and the PDF render. `build.mjs` auto-detects common Windows/Linux/macOS paths; if it is elsewhere, set `CHROME_PATH` to the binary. **This is the one hard external dependency — if the routine box has no Chrome/Chromium, install it or point `CHROME_PATH` at one.**
- **Network egress** — Chrome fetches the Inter web font (Google Fonts) at render time. The demo screenshot is NOT taken by Chrome in the sandbox (egress to `demos.optimally.ltd` is blocked); it comes from Firecrawl (see Sandbox constraints below).
- **MCP connectors** — Baserow (call data), GoHighLevel (demo URL), **Firecrawl** (read demo + screenshot it), **Composio** (Drive upload), plus a `GITHUB_TOKEN` for the git-host. Interactively-authenticated MCP servers can be absent in a headless run; confirm these are available to the routine.

**Preconditions:** the prospect must already have (a) a logged **Sales Call Data** row and (b) a **deployed demo** (its URL in the CRM). If either is missing, the routine cannot build a complete proposal — surface that rather than shipping a half-built one.

### Sandbox constraints (learned from live routine runs — follow these, they will save the run)
- **No system Chrome, but Playwright's Chromium is present.** Run `npx playwright install chromium` if needed and set `CHROME_PATH` to that binary before `build.mjs`.
- **Direct egress to `demos.optimally.ltd` is BLOCKED** by org sandbox policy (do not try to bypass it). Two consequences:
  1. **Read the demo page via Firecrawl**, not WebFetch or a direct fetch (those 403 / are denied).
  2. **`build.mjs`'s own Chrome-on-live-URL screenshot will fail.** Instead capture the demo screenshot via **Firecrawl** (screenshot the demo URL — the returned image is on an allow-listed host), save it as `demo.png` in the output dir, and set `"SKIP_DEMO_SHOT": true` in `data.json` so `build.mjs` uses your `demo.png` instead of trying to fetch the blocked URL.
- **The native Google Drive MCP requires inline base64** and cannot take a real PDF (too large for a turn). Deliver server-side only: **git-host** (canonical link) + **Composio** Drive upload. Never inline-base64 the PDF, and never get stuck on delivery.
- **git-host details:** remote `https://x-access-token:${GITHUB_TOKEN}@github.com/ReubenShears/demos.git`, commit author `132842611+ReubenShears@users.noreply.github.com` (Vercel blocks other authors), push to `main`. Path `proposals/<slug>.pdf` → `https://demos.optimally.ltd/proposals/<slug>.pdf`.

## Slack notification format

Post to `#5-asset-generation` in the asset-house style (Slack mrkdwn: `*bold*`, `<url|label>`, `>` quote
lines, `·` separators, no em dashes). Fields adapt per prospect. End with the `*Sent using* Claude [BST timestamp]` footer.

```
:page_facing_up: *New Proposal*

*Survival 401k*   `survival401k`

> :bust_in_silhouette:  *Prepared for:*  Ross Powell
> :moneybag:  *Price:*  £2,500  (~$3,000)
> :chart_with_upwards_trend:  *Conservative floor:*  ~$10,500 from 5 guaranteed calls
> :globe_with_meridians:  *Demo:*  <https://demos.optimally.ltd/survival401k|demos.optimally.ltd/survival401k>
> :page_facing_up:  *Proposal PDF:*  <drive-link|View PDF>
> :white_check_mark:  *Status:*  Rendered · Saved to Drive · Logged to Baserow
*Sent using* Claude [2026-07-15 12:00:00 BST]
```

## Copy rules (non-negotiable — these are why the proposal works)

- **Offer model (current — read this first).** The traffic engine is **Meta ads, which we build and run end
  to end; the client funds the ad spend (minimum $50/day)**. The **reactivation newsletter is included FREE
  on top** (a cost-softener that lowers their blended cost per lead), NOT the guarantee-carrier. The
  **guarantee is conditional on that minimum spend**: "5 booked calls in 90 days on $50/day or more of ad
  spend, or we keep working free." The **£2,500 fee is separate from ad spend** and covers the system +
  management + guarantee. Never frame ads as "optional" or the newsletter as "carrying the calls" — that is
  the old model.
- **No em dashes. Ever.** They read as AI. Use commas, periods, or colons. Ranges use "to" or a hyphen
  ("85 to 90 percent", "10-20"). The build script strips them as a last resort and warns; never lean on it.
- **The prospect's company is the hero, not Optimally.** It is their document. The cover name is huge;
  every page header says "Proposal for <Company>".
- **Diagnose without blame. Point the finger outward.** Credit what is strong (delivery, close rate,
  track record). Attribute the gap to external causes (channels drying up, a revenue stream falling away,
  no structured system feeding the funnel). Never write "you have a problem" or accusatory "you". The
  headline must not be fluffy and must not read as insulting, and must **never use "the hard part"** (safe
  default: `Almost everything is already in place.`). **Keep DIAGNOSIS_BODY to 4 sentences / ~75 words** —
  page 2 is a fixed A4 box; a long diagnosis overflows it (the template hard-clamps it, so an over-long one
  gets clipped). Pick the essentials, do not narrate the whole call.
- **ROI is illustrated, never promised.** Only the 5 booked calls are guaranteed. Label the return line
  "Estimated" and keep the disclaimer that the figures come from the numbers they provided.
- **Conservative-ROI rule (the whole game) — the shown floor is ALWAYS a clear win, never weak, break-even,
  or negative.** Work it backwards: the illustrated floor revenue (5 × cut-close-rate × average ticket) MUST
  land at **≥ 2× the fee** (≥ ~$6,000 against the ~£2,500 / $3,000 price). Sandbag the close rate DOWN from
  their stated number for credibility, but only as far as that 2× floor still holds — use the **highest
  credible rate at or below their stated rate that keeps the floor ≥ 2×** (e.g. 85-90% → 60%). Use their
  **average ticket** (not top LTV), round clients **down**. The kicker line then shows the same maths at
  their real rate (a bigger multiple).
  **Hard guardrail, never violate:** the breakdown must never display a floor at or below the fee, a return
  under 2×, or anything that reads as negative or break-even. `ROI_MULTIPLE` ≥ 2× and `ROI_FLOOR_REV` ≥ 2×
  the fee, always. If even their FULL stated close rate × average ticket cannot reach 2× the fee (a genuinely
  low-ticket prospect who does not belong in this high-ticket pipeline), do NOT render a weak ROI table —
  flag the prospect as unfit for this offer and stop, rather than show an unconvincing number.
- **FAQ = their actual objections.** Pull from the linked Objection Data + transcript. Do not invent
  generic FAQs. Answer each the way the pitch-flow doc prescribes.
- **Next step = the real next step** from the call row (usually a decision on the follow-up call). Do not
  reference internal mechanics (e.g. granting Framer access).
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
| DIAGNOSIS_HEADLINE | The situation headline. External, complimentary, unambiguous. **NEVER use "the hard part" / "hard part is..."** (it reads as calling our funnel the hard part) and never accusatory "you". Safe, on-message default: `Almost everything is already in place.` |
| DIAGNOSIS_BODY | **HARD CAP: 4 sentences, ~75 words max** (match `example.json` length — it MUST fit ~5 lines; page 2 is a fixed box and the template clamps it). What is proven, what slowed (external cause), the one gap left. Do not list every detail from the call — pick the essentials and keep it tight. |
| STAT1/2/3_NUM, _UNIT, _LABEL | Three skimmable proof stats (track record, close rate, current vs target volume) |
| DEMO_INTRO | One line introducing the funnel screenshot |
| DEMO_URL / DEMO_LINK_TEXT | Live demo URL (also the screenshot source) + its display text |
| GAP1_WHAT / GAP1_WHY / GAP1_RESULT | Offer gap, tailored (reference their failed ads if any) |
| GAP2_WHAT / GAP2_WHY / GAP2_RESULT | Video gap, tailored (reference their close rate) |
| GAP3_WHAT / GAP3_BONUS / GAP3_RESULT | Traffic gap. WHAT = we build and run their **Meta ads** end to end (the core engine; **they fund the ad spend, from $50/day**, we manage everything). GAP3_BONUS = the **reactivation newsletter, now FREE on top** (lowers their blended cost per lead; it is NOT the guarantee-carrier anymore). RESULT = the guaranteed calls from a scalable engine they control. |
| ROI_INTRO | Sets up the conservative assumption. Ends "Only the five booked calls are guaranteed." |
| ROI_REAL_RANGE / ROI_CLOSE / ROI_TICKET | Their real close range, the cut rate used, the average ticket |
| ROI_FLOOR_CLIENTS / ROI_FLOOR_REV / ROI_INVEST / ROI_MULTIPLE | Computed floor figures + investment + estimated multiple. **ROI_MULTIPLE must be ≥ 2× and ROI_FLOOR_REV ≥ 2× the fee — never a sub-2×, break-even, or negative return** (see the conservative-ROI rule). |
| ROI_KICKER | "And that is the floor..." the same maths at their real rate |
| PRICE_MAIN / PRICE_SUB / PRICE_EXPLANATION | £2,500 primary, approx $3,000 sub. EXPLANATION: the fee is ~$1,000/mo to build and run the whole system and generate the conservative floor (e.g. $10,500); **ad spend is SEPARATE and the client's, from $50/day**. Lead with "We bill in GBP." |
| FAQ1..5_Q / FAQ1..5_A | Five Q&A matched to their real objections |
| NEXT_STEP_BODY | The actual next step + decision ask |
| SIGN_NAME / SIGN_ROLE | "Reuben Shears" / "Founder, Optimally" |

## Fixed content (baked into template.html, do not tokenise)

Standard for every proposal, edit `template.html` (or `assets/`) to change them for all future proposals:
- The three "missing" warning cards, guarantee wording, shell/parked-car line, ROI disclaimer.
- **Deliverables** (page 6): 9-item 2-column grid + the 4-step **connected timeline** (Day 1 onboarding, Day 7 funnel live, Days 7-90 traffic sprint, Day 90 ROI + long term; dotted line links the nodes). Meta ad management is a **core included** deliverable (client funds spend); the reactivation newsletter is **free on top**. Revenue-share positioning is folded into the Day 90 milestone, no separate band.
- **Proof page** (page 5): three client results with square headshots (`assets/liam.jpg` Liam Evans / Unorthodox Digital $40k→$180k/mo + quote, `assets/kasey.jpg` Kasey Jones / Essentialist CEO $0→$40k/mo ~550 leads/mo, `assets/matt.jpg` Matthew DiMarcantonio / Ember $50k→$90k/mo), then a link to more results at optimally.ltd/success.
- **"See how we operate" videos** (bottom of the Proof page): three Reuben Shears YouTube videos. Thumbnails live in `assets/vid1.jpg` (QtrBokKeTyg), `vid2.jpg` (3Uu31_SIVLI), `vid3.jpg` (fuV46q7BPpI); links are hardcoded in the template. Re-download a thumbnail with `curl -sfL https://img.youtube.com/vi/<id>/maxresdefault.jpg` (fall back to `hqdefault.jpg`).
- **Live calculator link**: a CTA block under the ROI model (page 4) linking `https://demos.optimally.ltd/calculator`.
- **Referral offer** (page 6, under the price): introduce another business owner via a three-way WhatsApp; if they close, £500 (~$700) off the engagement, refunded on their close.

`build.mjs` copies every file in `assets/` into the output dir, so add an asset there and reference it by filename.

## Notes

- **Fonts are bundled** — Inter ships as `assets/inter-400/500/600/700.woff2` and loads via local `@font-face`. **Never reintroduce a Google Fonts `@import` or any web-font URL:** in a sandbox the fetch is blocked, Chromium falls back to a wider font, and the copy overflows the fixed-height page boxes (footer bleeds through content, metrics wrap, text clips). Local fonts make every render byte-identical regardless of environment.
- **Each `.page` is a FIXED 297mm box with `overflow:hidden`** — anything too long is clipped and the footer sits on top of it. So **match the reference `example.json` lengths closely** (the SITUATION and GAPS prose especially — do not run ~50%+ longer). After rendering, **check every page** (render to PNG): if any footer overlaps content or text is cut off, tighten that page's copy and re-render until all pages fit. Tighten prose, never shrink fonts.
- The demo screenshot is capped at 70mm and top-cropped.
- To evolve the design for all proposals, edit `template.html`. To change the offer/pitch itself, edit the
  master `D:\Claude Cowork\Conversion-Ecosystem-Offer-Pitch-Flow.md` first, then this skill's copy rules.
