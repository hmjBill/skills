// grab-cookie.mjs - fetch the Canvas session cookie from the daily browser
// via the Chrome DevTools Protocol and store it for the cookie bridge.
//
// Requirements: Node 22+ (built-in WebSocket + fetch).
// Usage:        node grab-cookie.mjs
//
// Prints cookie NAMES and LENGTHS only - never values.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const EDGE_USER_DATA = join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'User Data');
const COOKIE_NAMES = ['canvas_session', '_csrf_token'];
const CANVAS_HOST = 'slcc.instructure.com';
const OUT_FILE = join(process.env.CANVAS_BRIDGE_DATA_DIR
  ?? join(process.env.ProgramData ?? 'C:\\ProgramData', 'CanvasCLI-Bridge'), 'cookie.json');

function die(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

// ---- 1. locate the DevTools endpoint ---------------------------------------
const portFile = join(EDGE_USER_DATA, 'DevToolsActivePort');
if (!existsSync(portFile)) {
  die(`no DevToolsActivePort file at ${portFile}.
The browser must be started with a remote-debugging port, e.g.:
  msedge.exe --remote-debugging-port=10273 --profile-directory=Default
Restart it that way, then run this script again.`);
}
const [port, wsPath] = readFileSync(portFile, 'utf8').split(/\r?\n/).filter(Boolean);
const wsUrl = `ws://127.0.0.1:${port}${wsPath}`;

// ---- 2. connect and read cookies -------------------------------------------
const ws = new WebSocket(wsUrl);
let msgId = 0;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method} - the browser is not `
          + `answering CDP on port ${port}. It was probably started WITHOUT `
          + `--remote-debugging-port. Restart it with that flag and retry.`));
      }
    }, 15000);
  });
}

ws.onerror = () => die(`cannot open WebSocket to ${wsUrl} - browser not in debug mode?`);

ws.onopen = async () => {
  try {
    const { cookies } = await send('Storage.getCookies');
    const picked = {};
    for (const name of COOKIE_NAMES) {
      const hit = cookies.find(c => c.name === name && (c.domain ?? '').includes(CANVAS_HOST));
      if (hit) picked[name] = hit.value;
    }
    if (!picked.canvas_session) {
      die(`found ${cookies.length} cookies but no canvas_session for ${CANVAS_HOST}. `
        + `Open Canvas in the browser and log in first.`);
    }

    // ---- 3. verify the cookie actually authenticates -----------------------
    const check = await fetch(`https://${CANVAS_HOST}/api/v1/users/self`, {
      headers: {
        'Cookie': Object.entries(picked).map(([k, v]) => `${k}=${v}`).join('; '),
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    let who = '(unverified)';
    if (check.ok) {
      const me = await check.json();
      who = `${me.name} (id ${me.id})`;
    } else {
      console.error(`WARN: cookie saved but upstream check returned HTTP ${check.status}`);
    }

    // ---- 4. persist --------------------------------------------------------
    writeFileSync(OUT_FILE, JSON.stringify({
      ...picked,
      fetched_at: new Date().toISOString(),
      source: `Edge CDP port ${port}`,
      canvas_host: CANVAS_HOST,
      verified_as: check.ok ? who : null,
    }, null, 2), { encoding: 'utf8' });

    console.log('saved:', OUT_FILE);
    for (const name of COOKIE_NAMES) {
      console.log(`  ${name.padEnd(16)} ${picked[name] ? `${picked[name].length} chars` : '(not found)'}`);
    }
    console.log('verified as:', who);
    process.exit(0);
  } catch (err) {
    die(err.message);
  }
};
