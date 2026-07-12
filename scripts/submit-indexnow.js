const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const HOST = 'stealthyapps.com';
const KEY = '6a8bacc93dd54d8d2e9d685deb98159a40be6fa6023b7f5d';
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const DRY_RUN = process.argv.includes('--dry-run');

function sitemapUrls(file) {
  const xml = fs.readFileSync(path.join(ROOT, file), 'utf8');
  return [...xml.matchAll(/<loc>(https:\/\/stealthyapps\.com\/[^<]+)<\/loc>/g)].map((match) => match[1]);
}

const urlList = [...new Set([
  'https://stealthyapps.com/',
  ...sitemapUrls('sitemap.xml'),
  ...sitemapUrls('sitemap-locales.xml'),
])].filter((url) => new URL(url).hostname === HOST);

if (!urlList.length) throw new Error('No canonical URLs found for IndexNow submission.');

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList,
};

if (DRY_RUN) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload),
}).then(async (response) => {
  const body = await response.text();
  if (!response.ok) throw new Error(`IndexNow returned ${response.status}: ${body || response.statusText}`);
  console.log(`IndexNow accepted ${urlList.length} canonical URLs (${response.status}).`);
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
