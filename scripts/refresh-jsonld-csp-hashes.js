const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', '.tmp', 'node_modules']);
const JSON_LD_RE = /<script[^>]+type=(["'])application\/ld\+json\1[^>]*>([\s\S]*?)<\/script>/gi;
const CSP_META_RE = /<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]+content=(["'])([\s\S]*?)\1/i;
const HASH_RE = /'sha256-[A-Za-z0-9+/=]+'/g;

function htmlFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...htmlFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(target);
  }
  return files;
}

let changed = 0;
for (const file of htmlFiles(ROOT)) {
  let source = fs.readFileSync(file, 'utf8');
  const scripts = [...source.matchAll(JSON_LD_RE)];
  const cspMatch = source.match(CSP_META_RE);
  if (scripts.length === 0 || !cspMatch) continue;
  if (scripts.length !== 1) {
    throw new Error(`${path.relative(ROOT, file)}: expected one JSON-LD script, found ${scripts.length}`);
  }

  const hash = crypto.createHash('sha256').update(scripts[0][2]).digest('base64');
  const expected = `'sha256-${hash}'`;
  const csp = cspMatch[2];
  if (csp.includes(expected)) continue;

  const existingHashes = csp.match(HASH_RE) || [];
  if (existingHashes.length !== 1) {
    throw new Error(`${path.relative(ROOT, file)}: expected one CSP script hash, found ${existingHashes.length}`);
  }

  const nextCsp = csp.replace(HASH_RE, expected);
  source = source.replace(cspMatch[0], cspMatch[0].replace(csp, nextCsp));
  fs.writeFileSync(file, source);
  changed += 1;
}

console.log(`Refreshed JSON-LD CSP hashes in ${changed} HTML file(s).`);
