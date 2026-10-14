'use strict';
/**
 * DeepTech portfolio server
 *  - serves the public website from ./public
 *  - public API: projects, config, contact form, call-booking form
 *  - admin panel at /admin (password protected): projects, screenshots, enquiries, settings
 * Data is stored in ./data/db.json (created on first run, seeded from public/projects.js).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
const express = require('express');
const multer = require('multer');
let nodemailer = null;
try { nodemailer = require('nodemailer'); } catch (e) { /* email is optional */ }

// ---------- tiny .env loader (no extra dependency) ----------
const ENV_FILE = path.join(__dirname, '.env');
if (fs.existsSync(ENV_FILE)) {
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');
const ADMIN_DIR = path.join(__dirname, 'admin');
const DATA = path.join(__dirname, 'data');
const SHOTS = path.join(PUB, 'screenshots');
const DB_FILE = path.join(DATA, 'db.json');
const AUTH_FILE = path.join(DATA, 'admin.json');
fs.mkdirSync(DATA, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const uid = () => crypto.randomBytes(6).toString('hex');
const clean = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s-]{10,15}$/;

// ---------- database (JSON file, atomic writes) ----------
let db;
function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
function seed() {
  const out = { projects: [], enquiries: [], settings: {} };
  let site = {}, projects = [];
  try {
    const sb = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(PUB, 'projects.js'), 'utf8'), sb, { timeout: 1000 });
    site = sb.window.SITE || {}; projects = sb.window.PROJECTS || [];
  } catch (e) { console.warn('Could not read public/projects.js for seeding:', e.message); }
  out.settings = {
    tagline: site.tagline || '', email: site.email || '', phone: site.phone || '', wa: site.wa || '',
    github: (site.links || {}).github || '', linkedin: (site.links || {}).linkedin || ''
  };
  out.projects = projects.map((p, i) => ({
    id: uid(), name: p.name, cat: p.cat, year: p.year || '', sample: !!p.sample, desc: p.desc || '',
    tags: p.tags || [], url: p.url || '', img: p.img || '', private: !!p.private, order: i
  }));
  return out;
}
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
else { db = seed(); save(); console.log('Created data/db.json with', db.projects.length, 'projects.'); }

// ---------- admin password + sessions ----------
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
let auth;
if (fs.existsSync(AUTH_FILE)) auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
else {
  const pw = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  const salt = crypto.randomBytes(16).toString('hex');
  auth = { salt, hash: hashPw(pw, salt), secret: crypto.randomBytes(32).toString('hex') };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth));
  console.log('\n  Admin password created: ' + pw + '\n  (change it in Admin > Settings; to reset, delete data/admin.json and restart)\n');
}
const sign = (s) => crypto.createHmac('sha256', auth.secret).update(s).digest('base64url');
function makeToken() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 864e5 })).toString('base64url');
  return body + '.' + sign(body);
}
function validToken(t) {
  if (!t || t.indexOf('.') < 0) return false;
  const [body, sig] = t.split('.');
  const a = Buffer.from(sig || ''), b = Buffer.from(sign(body));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}
const cookies = (req) => Object.fromEntries((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(x => x[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
const requireAdmin = (req, res, next) => {
  if (!validToken(cookies(req).dt_admin)) return res.status(401).json({ error: 'Please sign in.' });
  if (req.method !== 'GET' && req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Blocked.' });
  next();
};

// ---------- rate limiting ----------
const hits = new Map();
function limit(name, max, ms) {
  return (req, res, next) => {
    const key = name + ':' + req.ip, now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) h = { n: 0, reset: now + ms };
    h.n++; hits.set(key, h);
    if (h.n > max) return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    next();
  };
}
setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 6e5).unref();

// ---------- email ----------
let transport = null;
if (nodemailer && process.env.SMTP_HOST) {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  console.log('Email notifications: on (SMTP ' + process.env.SMTP_HOST + ')');
} else console.log('Email notifications: off (set SMTP_* in .env to turn on). Enquiries are still saved and visible in /admin.');
async function notify(subject, text, replyTo) {
  if (!transport) return false;
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER, to: process.env.MAIL_TO || db.settings.email,
      replyTo: replyTo || undefined, subject, text
    });
    return true;
  } catch (e) { console.error('Email failed:', e.message); return false; }
}

// ---------- app ----------
const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
  next();
});
app.use(express.json({ limit: '30kb' }));

// public API
const sortedProjects = () => db.projects.slice().sort((a, b) => a.order - b.order);
app.get('/api/projects', (req, res) => res.json(sortedProjects().map(({ id, name, cat, year, sample, desc, tags, url, img, private: pv }) => ({ id, name, cat, year, sample, desc, tags, url, img, private: !!pv }))));
app.get('/api/config', (req, res) => {
  const s = db.settings;
  res.json({ tagline: s.tagline, email: s.email, phone: s.phone, wa: s.wa, links: { github: s.github, linkedin: s.linkedin } });
});

