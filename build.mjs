#!/usr/bin/env node
/*
 * Optimally proposal builder.
 *   node build.mjs <data.json> [outDir]
 *
 * - Reads data.json (token map, keys = {{TOKEN}} names in template.html).
 * - Screenshots the live demo (DEMO_URL) unless SKIP_DEMO_SHOT is true or demo.png already exists.
 * - Fills template.html, strips em dashes (—) as a safety net, copies brand assets.
 * - Renders <outDir>/proposal.pdf with headless Chrome (falls back to Edge).
 *
 * Everything is resolved to absolute paths (headless Chrome refuses relative --print-to-pdf/--screenshot).
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(process.argv[2] || 'data.json');
const outDir = resolve(process.argv[3] || dirname(dataPath));

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  // Windows
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  // Linux (cloud routines)
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
  // macOS
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!CHROME) throw new Error('No Chrome or Edge found. Install Chrome/Chromium or set CHROME_PATH to its binary.');

const fileUrl = (abs) => 'file:///' + abs.replace(/\\/g, '/').replace(/ /g, '%20');
const run = (args) => execFileSync(CHROME, args, { stdio: ['ignore', 'ignore', 'ignore'] });

// ---- load data ----
const data = JSON.parse(readFileSync(dataPath, 'utf8'));
const demoPng = join(outDir, 'demo.png');

// ---- 1. screenshot the live demo ----
if (!data.SKIP_DEMO_SHOT && data.DEMO_URL && !existsSync(demoPng)) {
  console.log(`[shot] ${data.DEMO_URL}`);
  run([
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=2', '--window-size=1280,840', '--virtual-time-budget=3500',
    `--screenshot=${demoPng}`, data.DEMO_URL,
  ]);
}
if (!existsSync(demoPng)) console.warn('[warn] no demo.png — page 2 image frame will be blank.');

// ---- 2. fill template ----
let html = readFileSync(join(SKILL_DIR, 'template.html'), 'utf8');
for (const [key, val] of Object.entries(data)) {
  if (key === key.toUpperCase()) html = html.replaceAll(`{{${key}}}`, String(val));
}
const leftover = [...html.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]);
if (leftover.length) console.warn('[warn] unfilled tokens:', [...new Set(leftover)].join(', '));

// ---- 3. em-dash safety net (must never ship) ----
const emCount = (html.match(/—/g) || []).length;
if (emCount) { html = html.replace(/\s*—\s*/g, ', '); console.warn(`[guard] replaced ${emCount} em dash(es) with commas — review the copy.`); }

// ---- 4. write html + assets (copy everything in assets/: logo, mark, video thumbs) ----
const assetsDir = join(SKILL_DIR, 'assets');
for (const f of readdirSync(assetsDir)) copyFileSync(join(assetsDir, f), join(outDir, f));
const htmlPath = join(outDir, 'proposal.html');
writeFileSync(htmlPath, html);

// ---- 5. render pdf ----
const pdfPath = join(outDir, 'proposal.pdf');
run(['--headless=new', '--disable-gpu', '--no-sandbox', '--no-pdf-header-footer', `--print-to-pdf=${pdfPath}`, fileUrl(htmlPath)]);
console.log(`[done] ${pdfPath}`);
