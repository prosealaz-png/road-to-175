// Road to 175 sync + notifications. build.py prepends plan.js to make index.js.
// GET/PUT  /v1/<key>            state blob            (see sync)
// GET/PUT/DELETE /v1/<key>/notify   Pushover config    { user, times:{morning,midday,evening} }
// scheduled(): every 15 min, sends the slot that matches each person's configured times (Arizona time).
const ALLOWED = ['https://prosealaz-png.github.io', 'http://localhost:8765', 'http://127.0.0.1:8765'];
const MAX_BYTES = 256 * 1024;
const APP_URL = 'https://prosealaz-png.github.io/road-to-175/';
const TZ = 'America/Phoenix';
const DEFAULT_TIMES = { morning: '07:00', midday: '13:00', evening: '20:30' };

function cors(origin) {
  const ok = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return { 'Access-Control-Allow-Origin': ok, 'Access-Control-Allow-Methods': 'GET,PUT,DELETE,OPTIONS',
           'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
}
const json = (obj, status, h) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } });
const normTime = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(t||'')); if (!m) return null; const h = +m[1], mi = Math.floor(+m[2]/15)*15; if (h>23||mi>59) return null; return String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0'); };

// ---------- Arizona clock ----------
function azNow(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour12: false, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }).formatToParts(d).filter(x=>x.type!=='literal').map(x=>[x.type, x.value]));
  const hour = p.hour === '24' ? 0 : +p.hour;
  return { dateKey: `${p.year}-${p.month}-${p.day}`, minutes: hour*60 + +p.minute };
}
const dateOfKey = k => new Date(+k.slice(0,4), +k.slice(5,7)-1, +k.slice(8,10));

// ---------- progress from a state blob ----------
function progress(S, todayK) {
  const { DAYS, ALL, WEEK_GOALS, PHASES, END, key, addDays, fmt } = PLAN;
  S = Object.assign({done:{},skip:{},scores:[],testDate:'2027-01-14'}, S||{});
  const done = x => !!S.done[x.id], closed = x => !!(S.done[x.id] || S.skip[x.id]);
  const dk = x => x.id.slice(0,10);
  const today = DAYS.find(d => d.k === todayK) || null;
  const tomorrow = DAYS.find(d => d.k > todayK) || null;
  const past = ALL.filter(x => dk(x) < todayK);
  const overdue = past.filter(x => !closed(x));
  const ahead = ALL.filter(x => dk(x) > todayK && done(x)).length;
  const totalDone = ALL.filter(done).length;
  const pct = Math.round(100 * totalDone / ALL.length);
  const week = today ? today.week : null;
  const wk = week===null ? [] : ALL.filter(x => PLAN.weekOf(dateOfKey(dk(x))) === week);
  const wkDone = wk.filter(done).length;
  const byKey = Object.fromEntries(DAYS.map(d=>[d.k,d]));
  const complete = d => d && d.tasks.length>0 && d.tasks.every(closed) && d.tasks.some(done);
  let streak = 0; let d = dateOfKey(todayK); if (!complete(byKey[key(d)])) d = addDays(d,-1);
  while (complete(byKey[key(d)])) { streak++; d = addDays(d,-1); }
  const test = /^\d{4}-\d{2}-\d{2}$/.test(S.testDate||'') ? dateOfKey(S.testDate) : END;
  const daysLeft = Math.max(0, Math.round((test - dateOfKey(todayK)) / 864e5));
  const todayDone = today ? today.tasks.filter(closed).length : 0;
  const todayOpen = today ? today.tasks.filter(x => !closed(x)) : [];
  const status = overdue.length > 10 ? 'catchup' : overdue.length > 3 ? 'behind' : ahead > 0 ? 'ahead' : 'ontrack';
  const best = S.scores.length ? Math.max(...S.scores.map(x=>x.s)) : null;
  const last = S.scores.length ? S.scores[S.scores.length-1].s : null;
  return { today, tomorrow, overdue: overdue.length, ahead, pct, totalDone, total: ALL.length, week, wkDone, wkTotal: wk.length, streak, daysLeft, todayDone, todayOpen, status, best, last, name: S.name || '', weekGoal: week===null ? '' : WEEK_GOALS[week], phase: week===null ? null : PHASES[week<=3?0:week<=8?1:week<=12?2:3] };
}

