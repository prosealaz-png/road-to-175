// Road to 175 sync: one JSON blob per passphrase hash, stored in KV.
// GET  /v1/<key>  -> { state, updatedAt } | 404
// PUT  /v1/<key>  body { state, updatedAt } -> { ok, updatedAt }
// <key> is a client-side SHA-256 of the passphrase (64 hex chars); the passphrase itself never leaves the phone.
const ALLOWED = ['https://prosealaz-png.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const MAX_BYTES = 256 * 1024;

function cors(origin) {
  const ok = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return { 'Access-Control-Allow-Origin': ok, 'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
const json = (obj, status, h) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const m = new URL(req.url).pathname.match(/^\/v1\/([a-f0-9]{64})$/);
    if (!m) return json({ error: 'not found' }, 404, h);
    const key = 's:' + m[1];
    if (req.method === 'GET') {
      const v = await env.STATE.get(key);
      return v ? new Response(v, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } }) : json({ error: 'empty' }, 404, h);
    }
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413, h);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, h); }
      if (!body || typeof body !== 'object' || typeof body.state !== 'object' || typeof body.updatedAt !== 'number') return json({ error: 'bad shape' }, 400, h);
      await env.STATE.put(key, JSON.stringify({ state: body.state, updatedAt: body.updatedAt }));
      return json({ ok: true, updatedAt: body.updatedAt }, 200, h);
    }
    return json({ error: 'method' }, 405, h);
  }
};