function saveEnquiry(type, data) {
  const e = { id: uid(), type, status: 'new', createdAt: new Date().toISOString(), emailed: false, data };
  db.enquiries.push(e); save(); return e;
}

app.post('/api/contact', limit('form', 6, 6e5), async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true }); // honeypot
  const d = {
    name: clean(b.name, 100), company: clean(b.company, 100), email: clean(b.email, 150), phone: clean(b.phone, 20),
    service: clean(b.service, 60), budget: clean(b.budget, 60), timeline: clean(b.timeline, 60), message: clean(b.message, 3000)
  };
  if (d.name.length < 2) return res.status(400).json({ error: 'Enter your name.' });
  if (!EMAIL_RE.test(d.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (d.phone && !PHONE_RE.test(d.phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
  if (!d.service) return res.status(400).json({ error: 'Select a service.' });
  if (d.message.length < 15) return res.status(400).json({ error: 'Describe your project in at least a sentence.' });
  const e = saveEnquiry('contact', d);
  const text = ['New enquiry for DeepTech', '', 'Name: ' + d.name, 'Company: ' + (d.company || '-'), 'Email: ' + d.email, 'Phone: ' + (d.phone || '-'),
    'Service: ' + d.service, 'Budget: ' + (d.budget || '-'), 'Timeline: ' + (d.timeline || '-'), '', 'Project details:', d.message].join('\n');
  e.emailed = await notify('Project enquiry: ' + d.service + ' from ' + d.name, text, d.email); save();
  res.json({ ok: true });
});

app.post('/api/schedule', limit('form', 6, 6e5), async (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });
  const d = {
    name: clean(b.name, 100), phone: clean(b.phone, 20), email: clean(b.email, 150), topic: clean(b.topic, 60),
    date: clean(b.date, 10), time: clean(b.time, 20), mode: clean(b.mode, 30), notes: clean(b.notes, 1000)
  };
  if (d.name.length < 2) return res.status(400).json({ error: 'Enter your name.' });
  if (!PHONE_RE.test(d.phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
  if (d.email && !EMAIL_RE.test(d.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || isNaN(Date.parse(d.date))) return res.status(400).json({ error: 'Pick a date.' });
  if (!d.time) return res.status(400).json({ error: 'Pick a time slot.' });
  const e = saveEnquiry('call', d);
  const text = ['Call request for DeepTech', '', 'Name: ' + d.name, 'Phone: ' + d.phone, 'Email: ' + (d.email || '-'), 'Topic: ' + d.topic,
    'Preferred date: ' + d.date, 'Preferred time: ' + d.time + ' IST', 'Call by: ' + (d.mode || '-'), '', 'Notes: ' + (d.notes || '-')].join('\n');
  e.emailed = await notify('Call request: ' + d.date + ' ' + d.time + ' from ' + d.name, text, d.email); save();
  res.json({ ok: true });
});

// ---------- admin API ----------
const A = express.Router();
A.post('/login', limit('login', 8, 6e5), (req, res) => {
  if (req.get('X-Requested-With') !== 'fetch') return res.status(403).json({ error: 'Blocked.' });
  const pw = String((req.body || {}).password || '');
  const a = Buffer.from(hashPw(pw, auth.salt)), b = Buffer.from(auth.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Wrong password.' });
  const secure = req.secure || process.env.NODE_ENV === 'production';
  res.set('Set-Cookie', `dt_admin=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 86400}${secure ? '; Secure' : ''}`);
  res.json({ ok: true });
});
A.post('/logout', (req, res) => { res.set('Set-Cookie', 'dt_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ ok: true }); });
A.get('/me', requireAdmin, (req, res) => res.json({ ok: true }));

function cleanProject(b) {
  const p = {
    name: clean(b.name, 80), cat: clean(b.cat, 40), year: clean(b.year, 10), desc: clean(b.desc, 400),
    tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(',')).map(t => clean(t, 30)).filter(Boolean).slice(0, 8),
    url: clean(b.url, 300), img: clean(b.img, 120), sample: !!b.sample, private: !!b.private
  };
  if (!p.name) return { error: 'Name is required.' };
  if (!p.cat) return { error: 'Category is required.' };
  if (p.url && !/^https?:\/\//i.test(p.url)) return { error: 'Link must start with http:// or https://' };
  if (p.img && !/^screenshots\/[\w.-]+$/.test(p.img)) return { error: 'Invalid screenshot path.' };
  return { p };
}
A.get('/projects', requireAdmin, (req, res) => res.json(sortedProjects()));
A.post('/projects', requireAdmin, (req, res) => {
  const r = cleanProject(req.body || {}); if (r.error) return res.status(400).json(r);
  const p = { id: uid(), ...r.p, order: db.projects.reduce((m, x) => Math.max(m, x.order), -1) + 1 };
  db.projects.push(p); save(); res.json(p);
});
A.put('/projects/reorder', requireAdmin, (req, res) => {
  const ids = (req.body || {}).ids; if (!Array.isArray(ids)) return res.status(400).json({ error: 'Bad request.' });
  ids.forEach((id, i) => { const p = db.projects.find(x => x.id === id); if (p) p.order = i; });
  save(); res.json({ ok: true });
});
A.put('/projects/:id', requireAdmin, (req, res) => {
  const p = db.projects.find(x => x.id === req.params.id); if (!p) return res.status(404).json({ error: 'Not found.' });
  const r = cleanProject(req.body || {}); if (r.error) return res.status(400).json(r);
  const old = p.img; Object.assign(p, r.p); if (old && old !== p.img) dropUpload(old); save(); res.json(p);
});
A.delete('/projects/:id', requireAdmin, (req, res) => {
  const i = db.projects.findIndex(x => x.id === req.params.id); if (i < 0) return res.status(404).json({ error: 'Not found.' });
  const [p] = db.projects.splice(i, 1); dropUpload(p.img); save(); res.json({ ok: true });
});
function dropUpload(img) { // only remove files uploaded through the admin panel and no longer used
  if (!img || !/^screenshots\/up-[\w.-]+$/.test(img) || db.projects.some(x => x.img === img)) return;
  fs.unlink(path.join(PUB, img), () => {});
}

const upload = multer({
  storage: multer.diskStorage({
    destination: SHOTS,
    filename: (req, file, cb) => cb(null, 'up-' + uid() + ({ 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype] || '.bin'))
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
});
A.post('/upload', requireAdmin, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Image must be under 5 MB.' : 'Upload failed.' });
    if (!req.file) return res.status(400).json({ error: 'Choose a JPG, PNG or WebP image.' });
    const head = fs.readFileSync(req.file.path).subarray(0, 12);
    const ok = (head[0] === 0xFF && head[1] === 0xD8) || (head.subarray(0, 4).toString('hex') === '89504e47') ||
      (head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP');
    if (!ok) { fs.unlinkSync(req.file.path); return res.status(400).json({ error: 'That file is not a valid image.' }); }
    res.json({ path: 'screenshots/' + req.file.filename });
  });
});

A.get('/enquiries', requireAdmin, (req, res) => res.json(db.enquiries.slice().reverse()));
A.patch('/enquiries/:id', requireAdmin, (req, res) => {
  const e = db.enquiries.find(x => x.id === req.params.id); if (!e) return res.status(404).json({ error: 'Not found.' });
  e.status = (req.body || {}).status === 'done' ? 'done' : 'new'; save(); res.json(e);
});
A.delete('/enquiries/:id', requireAdmin, (req, res) => {
  const i = db.enquiries.findIndex(x => x.id === req.params.id); if (i < 0) return res.status(404).json({ error: 'Not found.' });
  db.enquiries.splice(i, 1); save(); res.json({ ok: true });
});
A.get('/enquiries.csv', requireAdmin, (req, res) => {
  const keys = ['name', 'company', 'email', 'phone', 'service', 'budget', 'timeline', 'message', 'topic', 'date', 'time', 'mode', 'notes'];
  const cell = (v) => { v = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
  const rows = [['received', 'type', 'status', ...keys].map(cell).join(',')];
  db.enquiries.forEach(e => rows.push([e.createdAt, e.type, e.status, ...keys.map(k => e.data[k])].map(cell).join(',')));
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="enquiries.csv"' }).send('﻿' + rows.join('\r\n'));
});

A.get('/settings', requireAdmin, (req, res) => res.json(db.settings));
A.put('/settings', requireAdmin, (req, res) => {
  const b = req.body || {};
  const s = {
    tagline: clean(b.tagline, 200), email: clean(b.email, 150), phone: clean(b.phone, 30),
    wa: clean(b.wa, 15).replace(/\D/g, ''), github: clean(b.github, 200), linkedin: clean(b.linkedin, 200)
  };
  if (s.email && !EMAIL_RE.test(s.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  db.settings = s; save(); res.json(s);
});
A.post('/password', requireAdmin, (req, res) => {
  const { current, next } = req.body || {};
  const a = Buffer.from(hashPw(String(current || ''), auth.salt)), b = Buffer.from(auth.hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(400).json({ error: 'Current password is wrong.' });
  if (String(next || '').length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  auth.salt = crypto.randomBytes(16).toString('hex'); auth.hash = hashPw(String(next), auth.salt);
  auth.secret = crypto.randomBytes(32).toString('hex'); // signs everyone out
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth));
  res.set('Set-Cookie', `dt_admin=${makeToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${7 * 86400}`);
  res.json({ ok: true });
});
app.use('/admin/api', A);

app.use('/admin', express.static(ADMIN_DIR));
app.use(express.static(PUB, { extensions: ['html'] }));
app.use((req, res) => res.status(404).send('Not found'));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error.' }); });

app.listen(PORT, () => {
  console.log(`\n  DeepTech site:   http://localhost:${PORT}\n  Admin panel:     http://localhost:${PORT}/admin\n`);
});
