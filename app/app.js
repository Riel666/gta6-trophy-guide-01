// Platinum Path — GTA VI trophy guide & tracker.
// Loads app/data/trophies.json, renders the roadmap and the 55-trophy checklist,
// and keeps earned ticks in localStorage with export/import. Works fully offline.
const KEY = 'platinum-path-gta6-v1';
const KIND_LABELS = {
  story: 'Story', side: 'Side quests', collectibles: 'Collectibles',
  activities: 'Activities', robbery: 'Robbery', exploration: 'Exploration',
  money: 'Money', misc: 'Misc', completion: '100% completion', platinum: 'Platinum',
};
const KIND_FILTERS = [
  ['all', 'All'], ['story', 'Story'], ['missable', 'Missable'],
  ['collectibles', 'Collectibles'], ['activities', 'Activities'],
  ['side', 'Side quests'], ['robbery', 'Robbery'], ['exploration', 'Exploration'],
  ['money', 'Money'], ['misc', 'Misc'], ['completion', '100% completion'],
  ['online', 'Online'],
];
const params = new URLSearchParams(location.search);

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let saved = {};
try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { saved = {}; }
let earned = new Set(Array.isArray(saved.earned) ? saved.earned : []);
let spoiler = params.get('spoiler') === '1' ? true : Boolean(saved.spoiler);
let hideEarned = Boolean(saved.hideEarned);
let kind = KIND_FILTERS.some(([v]) => v === params.get('kind')) ? params.get('kind') : 'all';
let grade = ['platinum', 'gold', 'silver', 'bronze'].includes(params.get('grade')) ? params.get('grade') : 'all';
let query = '';

const $ = (id) => document.getElementById(id);
const listEl = $('list');
const emptyEl = $('empty');

function saveState() {
  localStorage.setItem(KEY, JSON.stringify({ earned: [...earned], spoiler, hideEarned }));
}

function stageLabel(t) {
  if (t.stage === 0) return 'Platinum';
  return `Roadmap stage ${t.stage}`;
}

function isSpoilerMasked(t) {
  return spoiler && t.hidden && t.kind === 'story' && !earned.has(t.id);
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function renderRoadmap() {
  $('platinumNote').textContent = doc.platinum_note;
  const ol = $('roadmapStages');
  ol.replaceChildren();
  for (const s of doc.roadmap) {
    const count = trophies.filter((t) => t.stage === s.stage).length;
    const li = el('li');
    li.append(el('h3', '', `Stage ${s.stage} — ${s.title} `));
    li.querySelector('h3').append(el('span', '', s.hours));
    li.append(el('p', '', s.summary));
    li.append(el('p', 'stage-count', `${count} trophies`));
    li.append(el('p', 'stage-source', `Source: ${s.source}`));
    ol.append(li);
  }
  const src = $('sourceList');
  src.replaceChildren();
  for (const s of doc.sources) {
    const li = el('li');
    const a = el('a', '', s.label);
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    li.append(a);
    src.append(li);
  }
}

function renderProgress() {
  const total = trophies.length;
  const n = earned.size;
  $('progressText').textContent = `${n} of ${total} earned`;
  $('progressPct').textContent = `${Math.round((n / total) * 100)}%`;
  $('progressFill').style.width = `${(n / total) * 100}%`;
  const byGrade = ['platinum', 'gold', 'silver', 'bronze'].map((g) => {
    const ts = trophies.filter((t) => t.grade === g);
    const e = ts.filter((t) => earned.has(t.id)).length;
    return `${g[0].toUpperCase() + g.slice(1)} ${e}/${ts.length}`;
  });
  $('progressGrades').textContent = byGrade.join(' · ');
  const byStage = [1, 2, 3].map((s) => {
    const ts = trophies.filter((t) => t.stage === s);
    const e = ts.filter((t) => earned.has(t.id)).length;
    return `Stage ${s}: ${e}/${ts.length}`;
  });
  $('progressStages').textContent = byStage.join(' · ');
}

function matches(t) {
  if (kind === 'missable' && !t.missable) return false;
  if (kind === 'online') return false;
  if (kind !== 'all' && kind !== 'missable' && t.kind !== kind) return false;
  if (grade !== 'all' && t.grade !== grade) return false;
  if (hideEarned && earned.has(t.id)) return false;
  if (query) {
    const hay = [t.name, t.description, t.guide, ...(t.steps ?? [])].join(' ').toLowerCase();
    if (!hay.includes(query)) return false;
  }
  return true;
}

function renderList() {
  listEl.replaceChildren();
  const shown = trophies.filter(matches);
  if (kind === 'online') {
    emptyEl.hidden = false;
    emptyEl.textContent = 'No online trophies — all 55 are offline and single-player. PowerPyx lists 55 offline trophies and 0 online, and there is no multiplayer requirement for the platinum.';
  } else if (shown.length === 0) {
    emptyEl.hidden = false;
    emptyEl.textContent = 'Nothing matches these filters. Clear the search or pick another filter.';
  } else {
    emptyEl.hidden = true;
  }
  for (const t of shown) {
    const card = el('article', 'card' + (earned.has(t.id) ? ' earned' : ''));
    card.id = `trophy-${t.id}`;
    const box = el('input');
    box.type = 'checkbox';
    box.checked = earned.has(t.id);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) earned.add(t.id);
      else earned.delete(t.id);
      saveState();
      renderProgress();
      renderList();
    });
    card.append(box);
    const body = el('div');
    const masked = isSpoilerMasked(t);
    const h = el('h3');
    h.append(el('span', 'num', `#${t.id}`));
    h.append(document.createTextNode(masked ? 'Hidden story trophy' : t.name));
    body.append(h);
    body.append(el('p', 'official', masked
      ? 'Hidden until earned — turn off “Hide story spoilers” or earn it to reveal it.'
      : `Official description: “${t.description}”`));
    const badges = el('p', 'badges');
    badges.append(el('span', `badge ${t.grade}`, t.grade));
    if (t.kind !== 'platinum') badges.append(el('span', 'badge', KIND_LABELS[t.kind] ?? t.kind));
    if (t.chapter) badges.append(el('span', 'badge', `Chapter ${t.chapter}`));
    if (t.stage !== 0) badges.append(el('span', 'badge', stageLabel(t)));
    if (t.count_label) badges.append(el('span', 'badge', t.count_label));
    if (t.hidden) badges.append(el('span', 'badge hidden', 'Hidden on PSN'));
    if (t.missable) badges.append(el('span', 'badge missable', '⚠ Possibly missable'));
    body.append(badges);
    if (masked) {
      body.append(el('p', 'spoiler-hidden', 'Guide hidden with spoilers on. Its guide, steps and sources appear here once the trophy is earned — or turn the spoiler setting off.'));
    } else {
      body.append(el('p', 'guide', t.guide));
      if (t.steps?.length) {
        const ol = el('ol', 'steps');
        for (const s of t.steps) ol.append(el('li', '', s));
        body.append(ol);
      }
      if (t.missable_note) body.append(el('p', 'guide', t.missable_note));
      if (t.sources?.length) {
        const p = el('p', 'sources', 'Sources: ');
        t.sources.forEach((s, i) => {
          if (i) p.append(document.createTextNode(' · '));
          const a = el('a', '', s.label);
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener';
          p.append(a);
        });
        body.append(p);
      }
    }
    card.append(body);
    listEl.append(card);
  }
  $('showing').textContent = kind === 'online'
    ? 'Showing 0 of 55'
    : `Showing ${shown.length} of ${trophies.length}`;
}

