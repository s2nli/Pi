const { Readable } = require('stream');

const ORIGIN = () => (process.env.UPSTREAM_ORIGIN || 'https://pi-pro.space-z.ai').replace(/\/$/, '');

const SKIP_REQ = new Set(['host', 'connection', 'content-length', 'accept-encoding', 'cookie', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-vercel-id', 'x-real-ip', 'referer', 'origin']);
const SKIP_RES = new Set(['content-encoding', 'content-length', 'transfer-encoding', 'connection', 'set-cookie', 'access-control-allow-origin', 'content-security-policy']);

async function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

// Forward any request to upstream, keeping path + query, and stream the response back.
async function forward(req, res, path) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const target = `${ORIGIN()}${path || url.pathname}${url.search}`;

  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!SKIP_REQ.has(k.toLowerCase())) headers[k] = v;
  }
  headers['user-agent'] = headers['user-agent'] || 'Mozilla/5.0';
  headers['origin'] = ORIGIN();
  headers['referer'] = ORIGIN() + '/';

  try {
    const body = await readBody(req);
    const up = await fetch(target, { method: req.method, headers, body, redirect: 'follow' });

    res.statusCode = up.status;
    up.headers.forEach((v, k) => {
      if (!SKIP_RES.has(k.toLowerCase())) res.setHeader(k, v);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', '*');

    if (!up.body || req.method === 'HEAD') return res.end();
    Readable.fromWeb(up.body).pipe(res);
  } catch (err) {
    res.status(502).json({ success: false, error: err.message || 'Proxy failed' });
  }
}

// Turn upstream-pointing / relative media URLs into URLs on our own domain,
// so the browser never talks to upstream directly (no CORS / mixed-origin problems).
function localize(value, ownOrigin) {
  if (typeof value !== 'string') return value;
  if (value.startsWith('/') && !value.startsWith('//')) return ownOrigin + value;
  if (value.startsWith(ORIGIN())) return ownOrigin + value.slice(ORIGIN().length);
  return value;
}

module.exports = { forward, localize, ORIGIN };
