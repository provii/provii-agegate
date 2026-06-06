/**
 * Generate a SHA‑384 SRI hash for the built bundle.
 *
 * Run **after** `npm run build` so that dist/agegate.browser.js exists.
 *
 * Usage:
 *   npx ts-node scripts/generate-sri.ts
 *   (or just: npm run sri   – see package.json)
 *
 * It prints the exact <script> tag you need to paste into docs or
 * into the embedding site’s HTML template.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIST_FILE = join('dist', 'agegate.browser.js');

const bytes = readFileSync(DIST_FILE);
const hash = createHash('sha384').update(bytes).digest('base64');

console.log(`
Use this tag (copy–paste into the consumer site):

<script src="/static/agegate.browser.js"
        integrity="sha384-${hash}"
        crossorigin="anonymous"></script>

Add to HTTP response headers (or meta tag):

Content-Security-Policy: script-src 'self' 'sha384-${hash}';
`);