const REFRESHERS = [
  'Skip rule: 75 seconds with no answer, pick a letter, flag it, move on. Never leave a bubble empty.',
  'LR checkpoints: question 10 by 12 min, question 18 by 23 min, done by 33, last 2 for flags.',
  'RC checkpoints: about 8.5 minutes per passage. Passage 2 starts by 9 min, passage 3 by 18, passage 4 by 26.',
  'A hard question is worth exactly one point. Same as an easy one. Do not pay 3 minutes for it while 5 points sit unanswered.',
  'Blind review: re-answer every flagged question untimed before looking. The timed-vs-untimed gap is your timing problem, measured.',
  'Review beats volume. One section reviewed properly teaches more than three rushed.',
  'Find the conclusion first. Almost every LR miss starts with mislabeling what the argument is actually claiming.',
];
const bar = pct => { const n = Math.round(pct/10); return '▓'.repeat(n) + '░'.repeat(10-n) + ' ' + pct + '%'; };
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const list = tasks => tasks.map(t => '• ' + esc(t.t) + (t.m ? ` <i>(${t.m} min)</i>` : '')).join('\n');
const greet = (p, text) => p.name ? `${p.name}, ${text}` : text.charAt(0).toUpperCase() + text.slice(1);

function compose(slot, P, dayIndex) {
  const { fmt } = PLAN;
  if (!P.today) {
    if (slot !== 'morning') return null;
    return { title: 'Road to 175', message: 'The plan starts Wednesday, Oct 7. Read the pacing rules in Setup and get some sleep. Koen loves you.' };
  }
  const t = P.today, total = t.tasks.reduce((a,x)=>a+x.m,0);
  if (slot === 'morning') {
    const head = `<b>${esc(fmt(t.date))}</b> · Week ${P.week}, Phase ${P.phase.n}: ${esc(P.phase.name)} · ${P.daysLeft} days to test`;
    const body = t.tasks.length ? `Today (${total} min):\n${list(t.tasks)}` : 'Today is a rest day. Rest is on the plan, not a break from it.';
    const ref = REFRESHERS[dayIndex % REFRESHERS.length];
    return { title: greet(P, 'good morning. Brain on.'), message: `${head}\n\n${body}\n\n<b>This week:</b> ${esc(P.weekGoal)}\n\n<b>Refresher:</b> ${esc(ref)}\n\nKoen loves you.` };
  }
  if (slot === 'midday') {
    const stats = `${bar(P.pct)} of the plan\nThis week ${P.wkDone}/${P.wkTotal} · streak ${P.streak} day${P.streak===1?'':'s'} · ${P.daysLeft} days to test` + (P.last ? ` · last PT ${P.last}` : '');
    let line;
    if (P.status === 'catchup') line = `<b>${P.overdue} items have slipped.</b> Don't lose the progress you've built: do today's timed piece, let the rest go, and tap <b>Forgive the past</b> in the app so the slate is clean. Skill doesn't reset to zero. It gets dusty. One section wipes the dust off.`;
    else if (P.status === 'behind') line = `<b>${P.overdue} items slipped.</b> Don't lose progress: today's timed section is the one that matters. Do that first and the rest is a bonus.`;
    else if (P.status === 'ahead') line = `<b>You're ahead by ${P.ahead}.</b> That's not a reason to coast, it's proof the plan is light for you. Keep Saturday's test sacred.`;
    else line = P.todayOpen.length ? `<b>Right on schedule.</b> Still open today:\n${list(P.todayOpen)}` : `<b>Right on schedule and today is already done.</b> Go do something that isn't the LSAT.`;
    return { title: 'Progress check', message: `${stats}\n\n${line}\n\nKoen loves you.` };
  }
  // evening
  let body;
  if (!t.tasks.length) body = 'Rest day, so nothing to close out.';
  else if (!P.todayOpen.length) body = `<b>Today: ${P.todayDone}/${t.tasks.length} done.</b> Everything. Go rest, that is part of the plan.`;
  else { const timed = P.todayOpen.some(x => /section|timed|practice test|questions in \d+|min\b/i.test(x.t) && x.m >= 30); body = `<b>Today: ${P.todayDone}/${t.tasks.length} done.</b> Still open:\n${list(P.todayOpen)}` + (timed ? '\nIf you do only one, do the timed one. Twenty minutes beats zero.' : '\nSmall ones. Knock them out and keep the streak.'); }
  const tm = P.tomorrow ? (P.tomorrow.tasks.length ? `<b>Tomorrow (${P.tomorrow.tasks.reduce((a,x)=>a+x.m,0)} min):</b>\n${list(P.tomorrow.tasks.slice(0,3))}` : '<b>Tomorrow:</b> rest day.') : '';
  return { title: "Tonight's check-in", message: `${body}\n\n${tm}\n\nKoen loves you. Sleep well.` };
}

async function pushover(env, user, msg) {
  if (!env.PUSHOVER_TOKEN) return { ok: false, error: 'not configured' };
  const form = new URLSearchParams({ token: env.PUSHOVER_TOKEN, user, title: msg.title, message: msg.message, html: '1', url: APP_URL, url_title: 'Open Road to 175' });
  const r = await fetch('https://api.pushover.net/1/messages.json', { method: 'POST', body: form });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok && j.status === 1, error: (j.errors || []).join('; ') || (r.ok ? '' : 'http ' + r.status) };
}

