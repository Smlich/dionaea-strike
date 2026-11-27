#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const releaseDir = path.join(rootDir, 'release');
const zipPath = path.join(releaseDir, 'dionaea-strike-poki.zip');

// Build production bundle with official Poki SDK v2 script injected into index.html
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['vite', 'build'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, POKI_BUILD: 'true' },
});

if (!fs.existsSync(distDir)) {
  console.error('ERROR: dist/ does not exist after vite build.');
  process.exit(1);
}

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('ERROR: dist/index.html is missing.');
  process.exit(1);
}

const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
const errors = [];

// 1. Verify Poki SDK v2 script tag
if (!indexHtml.includes('https://game-cdn.poki.com/scripts/v2/poki-sdk.js')) {
  errors.push('index.html is missing the official Poki SDK v2 script tag.');
}

// 2. Verify no forbidden external font/CDN links
if (/fonts\.googleapis\.com|fonts\.gstatic\.com/i.test(indexHtml)) {
  errors.push('index.html still references external Google Fonts (blocked by Poki CSP).');
}

// 3. Verify all local asset paths in index.html are relative (./)
const badAbsoluteAsset = indexHtml.match(/(?:src|href)=["']\/(?!\/)[^"']+["']/g);
if (badAbsoluteAsset && badAbsoluteAsset.length > 0) {
  errors.push(`index.html contains absolute root paths: ${badAbsoluteAsset.join(', ')}`);
}

// 4. Verify zero service workers in dist/
const allFiles = [];
function walk(dir, relBase = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      walk(abs, rel);
    } else {
      allFiles.push({ abs, rel, size: fs.statSync(abs).size });
    }
  }
}
walk(distDir);

const swFiles = allFiles.filter((f) => /(^|\/)(sw\.js|workbox-.*\.js|registerSW\.js)$/i.test(f.rel));
if (swFiles.length > 0) {
  errors.push(`Found custom Service Worker files in dist/: ${swFiles.map((f) => f.rel).join(', ')}`);
}

const leakedNames = allFiles.filter((f) => /aistudio|gemini/i.test(f.rel));
if (leakedNames.length > 0) {
  errors.push(`Found internal asset path names in dist/: ${leakedNames.map((f) => f.rel).join(', ')}`);
}

if (errors.length > 0) {
  console.error('POKI QA AUDIT FAILED:');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

// Package dist/ with index.html strictly at the root of the ZIP archive
execFileSync('python3', [
  '-c',
  `
import os, sys, zipfile
dist_dir, zip_path = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    for root, _, files in os.walk(dist_dir):
        for name in sorted(files):
            abs_path = os.path.join(root, name)
            rel_path = os.path.relpath(abs_path, dist_dir).replace(os.sep, '/')
            zf.write(abs_path, rel_path)
`,
  distDir,
  zipPath,
]);

const totalRawBytes = allFiles.reduce((acc, f) => acc + f.size, 0);
const zipBytes = fs.statSync(zipPath).size;

console.log('POKI QA AUDIT PASSED:');
console.log(`  - Files packaged: ${allFiles.length}`);
console.log(`  - Uncompressed dist/: ${(totalRawBytes / (1024 * 1024)).toFixed(2)} MB`);
console.log(`  - Release ZIP: release/dionaea-strike-poki.zip (${(zipBytes / (1024 * 1024)).toFixed(2)} MB)`);
