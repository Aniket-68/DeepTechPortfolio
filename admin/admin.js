'use strict';
const $ = (i) => document.getElementById(i);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let projects = [], enquiries = [], efilter = 'all', editing = null, shotPath = '';

async function api(method, url, body, isForm) {
  const opt = { method, headers: { 'X-Requested-With': 'fetch' }, credentials: 'same-origin' };
  if (body && !isForm) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  if (isForm) opt.body = body;
  const r = await fetch('/admin/api' + url, opt);
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && url !== '/login') { showLogin(); throw new Error('auth'); }
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
let tt;
function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('on'), 2200); }
function showLogin() { $('app').hidden = true; $('login').hidden = false; $('pw').focus(); }

async function start() {
  try { await api('GET', '/me'); } catch (e) { return showLogin(); }
  $('login').hidden = true; $('app').hidden = false;
  await Promise.all([loadProjects(), loadEnquiries(), loadSettings()]);
  dash();
}
$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('lerr').textContent = '';
  try { await api('POST', '/login', { password: $('pw').value }); $('pw').value = ''; start(); }
  catch (er) { $('lerr').textContent = er.message; }
};
$('lo').onclick = async () => { await api('POST', '/logout').catch(() => {}); showLogin(); };
$('tabs').onclick = (e) => { const t = e.target.closest('button'); if (t) tab(t.dataset.t); };
function tab(t) {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  ['dash', 'proj', 'enq', 'set'].forEach(x => $('t-' + x).hidden = x !== t);
  if (t === 'dash') dash();
}

// ---- dashboard ----
function dash() {
  const nw = enquiries.filter(e => e.status === 'new').length;
  $('nb').hidden = !nw; $('nb').textContent = nw;
  const last = enquiries.slice(0, 5).map(e => `<tr><td>${when(e.createdAt)}</td><td>${e.type === 'call' ? 'Call request' : 'Message'}</td><td>${esc(e.data.name)}</td><td><span class="tag ${e.status === 'new' ? 'n' : 'd'}">${e.status}</span></td></tr>`).join('');
  $('t-dash').innerHTML = `<h2>Dashboard</h2><div class="stats">
<div class="stat"><b>${projects.length}</b><span>Projects on the site</span></div>
<div class="stat"><b>${nw}</b><span>New enquiries</span></div>
<div class="stat"><b>${enquiries.length}</b><span>Total enquiries</span></div>
<div class="stat"><b>${projects.filter(p => p.sample).length}</b><span>Sample projects to replace</span></div></div>
<h2 style="font-size:18px;margin-bottom:10px">Latest enquiries</h2>
<div class="tablewrap">${last ? `<table><thead><tr><th>Received</th><th>Type</th><th>Name</th><th>Status</th></tr></thead><tbody>${last}</tbody></table>` : '<p class="empty">No enquiries yet. They will appear here when someone uses the site forms.</p>'}</div>`;
}
const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// ---- projects ----
async function loadProjects() { projects = await api('GET', '/projects'); renderProjects(); }
function renderProjects() {
  $('cats').innerHTML = [...new Set(['AI Applications', 'Android Apps', 'Web Apps', 'Maintenance & Support', ...projects.map(p => p.cat)])].map(c => `<option value="${esc(c)}">`).join('');
  $('plist').innerHTML = projects.length ? `<table><thead><tr><th></th><th>Project</th><th class="hide-m">Category</th><th class="hide-m">Link</th><th></th></tr></thead><tbody>` + projects.map((p, i) => `<tr>
<td>${p.img ? `<img class="thumb" src="/${esc(p.img)}" alt="">` : '<div class="thumb"></div>'}</td>
<td><b>${esc(p.name)}</b>${p.sample ? '<span class="tag s">Sample</span>' : ''}${p.private ? '<span class="tag n" style="margin-left:6px">Private B2B</span>' : ''}<div class="mu sm">${esc((p.desc || '').slice(0, 80))}</div></td>
<td class="hide-m"><span class="tag">${esc(p.cat)}</span></td><td class="hide-m">${p.url ? `<a class="lnk" href="${esc(p.url)}" target="_blank" rel="noopener">Open</a>` : ''}</td>
<td><div class="acts"><button data-a="up" data-i="${i}" title="Move up" ${i ? '' : 'disabled'}>↑</button><button data-a="dn" data-i="${i}" title="Move down" ${i < projects.length - 1 ? '' : 'disabled'}>↓</button><button data-a="ed" data-i="${i}">Edit</button><button class="del" data-a="rm" data-i="${i}">Delete</button></div></td></tr>`).join('') + '</tbody></table>' : '<p class="empty">No projects yet.</p>';
}
$('plist').onclick = async (e) => {
  const b = e.target.closest('button[data-a]'); if (!b || b.disabled) return;
  const i = +b.dataset.i, p = projects[i];
  try {
    if (b.dataset.a === 'ed') openEditor(p);
    else if (b.dataset.a === 'rm') { if (confirm('Delete "' + p.name + '" from the website?')) { await api('DELETE', '/projects/' + p.id); await loadProjects(); toast('Project deleted'); } }
    else { const j = b.dataset.a === 'up' ? i - 1 : i + 1; [projects[i], projects[j]] = [projects[j], projects[i]]; renderProjects(); await api('PUT', '/projects/reorder', { ids: projects.map(x => x.id) }); toast('Order saved'); }
  } catch (er) { if (er.message !== 'auth') { toast(er.message); loadProjects(); } }
};
$('addp').onclick = () => openEditor(null);
function openEditor(p) {
  editing = p; const f = $('pe'); f.reset(); $('perr2').textContent = '';
  $('pet').textContent = p ? 'Edit project' : 'Add project';
  if (p) { f.name.value = p.name; f.cat.value = p.cat; f.desc.value = p.desc; f.tags.value = (p.tags || []).join(', '); f.year.value = p.year || ''; f.url.value = p.url || ''; f.sample.checked = !!p.sample; f.private.checked = !!p.private; }
  setShot(p ? p.img : ''); $('pm').classList.add('on'); f.name.focus();
}
function setShot(path) { shotPath = path || ''; $('shot').innerHTML = shotPath ? `<img src="/${esc(shotPath)}" alt="Screenshot preview">` : 'No screenshot'; }
$('file').onchange = async () => {
  const file = $('file').files[0]; if (!file) return;
  const fd = new FormData(); fd.append('file', file);
  try { const r = await api('POST', '/upload', fd, true); setShot(r.path); toast('Screenshot uploaded'); } catch (e) { $('perr2').textContent = e.message; }
  $('file').value = '';
};
$('rmshot').onclick = () => setShot('');
$('pcancel').onclick = () => $('pm').classList.remove('on');
$('pm').onclick = (e) => { if (e.target.id === 'pm') $('pm').classList.remove('on'); };
$('pe').onsubmit = async (e) => {
  e.preventDefault(); const f = e.target;
  const body = { name: f.name.value, cat: f.cat.value, desc: f.desc.value, tags: f.tags.value, year: f.year.value, url: f.url.value, sample: f.sample.checked, private: f.private.checked, img: shotPath };
  try {
    if (editing) await api('PUT', '/projects/' + editing.id, body); else await api('POST', '/projects', body);
    $('pm').classList.remove('on'); await loadProjects(); dash(); toast('Project saved');
  } catch (er) { $('perr2').textContent = er.message; }
};

