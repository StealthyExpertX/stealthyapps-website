const { execFileSync } = require('node:child_process');
const path = require('node:path');

// Keep the approved icon artwork; regenerate marketing only from current product captures.
for (const script of ['capture-fillpro-demo.js', 'render-fillpro-real-stills.js', 'render-fillpro-store-video.js', 'generate-fillpro-video-captions.js']) {
  execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', windowsHide: true });
}
