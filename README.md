# proposal-skill

Claude Code skill that turns a prospect (name or company) into a premium, on-brand **Optimally** PDF
proposal for the £2,500 **Conversion Ecosystem** (90-day booked-calls engagement), end to end.

The design is fixed in `template.html`; the skill's job is to gather the prospect's real data, write the
tailored copy into a `data.json`, and run `build.mjs`, which screenshots the live demo, fills the template,
guards against em dashes, and renders a 7-page branded PDF.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | Agent-facing instructions: data sources, workflow, copy rules, token reference |
| `template.html` | The locked 7-page proposal (tokenised with `{{TOKENS}}`) |
| `build.mjs` | `node build.mjs <data.json> <outDir>` — screenshot demo, fill tokens, em-dash guard, render PDF |
| `references/pitch-flow.md` | The master offer / pitch spec the copy follows |
| `assets/` | Brand assets: `logo.avif`, `mark.avif`, and the three "how we operate" video thumbnails |
| `examples/example.json` | Generic reference example (fictional) showing the token structure and tone |

## Usage

```bash
node build.mjs examples/example.json ./out
```

Requires headless Chrome or Edge (auto-detected; override with `CHROME_PATH`). Finished proposals are
delivered to Google Drive, not committed here.

## Copy rules (enforced)

No em dashes. Diagnose external causes, never blame the prospect. The company is the hero. ROI is
illustrated on the prospect's own numbers, never promised (only the 5 booked calls are guaranteed).
See `SKILL.md` for the full rules and token reference.

_Optimally-internal._