function renderKindFilters() {
  const wrap = $('kindFilters');
  wrap.replaceChildren();
  for (const [value, label] of KIND_FILTERS) {
    const b = el('button', '', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', String(kind === value));
    b.addEventListener('click', () => {
      kind = value;
      renderKindFilters();
      renderList();
    });
    wrap.append(b);
  }
}

$('search').addEventListener('input', (e) => {
  query = e.target.value.trim().toLowerCase();
  renderList();
});
$('grade').addEventListener('change', (e) => {
  grade = e.target.value;
  renderList();
});
$('spoiler').checked = spoiler;
$('spoiler').addEventListener('change', (e) => {
  spoiler = e.target.checked;
  saveState();
  renderList();
});
$('hideEarned').checked = hideEarned;
$('hideEarned').addEventListener('change', (e) => {
  hideEarned = e.target.checked;
  saveState();
  renderList();
});
$('export').addEventListener('click', () => {
  const data = { game: 'Grand Theft Auto VI', platform: 'PlayStation 5', exported_at: new Date().toISOString(), earned: [...earned].sort((a, b) => a - b) };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = 'platinum-path-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});
$('import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const raw = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(raw)) throw new Error('no earned list');
    const ids = new Set(trophies.map((t) => t.id));
    const names = new Map(trophies.map((t) => [t.name, t.id]));
    const next = new Set();
    for (const v of raw) {
      if (typeof v === 'number' && ids.has(v)) next.add(v);
      else if (typeof v === 'string' && names.has(v)) next.add(names.get(v));
    }
    earned = next;
    saveState();
    renderProgress();
    renderList();
  } catch {
    alert('That file is not a Platinum Path progress export.');
  }
  e.target.value = '';
});
$('reset').addEventListener('click', () => {
  if (!confirm('Clear all earned ticks?')) return;
  earned = new Set();
  saveState();
  renderProgress();
  renderList();
});

renderRoadmap();
renderKindFilters();
renderProgress();
renderList();
const openId = Number(params.get('open'));
if (openId && trophies.some((t) => t.id === openId)) {
  document.getElementById(`trophy-${openId}`)?.scrollIntoView({ block: 'start' });
}