// ---- enquiries ----
async function loadEnquiries() { enquiries = await api('GET', '/enquiries'); renderEnq(); }
$('efilter').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; efilter = b.dataset.f; document.querySelectorAll('#efilter .chip').forEach(x => x.classList.toggle('on', x === b)); renderEnq(); };
const LABEL = { name: 'Name', company: 'Company', email: 'Email', phone: 'Phone', service: 'Service', budget: 'Budget', timeline: 'Timeline', message: 'Message', topic: 'Topic', date: 'Preferred date', time: 'Preferred time', mode: 'Call by', notes: 'Notes' };
function renderEnq() {
  const rows = enquiries.filter(e => efilter === 'all' || e.status === efilter);
  $('elist').innerHTML = rows.length ? rows.map(e => {
    const d = e.data, kv = Object.keys(LABEL).filter(k => d[k]).map(k => `<dt>${LABEL[k]}</dt><dd>${esc(d[k])}</dd>`).join('');
    const phone = (d.phone || '').replace(/\D/g, '');
    return `<div class="enq"><div class="top"><div><b>${e.type === 'call' ? 'Call request' : 'Message'}</b> <span class="tag ${e.status === 'new' ? 'n' : 'd'}">${e.status}</span> ${e.emailed ? '<span class="tag">Emailed</span>' : ''}</div><span class="mu sm">${when(e.createdAt)}</span></div>
<dl class="kv">${kv}</dl><div class="acts">
${d.email ? `<a class="btn o sm" href="mailto:${esc(d.email)}">Reply by email</a>` : ''}${phone ? `<a class="btn o sm" target="_blank" rel="noopener" href="https://wa.me/${phone.length === 10 ? '91' + phone : phone}">WhatsApp</a>` : ''}
<button data-a="st" data-id="${e.id}" data-s="${e.status === 'new' ? 'done' : 'new'}">Mark ${e.status === 'new' ? 'done' : 'new'}</button><button class="del" data-a="rm" data-id="${e.id}">Delete</button></div></div>`;
  }).join('') : '<p class="empty">Nothing here yet.</p>';
  const nw = enquiries.filter(e => e.status === 'new').length; $('nb').hidden = !nw; $('nb').textContent = nw;
}
$('elist').onclick = async (e) => {
  const b = e.target.closest('button[data-a]'); if (!b) return;
  try {
    if (b.dataset.a === 'st') await api('PATCH', '/enquiries/' + b.dataset.id, { status: b.dataset.s });
    else if (confirm('Delete this enquiry permanently?')) await api('DELETE', '/enquiries/' + b.dataset.id); else return;
    await loadEnquiries();
  } catch (er) { if (er.message !== 'auth') toast(er.message); }
};

// ---- settings ----
async function loadSettings() { const s = await api('GET', '/settings'), f = $('sf'); for (const k of ['email', 'phone', 'wa', 'tagline', 'github', 'linkedin']) f[k].value = s[k] || ''; }
$('sf').onsubmit = async (e) => { e.preventDefault(); $('serr').textContent = ''; const f = e.target; const b = {}; for (const k of ['email', 'phone', 'wa', 'tagline', 'github', 'linkedin']) b[k] = f[k].value; try { await api('PUT', '/settings', b); toast('Settings saved'); } catch (er) { $('serr').textContent = er.message; } };
$('pf').onsubmit = async (e) => { e.preventDefault(); $('perr').textContent = ''; const f = e.target; try { await api('POST', '/password', { current: f.current.value, next: f.next.value }); f.reset(); toast('Password changed'); } catch (er) { $('perr').textContent = er.message; } };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('pm').classList.remove('on'); });
start();