export default {
  async fetch(req, env) {
    const h = cors(req.headers.get('Origin') || '');
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/v1\/([a-f0-9]{64})(\/notify|\/preview)?$/);
    if (!m) return json({ error: 'not found' }, 404, h);
    const key = m[1];
    if (m[2] === '/preview') { // what each slot would say right now (nothing is sent)
      if (req.method !== 'GET') return json({ error: 'method' }, 405, h);
      const blob = await env.STATE.get('s:' + key, 'json');
      const now = azNow(); const fake = url.searchParams.get('date'); if (/^\d{4}-\d{2}-\d{2}$/.test(fake||'')) now.dateKey = fake; const dayIndex = Math.max(0, Math.round((dateOfKey(now.dateKey) - PLAN.START) / 864e5));
      const P = progress(blob ? blob.state : {}, now.dateKey);
      const out = {}; for (const slot of ['morning','midday','evening']) out[slot] = compose(slot, P, dayIndex);
      return json({ az: now, status: P.status, overdue: P.overdue, ahead: P.ahead, pct: P.pct, messages: out }, 200, h);
    }
    if (m[2]) { // ---- notify config ----
      const nk = 'n:' + key;
      if (req.method === 'GET') { const v = await env.STATE.get(nk, 'json'); return v ? json({ user: v.user, times: v.times }, 200, h) : json({ error: 'empty' }, 404, h); }
      if (req.method === 'DELETE') { await env.STATE.delete(nk); return json({ ok: true }, 200, h); }
      if (req.method === 'PUT') {
        let body; try { body = await req.json(); } catch { return json({ error: 'bad json' }, 400, h); }
        const user = String(body.user || '').trim();
        if (!/^[A-Za-z0-9]{30}$/.test(user)) return json({ error: 'That does not look like a Pushover user key (30 letters and numbers).' }, 400, h);
        const times = {}; for (const k of ['morning','midday','evening']) { times[k] = normTime(body.times && body.times[k]) || DEFAULT_TIMES[k]; }
        const test = await pushover(env, user, { title: 'Road to 175 notifications are on', message: `You'll hear from me at ${times.morning}, ${times.midday} and ${times.evening} (Arizona time). Koen loves you.` });
        if (!test.ok) return json({ error: test.error === 'not configured' ? 'Notifications are not set up on the server yet (Pushover app token missing).' : 'Pushover rejected that user key: ' + test.error }, 400, h);
        await env.STATE.put(nk, JSON.stringify({ user, times, createdAt: Date.now() }));
        return json({ ok: true, times }, 200, h);
      }
      return json({ error: 'method' }, 405, h);
    }
    const sk = 's:' + key; // ---- state ----
    if (req.method === 'GET') {
      const v = await env.STATE.get(sk);
      return v ? new Response(v, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...h } }) : json({ error: 'empty' }, 404, h);
    }
    if (req.method === 'PUT') {
      const text = await req.text();
      if (text.length > MAX_BYTES) return json({ error: 'too large' }, 413, h);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400, h); }
      if (!body || typeof body !== 'object' || typeof body.state !== 'object' || typeof body.updatedAt !== 'number') return json({ error: 'bad shape' }, 400, h);
      await env.STATE.put(sk, JSON.stringify({ state: body.state, updatedAt: body.updatedAt }));
      return json({ ok: true, updatedAt: body.updatedAt }, 200, h);
    }
    return json({ error: 'method' }, 405, h);
  },

  async scheduled(event, env, ctx) {
    const now = azNow(new Date(event.scheduledTime));
    if (now.dateKey > PLAN.key(PLAN.END)) return; // plan is over
    const dayIndex = Math.max(0, Math.round((dateOfKey(now.dateKey) - PLAN.START) / 864e5));
    let cursor; const keys = [];
    do { const l = await env.STATE.list({ prefix: 'n:', cursor }); keys.push(...l.keys.map(k => k.name)); cursor = l.list_complete ? null : l.cursor; } while (cursor);
    for (const nk of keys) {
      const cfg = await env.STATE.get(nk, 'json'); if (!cfg || !cfg.user) continue;
      const key = nk.slice(2);
      for (const slot of ['morning','midday','evening']) {
        const [hh, mm] = (cfg.times && cfg.times[slot] || DEFAULT_TIMES[slot]).split(':').map(Number);
        const slotMin = hh*60 + mm;
        if (!(now.minutes >= slotMin && now.minutes < slotMin + 15)) continue;
        const sentKey = `sent:${key}:${now.dateKey}:${slot}`;
        if (await env.STATE.get(sentKey)) continue;
        const blob = await env.STATE.get('s:' + key, 'json');
        const P = progress(blob ? blob.state : {}, now.dateKey);
        const msg = compose(slot, P, dayIndex); if (!msg) continue;
        const r = await pushover(env, cfg.user, msg);
        await env.STATE.put(sentKey, r.ok ? 'ok' : 'fail:' + r.error, { expirationTtl: 86400 });
      }
    }
  }
};
