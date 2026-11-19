/* 태어나 보니 식민지였다 — game engine.
   Reads the screenplay text in story/*.js (window.STORY_STAGE1) and plays it.
   Screenplay syntax is documented at the top of story/stage1.js. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- asset tables ---------- */
  const BG = {
    타이틀: 'assets/bg/bg_title.webp',
    강당: 'assets/bg/bg_auditorium.webp',
    교실: 'assets/bg/bg_classroom.webp',
    집: 'assets/bg/bg_home.webp',
    거리: 'assets/bg/bg_street.webp',
    기차: 'assets/bg/bg_train.webp',
    시장: 'assets/bg/bg_market.webp',
    책방: 'assets/bg/bg_bookstore.webp',
    냇가: 'assets/bg/bg_stream.webp',
    역: 'assets/bg/bg_title.webp',
  };
  const CHARS = {
    윤재: { key: 'yunjae', scale: 1, faces: { 기본: 'normal', 웃음: 'smile', 놀람: 'surprised', 화남: 'angry', 슬픔: 'sad' } },
    만식: { key: 'mansik', scale: 0.84, faces: { 기본: 'normal', 웃음: 'smile', 걱정: 'worried' } },
    교장: { key: 'principal', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    교관: { key: 'instructor', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    진수: { key: 'senior', scale: 1.02, faces: { 기본: 'normal', 씁쓸: 'bitter' } },
    정희: { key: 'junghee', scale: 0.97, faces: { 기본: 'normal', 웃음: 'smile', 걱정: 'worried' } },
  };
  const POS = { 왼쪽: 24, 가운데: 50, 오른쪽: 76 };
  const STATS = {
    학업: { icon: 'assets/ui/icon_study.webp', desc: '시험과 공부에 강해져요. 시험 시간이 늘어나요.' },
    눈치: { icon: 'assets/ui/icon_eye.webp', desc: '숨은 것과 남의 속마음을 알아채요.' },
    체력: { icon: 'assets/ui/icon_stamina.webp', desc: '몸 쓰는 일에 강해요. 짐 나르기가 쉬워져요.' },
    용기: { icon: 'assets/ui/icon_courage.webp', desc: '할 말을 할 수 있어요. 대담한 선택지가 열려요.' },
  };
  const MONEY_ICON = 'assets/ui/icon_money.webp';
  const RELS = {
    만식: { name: '만식', up: '만식과 가까워졌다', down: '만식이 조금 서운해한다' },
    정희: { name: '정희', up: '정희와 가까워졌다', down: '정희가 고개를 갸웃한다' },
    진수: { name: '진수 형', up: '진수 형과 가까워졌다', down: '진수 형이 씁쓸하게 웃는다' },
  };
  const CARDS = [
    { id: 'study', name: '공부', label: '공부만 잘하면 돼', truth: '실력만으로 오르는 사다리가 아니었다.', states: ['normal', 'hairline', 'cracked', 'broken'] },
    { id: 'safe', name: '안전', label: '가만히 있으면 안전해', states: ['normal'] },
    { id: 'home', name: '집', label: '우리 집 먹고사는 게 먼저야', states: ['normal'] },
    { id: 'escape', name: '탈출', label: '나 하나만 빠져나가면 돼', states: ['normal'] },
    { id: 'hopeless', name: '원래', label: '태어나 보니 원래 이랬어', truth: '원래 그런 세상은 없었다. 누군가 빼앗은 것이다.', states: ['normal'] },
  ];
  const CARD_STATE = { 기본: 'normal', 실금: 'hairline', 금감: 'cracked', 깨짐: 'broken' };
  const CARD_STATE_TEXT = { hairline: '윤재의 믿음에 처음으로 실금이 갔다.', cracked: '윤재의 믿음에 금이 크게 갔다.' };
  const COMMON_TRUTH = '내가 틀린 게 아니었다. 세상이 그렇게 놔두지 않았다.';
  const HUD = { 디데이: 'hud-dday', 장학생: 'hud-grade', 의심: 'hud-susp', 능력치: 'hud-stats', 돈: 'hud-money', 가방: 'hud-bag', 믿음: 'hud-bag', 노트: 'hud-bag' };
  const TIMES = ['오전', '오후', '저녁'];
  const SAVE_KEY = 'colony15-save-v1';
  const cardSrc = (id, st) => `assets/card/card_${id}${st === 'normal' ? '' : '_' + st}.webp`;
  const charSrc = (key, face) => `assets/char/char_${key}_${face}.webp`;

  /* ---------- screenplay parser ---------- */
  function parseEffects(s) {
    if (!s) return [];
    return s.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
      if (t.startsWith('flag:')) return { flag: t.slice(5).trim() };
      const m = t.match(/^(\S+?)\s*([+-]\d+)$/);
      return m ? { v: m[1], d: Number(m[2]) } : null;
    }).filter(Boolean);
  }
  function parseReq(text) {
    const m = text.match(/^\[(\S+)\s+([^\]]+)\]\s*(.*)$/);
    if (!m) return { text, req: null };
    if (m[1] === '소지품') return { text: m[3], req: { item: m[2].trim() } };
    return { text: m[3], req: { k: m[1], n: Number(m[2]) } };
  }

  function parse(src) {
    const cmds = [];
    const labels = {};
    const terms = {};
    const items = {};
    const spots = {};
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t || t.startsWith('//')) continue;
      const before = cmds[cmds.length - 1];
      if (before && before.type === 'choice' && !t.startsWith('?')) before.closed = true;
      if (t.startsWith('## ')) { labels[t.slice(3).trim()] = cmds.length; continue; }
      if (t.startsWith('@')) {
        const name = t.slice(1).split(/\s+/)[0];
        const arg = t.slice(1 + name.length).trim();
        const parts = arg.split('|').map((x) => x.trim());
        if (name === 'term') { if (parts[1]) terms[parts[0]] = parts.slice(1).join(' | '); continue; }
        if (name === 'itemdef') { items[parts[0]] = { img: `assets/item/${parts[1]}.webp`, desc: parts.slice(2).join(' | ') }; continue; }
        if (name === 'spot') { spots[parts[0]] = { x: Number(parts[1]), y: Number(parts[2]), hint: parts[3] || '' }; continue; }
        if (name === 'exam') {
          const qs = [];
          while (++i < lines.length && lines[i].trim() !== '@endexam') {
            const m = lines[i].trim().match(/^Q\s+([OX])\s*\|\s*(.+)$/);
            if (m) qs.push({ ans: m[1], text: m[2] });
          }
          cmds.push({ type: 'exam', key: parts[0], title: parts[1], secs: Number(parts[2]) || 6, qs });
          continue;
        }
        cmds.push({ type: name, arg });
        continue;
      }
      if (t.startsWith('?')) {
        const m = t.slice(1).match(/^(.*?)\s*(?:\{([^}]*)\})?\s*(?:->\s*(\S+))?\s*$/);
        const { text, req } = parseReq(m[1].trim());
        const opt = { text, req, effects: parseEffects(m[2]), go: m[3] || null };
        const last = cmds[cmds.length - 1];
        if (last && last.type === 'choice' && !last.closed) last.options.push(opt);
        else cmds.push({ type: 'choice', options: [opt] });
        continue;
      }
      if (t.startsWith('->')) {
        const m = t.slice(2).trim().match(/^(\S+)(?:\s+if\s+(.+))?$/);
        cmds.push({ type: 'jump', go: m[1], cond: m[2] || null });
        continue;
      }
      if (t.startsWith('*')) { cmds.push({ type: 'narr', text: t.slice(1).trim() }); continue; }
      if (t.startsWith('(속)')) { cmds.push({ type: 'think', text: t.slice(3).trim() }); continue; }
      const m = t.match(/^([^:\[\]]{1,12}?)(?:\[([^\]]+)\])?\s*:\s*(.+)$/);
      if (m) { cmds.push({ type: 'say', who: m[1].trim(), face: m[2] || null, text: m[3] }); continue; }
      cmds.push({ type: 'narr', text: t });
    }
    return { cmds, labels, terms, items, spots };
  }

  /* ---------- state ---------- */
  let S;
  let prog;
  let pc = 0;
  let runId = 0;
  const sprites = new Map();

  function newState() {
    return {
      vars: { 성적: 70, 의심: 0, 학과: 0, 수신: 0, 학업: 3, 눈치: 1, 체력: 2, 용기: 0, 돈: 0, 만식: 0, 정희: 0, 진수: 0 },
      flags: new Set(),
      cards: Object.fromEntries(CARDS.map((c) => [c.id, 'normal'])),
      seenTerms: new Set(),
      notes: [],
      items: [],
      perks: [],
      quests: [],
      day: 100,
      time: '',
      bg: '',
    };
  }

  /* ---------- input ---------- */
  let tapResolver = null;
  function waitTap() { return new Promise((r) => { tapResolver = r; }); }
  function fireTap() { if (tapResolver) { const r = tapResolver; tapResolver = null; r(); } }
  $('game').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (!$('beliefview').hidden) return;
    const termEl = e.target.closest('.term');
    if (termEl) { showPop(termEl, termEl.dataset.term); return; }
    fireTap();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      if (carryDrop) carryDrop();
      else fireTap();
    }
  });

  /* ---------- glossary: underlined terms with pop-up explanations ---------- */
  let termRe = null;
  function buildTermRe() {
    const names = Object.keys(prog.terms)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    termRe = names.length ? new RegExp(names.join('|'), 'g') : null;
  }
  function splitTerms(text) {
    if (!termRe) return [{ t: text }];
    const out = [];
    let last = 0;
    text.replace(termRe, (m, off) => {
      if (off > last) out.push({ t: text.slice(last, off) });
      out.push({ t: m, term: m });
      last = off + m.length;
      return m;
    });
    if (last < text.length) out.push({ t: text.slice(last) });
    return out;
  }
  const pops = [];
  function placePop(p) {
    const r = p.span.getBoundingClientRect();
    const g = $('game').getBoundingClientRect();
    const el = p.el;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = r.left + r.width / 2 - w / 2;
    left = Math.max(8, Math.min(g.width - w - 8, left));
    let top = r.top - h - 12;
    for (const q of pops) {
      if (q === p) break;
      const qr = q.el.getBoundingClientRect();
      if (left < qr.right && left + w > qr.left && top < qr.bottom && top + h > qr.top) top = qr.top - h - 8;
    }
    const below = top < 6;
    if (below) top = r.bottom + 12;
    el.style.left = left + 'px';
    el.style.top = top + 'px';
    el.classList.toggle('below', below);
    el.style.setProperty('--arrow-x', Math.max(14, Math.min(w - 14, r.left + r.width / 2 - left)) + 'px');
  }
  function showPop(span, term, keepOthers) {
    if (!keepOthers) hidePops();
    const el = document.createElement('div');
    el.className = 'termpop';
    const b = document.createElement('b');
    b.textContent = term;
    const s = document.createElement('span');
    s.textContent = prog.terms[term] || '';
    el.append(b, s);
    $('game').appendChild(el);
    const p = { el, span };
    pops.push(p);
    placePop(p);
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = pops.indexOf(p);
      if (i >= 0) pops.splice(i, 1);
      el.remove();
    });
  }
  function hidePops() { while (pops.length) pops.pop().el.remove(); }
  function repositionPops() { pops.forEach(placePop); }
  window.addEventListener('resize', repositionPops);

  // Typewriter that keeps glossary terms as tappable spans.
  function typeRich(el, full, speed) {
    const nodes = splitTerms(full).map((sg) => {
      let node;
      if (sg.term) {
        node = document.createElement('span');
        node.className = 'term';
        node.dataset.term = sg.term;
      } else {
        node = document.createTextNode('');
      }
      return { node, text: sg.t, term: sg.term, done: false };
    });
    el.textContent = '';
    nodes.forEach((n) => el.appendChild(n.node));
    const termDone = (n) => {
      if (n.done || !n.term) return;
      n.done = true;
      if (!S.seenTerms.has(n.term)) {
        S.seenTerms.add(n.term);
        showPop(n.node, n.term, true);
      }
    };
    return new Promise((res) => {
      let si = 0;
      let ci = 0;
      let timer = null;
      const finish = () => {
        clearTimeout(timer);
        nodes.forEach((n) => { n.node.textContent = n.text; termDone(n); });
        if (tapResolver === finish) tapResolver = null;
        repositionPops();
        res();
      };
      tapResolver = finish;
      const step = () => {
        if (si >= nodes.length) { finish(); return; }
        const n = nodes[si];
        ci += 1;
        n.node.textContent = n.text.slice(0, ci);
        if (ci >= n.text.length) { termDone(n); si += 1; ci = 0; }
        if (si >= nodes.length) finish();
        else timer = setTimeout(step, speed);
      };
      step();
    });
  }

  /* ---------- HUD ---------- */
  function hud(names, on = true) {
    const g = $('game');
    names.forEach((n) => { if (HUD[n]) g.classList.toggle(HUD[n], on); });
    g.classList.toggle('hud-any', Object.values(HUD).some((c) => g.classList.contains(c)));
  }
  function hudList() { return [...new Set(Object.values(HUD))].filter((c) => $('game').classList.contains(c)); }
  function resetHud() {
    const g = $('game');
    [...Object.values(HUD), 'hud-any'].forEach((c) => g.classList.remove(c));
  }

  function buildStatChips() {
    const box = $('stats');
    box.textContent = '';
    Object.entries(STATS).forEach(([k, m]) => {
      const s = document.createElement('span');
      s.className = 'stat';
      s.dataset.k = k;
      s.title = k;
      s.innerHTML = `<img alt="${k}" src="${m.icon}"><b>0</b>`;
      box.appendChild(s);
    });
  }

  function renderTop(changed) {
    const g = Math.max(0, Math.min(100, S.vars.성적));
    const s = Math.max(0, Math.min(100, S.vars.의심));
    $('gGrade').querySelector('.g-fill').style.width = g + '%';
    $('gSusp').querySelector('.g-fill').style.width = s + '%';
    document.querySelectorAll('#stats .stat').forEach((el) => {
      el.querySelector('b').textContent = S.vars[el.dataset.k];
      if (changed === el.dataset.k) { el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    });
    $('moneyVal').textContent = S.vars.돈;
    $('ddayNum').textContent = 'D-' + S.day;
    $('ddayTime').textContent = S.time || '';
    const el = changed === '성적' ? $('gGrade') : changed === '의심' ? $('gSusp') : null;
    if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  }

  function flashBag() {
    const b = $('btnBag');
    b.classList.remove('flash');
    void b.offsetWidth;
    b.classList.add('flash');
  }

  let toastTimer = null;
  const toastQueue = [];
  function toast(msg, icon) {
    toastQueue.push({ msg, icon });
    if (!toastTimer) nextToast();
  }
  function nextToast() {
    const t = toastQueue.shift();
    const el = $('toast');
    if (!t) { el.hidden = true; toastTimer = null; return; }
    el.innerHTML = '';
    if (t.icon) { const im = document.createElement('img'); im.src = t.icon; im.alt = ''; el.appendChild(im); }
    el.appendChild(document.createTextNode(t.msg));
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    toastTimer = setTimeout(nextToast, 1600);
  }

  const sign = (d) => (d > 0 ? '+' : '−') + Math.abs(d);
  function applyEffects(effects, quiet) {
    effects.forEach((ef) => {
      if (ef.flag) { S.flags.add(ef.flag); return; }
      const k = ef.v;
      S.vars[k] = (S.vars[k] || 0) + ef.d;
      if (k === '돈' && S.vars.돈 < 0) S.vars.돈 = 0;
      if (STATS[k]) {
        hud(['능력치']);
        renderTop(k);
        if (!quiet) toast(`${k} ${sign(ef.d)}`, STATS[k].icon);
      } else if (k === '돈') {
        hud(['돈']);
        renderTop('돈');
        if (!quiet) toast(`${sign(ef.d)}전`, MONEY_ICON);
      } else if (k === '성적' || k === '의심') {
        hud([k === '성적' ? '장학생' : '의심']);
        renderTop(k);
        if (!quiet) toast(`${k === '성적' ? '장학생 게이지' : '의심도'} ${sign(ef.d)}`);
      } else if (RELS[k]) {
        if (!quiet) toast(ef.d > 0 ? `${RELS[k].up} ♥` : RELS[k].down);
      }
    });
  }

  function interp(text) {
    return text.replace(/\{([^}]+)\}/g, (m, k) => (k in S.vars ? String(S.vars[k]) : m));
  }
  function has(item) { return S.items.includes(item); }
  function cond(expr) {
    const e = expr.trim();
    if (e.startsWith('has:')) return has(e.slice(4).trim());
    if (e.startsWith('perk:')) return S.perks.some((p) => p.name === e.slice(5).trim());
    const m = e.match(/^(\S+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/);
    if (m) {
      const v = S.vars[m[1]] || 0;
      const n = Number(m[3]);
      return { '>=': v >= n, '<=': v <= n, '==': v === n, '!=': v !== n, '>': v > n, '<': v < n }[m[2]];
    }
    return S.flags.has(e.replace(/^flag:/, ''));
  }
  function reqMet(req) {
    if (!req) return true;
    if (req.item) return has(req.item);
    return (S.vars[req.k] || 0) >= req.n;
  }
  function reqChip(req) {
    const span = document.createElement('span');
    span.className = 'req';
    let icon = '';
    let label = '';
    if (req.item) { icon = prog.items[req.item] ? prog.items[req.item].img : ''; label = req.item; }
    else if (STATS[req.k]) { icon = STATS[req.k].icon; label = `${req.k} ${req.n}`; }
    else if (req.k === '돈') { icon = MONEY_ICON; label = `${req.n}전`; }
    else label = `${req.k} ${req.n}`;
    if (icon) { const im = document.createElement('img'); im.src = icon; im.alt = ''; span.appendChild(im); }
    span.appendChild(document.createTextNode(label));
    return span;
  }

  /* ---------- sprites ---------- */
  function setSprite(who, face, pos) {
    const c = CHARS[who];
    if (!c) return;
    let el = sprites.get(who);
    const f = c.faces[face] || (el ? null : 'normal');
    if (!el) {
      el = document.createElement('img');
      el.className = 'sprite enter';
      el.alt = who;
      el.style.setProperty('--scale', c.scale);
      $('sprites').appendChild(el);
      sprites.set(who, el);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('enter')));
    }
    if (f) el.src = charSrc(c.key, f);
    if (pos) el.style.left = (POS[pos] ?? 50) + '%';
    else if (!el.style.left) el.style.left = '50%';
  }
  function hideSprite(who) {
    const list = who === '모두' ? [...sprites.keys()] : [who];
    list.forEach((w) => {
      const el = sprites.get(w);
      if (!el) return;
      sprites.delete(w);
      el.classList.add('enter');
      setTimeout(() => el.remove(), 300);
    });
  }
  function highlight(who) {
    sprites.forEach((el, w) => {
      el.classList.toggle('dim', !!who && w !== who);
      if (w === who) { el.classList.remove('talk'); void el.offsetWidth; el.classList.add('talk'); }
    });
  }

  /* ---------- dialogue ---------- */
  let tipShown = false;
  function hideTip() { if (tipShown) { $('tip').hidden = true; tipShown = false; } }

  async function speak(kind, name, text) {
    const dialog = $('dialog');
    dialog.hidden = false;
    dialog.className = 'dialog ' + kind;
    $('nametag').textContent = name || '';
    $('nametag').hidden = !name;
    hidePops();
    await typeRich($('line'), interp(text), 26);
    dialog.classList.add('ready');
    await waitTap();
    dialog.classList.remove('ready');
    hideTip();
    hidePops();
  }

  function choose(options) {
    return new Promise((res) => {
      const box = $('choices');
      box.textContent = '';
      const shownAt = performance.now();
      options.forEach((o) => {
        const ok = reqMet(o.req);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice' + (ok ? '' : ' locked');
        if (o.req) b.appendChild(reqChip(o.req));
        b.appendChild(document.createTextNode(interp(o.text)));
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (performance.now() - shownAt < 450) return;
          if (!ok) {
            const r = o.req;
            toast(r.item ? `‘${r.item}’이(가) 있어야 해요` : r.k === '돈' ? `돈이 ${r.n}전 있어야 해요` : `${r.k}이(가) ${r.n} 이상이어야 해요`, r.item ? null : STATS[r.k] ? STATS[r.k].icon : MONEY_ICON);
            return;
          }
          box.hidden = true;
          res(o);
        });
        box.appendChild(b);
      });
      box.hidden = false;
      $('dialog').classList.remove('ready');
    });
  }

  /* ---------- overlays ---------- */
  async function dayCard(arg) {
    const [n, date, place] = arg.split('|').map((x) => x.trim());
    const showNum = n && n !== '-';
    if (showNum) { S.day = Number(n); $('dcNum').textContent = 'D-' + n; }
    S.time = '';
    renderTop();
    $('dcNum').hidden = !showNum;
    $('dcDate').textContent = date || '';
    $('dcPlace').textContent = place || '';
    $('dialog').hidden = true;
    hideTip();
    const el = $('daycard');
    el.hidden = false;
    await Promise.race([sleep(2000), waitTap()]);
    tapResolver = null;
    el.hidden = true;
  }

  async function notebook(text) {
    $('dialog').hidden = true;
    const el = $('notebook');
    const t = $('nbText');
    t.textContent = '';
    el.hidden = false;
    const full = interp(text);
    await new Promise((res) => {
      let i = 0;
      let timer = null;
      const finish = () => { clearTimeout(timer); t.textContent = full; if (tapResolver === finish) tapResolver = null; res(); };
      tapResolver = finish;
      const step = () => { i += 1; t.textContent = full.slice(0, i); if (i >= full.length) finish(); else timer = setTimeout(step, 70); };
      step();
    });
    await waitTap();
    el.hidden = true;
  }

  async function cardsIntro() {
    $('dialog').hidden = true;
    const row = $('ciRow');
    row.textContent = '';
    CARDS.forEach((c, i) => {
      const d = document.createElement('div');
      d.className = 'ci-item';
      d.style.animationDelay = i * 0.18 + 's';
      d.innerHTML = `<img alt="" src="${cardSrc(c.id, S.cards[c.id])}"><span>${c.label}</span>`;
      row.appendChild(d);
    });
    $('cardsintro').hidden = false;
    await sleep(600);
    await waitTap();
    $('cardsintro').hidden = true;
    hud(['가방']);
    flashBag();
    toast('윤재의 믿음은 위쪽 ‘가방’에서 언제든 다시 볼 수 있어요');
    await sleep(400);
  }

  async function cardEvent(arg) {
    const [name, stName] = arg.split(/\s+/);
    const card = CARDS.find((c) => c.name === name || c.id === name);
    const st = CARD_STATE[stName] || stName;
    if (!card) return;
    $('dialog').hidden = true;
    const box = $('cardshow');
    const img = $('csImg');
    const wrap = img.parentElement;
    const label = $('csLabel');
    const truth = $('csTruth');
    const common = $('csCommon');
    img.src = cardSrc(card.id, S.cards[card.id]);
    label.textContent = card.label;
    label.className = 'cs-label';
    truth.textContent = '';
    common.textContent = '';
    box.hidden = false;
    await sleep(500);
    wrap.className = 'cs-card shake';
    $('stage').classList.add('shake');
    await sleep(900);
    $('stage').classList.remove('shake');
    wrap.className = 'cs-card flash';
    img.src = cardSrc(card.id, st);
    S.cards[card.id] = st;
    if (CARD_STATE_TEXT[st]) {
      truth.textContent = CARD_STATE_TEXT[st];
      truth.className = 'cs-truth reveal';
    } else if (st === 'broken') {
      label.className = 'cs-label broken';
      await sleep(500);
      truth.textContent = card.truth || '';
      truth.className = 'cs-truth reveal';
      await sleep(900);
      common.textContent = COMMON_TRUTH;
      common.className = 'cs-common reveal';
    }
    await sleep(500);
    await waitTap();
    wrap.className = 'cs-card';
    box.hidden = true;
  }

  let pingTimer = null;
  async function waver(arg) {
    const card = CARDS.find((c) => c.name === arg.trim() || c.id === arg.trim());
    if (!card) return;
    const ping = $('cardping');
    clearTimeout(pingTimer);
    $('cpImg').src = cardSrc(card.id, S.cards[card.id]);
    $('cpText').textContent = `‘${card.label}’ 믿음이 흔들린다`;
    ping.classList.remove('out');
    ping.hidden = false;
    ping.style.animation = 'none'; void ping.offsetWidth; ping.style.animation = '';
    pingTimer = setTimeout(() => {
      ping.classList.add('out');
      pingTimer = setTimeout(() => { ping.hidden = true; ping.classList.remove('out'); }, 350);
    }, 2400);
    await sleep(900);
  }

  // shared modal for history notes and new perks
  async function modal({ kicker, title, text, img, icon, saved }) {
    $('dialog').hidden = true;
    hideTip();
    hidePops();
    const im = $('nsImg');
    im.src = img || '';
    im.hidden = !img;
    im.className = 'note-img' + (icon ? ' icon' : '');
    $('nsKicker').textContent = kicker;
    $('nsTitle').textContent = title;
    $('nsText').textContent = text;
    $('nsSaved').textContent = saved || '';
    $('noteshow').hidden = false;
    await sleep(500);
    await waitTap();
    $('noteshow').hidden = true;
    hud(['가방']);
    flashBag();
  }
  async function noteEvent(arg) {
    const [title, bgKey, ...rest] = arg.split('|').map((x) => x.trim());
    if (S.notes.some((n) => n.title === title)) return;
    const note = { title, img: BG[bgKey] || '', text: rest.join(' | ') };
    S.notes.push(note);
    await modal({ kicker: '알고 가기', title, text: note.text, img: note.img, saved: '역사 노트에 저장했어요. 위쪽 ‘가방’에서 다시 볼 수 있어요.' });
  }
  async function perkEvent(arg) {
    const [name, ...rest] = arg.split('|').map((x) => x.trim());
    if (S.perks.some((p) => p.name === name)) return;
    const perk = { name, text: rest.join(' | ') };
    S.perks.push(perk);
    await modal({ kicker: '새로운 마음을 얻었다', title: name, text: perk.text, img: STATS.용기.icon, icon: true, saved: '가방 > 윤재에서 볼 수 있어요.' });
  }

  /* ---------- bag ---------- */
  let bagTab = '윤재';
  let bagNote = -1;
  let bagItem = -1;
  function openBag(tab) {
    if (tab) bagTab = tab;
    const tabs = $('bagTabs');
    tabs.textContent = '';
    ['윤재', '소지품', '할 일', '믿음', '역사 노트'].forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.className = t === bagTab ? 'on' : '';
      b.addEventListener('click', (e) => { e.stopPropagation(); openBag(t); });
      tabs.appendChild(b);
    });
    const body = $('bagBody');
    body.textContent = '';
    const col = (title) => {
      const c = document.createElement('div');
      c.className = 'bag-col';
      if (title) { const h = document.createElement('h3'); h.textContent = title; c.appendChild(h); }
      body.appendChild(c);
      return c;
    };
    const row = (parent, icon, name, value, desc) => {
      const r = document.createElement('div');
      r.className = 'row';
      if (icon) { const im = document.createElement('img'); im.src = icon; im.alt = ''; r.appendChild(im); }
      const wrap = document.createElement('div');
      wrap.className = 'row-main';
      const head = document.createElement('div');
      head.className = 'row-h';
      const b = document.createElement('b');
      b.textContent = name;
      head.appendChild(b);
      if (value !== null && value !== undefined) { const v = document.createElement('span'); v.className = 'row-v'; v.innerHTML = value; head.appendChild(v); }
      wrap.appendChild(head);
      if (desc) { const s = document.createElement('small'); s.textContent = desc; wrap.appendChild(s); }
      r.appendChild(wrap);
      parent.appendChild(r);
    };
    const empty = (parent, text) => { const p = document.createElement('p'); p.className = 'empty'; p.textContent = text; parent.appendChild(p); };

    if (bagTab === '윤재') {
      const a = col('능력치');
      Object.entries(STATS).forEach(([k, m]) => row(a, m.icon, k, String(S.vars[k]), m.desc));
      row(a, MONEY_ICON, '돈', `${S.vars.돈}전`, '');
      const c = col('관계');
      Object.entries(RELS).forEach(([k, r]) => {
        if (k !== '만식' && !S.flags.has('만남_' + k)) return;
        const v = Math.max(0, Math.min(5, S.vars[k] || 0));
        row(c, null, r.name, `<span class="hearts">${'♥'.repeat(v)}${'♡'.repeat(5 - v)}</span>`, '');
      });
      const h = document.createElement('h3');
      h.textContent = '마음';
      h.style.marginTop = '8px';
      c.appendChild(h);
      if (!S.perks.length) empty(c, '아직 없어요. 믿음이 깨지면 새로운 마음이 생겨요.');
      S.perks.forEach((p) => row(c, STATS.용기.icon, p.name, null, p.text));
    } else if (bagTab === '소지품') {
      const a = col();
      if (!S.items.length) { empty(a, '아직 가진 물건이 없어요.'); }
      else {
        const grid = document.createElement('div');
        grid.className = 'items';
        S.items.forEach((name, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'item' + (i === bagItem ? ' on' : '');
          const meta = prog.items[name] || {};
          b.innerHTML = `<img alt="" src="${meta.img || ''}"><b></b>`;
          b.querySelector('b').textContent = name;
          b.addEventListener('click', (e) => { e.stopPropagation(); bagItem = i; openBag(); });
          grid.appendChild(b);
        });
        a.appendChild(grid);
        const d = document.createElement('p');
        d.className = 'item-desc';
        const pick = S.items[bagItem] || S.items[S.items.length - 1];
        d.textContent = pick ? `${pick} · ${(prog.items[pick] || {}).desc || ''}` : '';
        a.appendChild(d);
      }
    } else if (bagTab === '할 일') {
      const a = col();
      if (!S.quests.length) empty(a, '아직 할 일이 없어요.');
      S.quests.forEach((q) => {
        const d = document.createElement('div');
        d.className = 'quest' + (q.done ? ' done' : '');
        d.textContent = q.text;
        a.appendChild(d);
      });
    } else if (bagTab === '믿음') {
      const a = col();
      if (!$('game').classList.contains('hud-bag') || !S.flags.has('믿음소개')) { empty(a, '아직 몰라요.'); }
      const r = document.createElement('div');
      r.className = 'ci-row';
      CARDS.forEach((c) => {
        const st = S.cards[c.id];
        const d = document.createElement('div');
        d.className = 'ci-item ' + st;
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = `<img alt="" src="${cardSrc(c.id, st)}">`;
        b.addEventListener('click', (e) => { e.stopPropagation(); openBelief(c); });
        const s = document.createElement('span');
        s.textContent = c.label;
        d.append(b, s);
        r.appendChild(d);
      });
      if (S.flags.has('믿음소개')) a.appendChild(r);
    } else {
      if (!S.notes.length) { empty(col(), '아직 역사 노트가 없어요.'); }
      else {
        const list = document.createElement('div');
        list.className = 'notes-list';
        const idx = bagNote >= 0 && bagNote < S.notes.length ? bagNote : S.notes.length - 1;
        S.notes.forEach((n, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = n.title;
          b.className = i === idx ? 'on' : '';
          b.addEventListener('click', (e) => { e.stopPropagation(); bagNote = i; openBag(); });
          list.appendChild(b);
        });
        body.appendChild(list);
        const n = S.notes[idx];
        const c = col();
        if (n.img) { const im = document.createElement('img'); im.className = 'note-img'; im.style.width = '100%'; im.style.maxHeight = '26vh'; im.src = n.img; im.alt = ''; c.appendChild(im); }
        const h = document.createElement('h3'); h.className = 'note-title'; h.textContent = n.title; c.appendChild(h);
        const p = document.createElement('p'); p.className = 'note-text'; p.textContent = n.text; c.appendChild(p);
      }
    }
    $('bag').hidden = false;
  }

  function openBelief(c) {
    const st = S.cards[c.id];
    $('bvImg').src = cardSrc(c.id, st);
    $('bvLabel').textContent = c.label;
    $('bvTruth').textContent = st === 'broken' ? c.truth : st === 'cracked' ? '금이 크게 갔다.' : st === 'hairline' ? '아주 가늘게, 실금이 갔다.' : '';
    $('beliefview').hidden = false;
  }

  /* ---------- map exploration ---------- */
  function chooseSpot(names, timeLabel, left) {
    return new Promise((res) => {
      $('mapTime').textContent = timeLabel;
      $('mapLeft').textContent = `어디로 갈까? · 남은 시간 ${left}`;
      const box = $('mapSpots');
      box.textContent = '';
      names.forEach((n, i) => {
        const sp = prog.spots[n] || { x: 50, y: 50, hint: '' };
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'spot' + ((S.vars['방문_' + n] || 0) === 0 ? ' new' : '');
        b.style.left = sp.x + '%';
        b.style.top = sp.y + '%';
        b.style.animationDelay = i * 0.05 + 's';
        b.innerHTML = '<b></b><small></small>';
        b.querySelector('b').textContent = n;
        b.querySelector('small').textContent = sp.hint;
        b.addEventListener('click', (e) => { e.stopPropagation(); res(n); });
        box.appendChild(b);
      });
      $('mapview').hidden = false;
    });
  }

  async function runSub(start, id) {
    const saved = pc;
    pc = start;
    while (id === runId && pc < prog.cmds.length) {
      const c = prog.cmds[pc++];
      if (c.type === 'return') break;
      try { await exec(c, id); } catch (err) { console.error(err); }
    }
    pc = saved;
  }

  async function explore(arg, id) {
    const bar = arg.indexOf('|');
    const count = Number(arg.slice(0, bar).trim()) || 3;
    const names = arg.slice(bar + 1).trim().split(/\s+/).filter(Boolean);
    const times = TIMES.slice(TIMES.length - Math.min(count, TIMES.length));
    hideSprite('모두');
    $('dialog').hidden = true;
    for (let i = 0; i < count; i++) {
      S.time = times[i] || '저녁';
      renderTop();
      const n = await chooseSpot(names, S.time, count - i);
      $('mapview').hidden = true;
      S.vars['방문_' + n] = (S.vars['방문_' + n] || 0) + 1;
      if (BG[n]) await setBg(n);
      const label = '장소:' + n;
      if (label in prog.labels) await runSub(prog.labels[label], id);
      hideSprite('모두');
      $('dialog').hidden = true;
      if (id !== runId) return;
    }
    S.time = '';
    renderTop();
  }

  /* ---------- market mini-game: drop rice sacks onto the A-frame ---------- */
  let carryDrop = null;
  async function carryGame() {
    $('dialog').hidden = true;
    const box = $('carry');
    const sack = $('crSack');
    const stack = $('crStack');
    const msg = $('crMsg');
    stack.textContent = '';
    msg.className = 'cr-msg';
    msg.textContent = '가마니가 지게 위에 왔을 때 화면을 눌러 내려놓으세요';
    box.hidden = false;
    const total = 6;
    const tol = 7 + 1.2 * Math.min(6, S.vars.체력);
    let ok = 0;
    let perfect = 0;
    box.onclick = (e) => { e.stopPropagation(); if (carryDrop) carryDrop(); };
    for (let n = 0; n < total; n++) {
      $('crInfo').textContent = `${n + 1} / ${total} · 성공 ${ok}`;
      sack.classList.remove('drop');
      sack.style.top = '4%';
      sack.hidden = false;
      const speed = 1.7 + n * 0.32;
      const t0 = performance.now();
      let x = 50;
      await new Promise((res) => {
        let raf = 0;
        const loop = (now) => {
          x = 50 + 40 * Math.sin(((now - t0) / 1000) * speed + 1.3);
          sack.style.left = x + '%';
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        carryDrop = () => { carryDrop = null; cancelAnimationFrame(raf); res(); };
      });
      const off = Math.abs(x - 50);
      const hit = off <= tol;
      sack.classList.add('drop');
      sack.style.top = hit ? `${44 - Math.min(ok, 5) * 4}%` : '86%';
      await sleep(340);
      if (hit) {
        ok += 1;
        const great = off <= tol / 3;
        if (great) perfect += 1;
        sack.hidden = true;
        const im = document.createElement('img');
        im.src = 'assets/minigame/mg_sack.webp';
        im.alt = '';
        stack.appendChild(im);
        msg.className = 'cr-msg good';
        msg.textContent = great ? '딱 맞았다! +3전' : '성공! +2전';
      } else {
        msg.className = 'cr-msg bad';
        msg.textContent = '쿵! 가마니가 바닥에 떨어졌다';
      }
      $('crInfo').textContent = `${n + 1} / ${total} · 성공 ${ok}`;
      await sleep(650);
      sack.hidden = true;
    }
    const pay = ok * 2 + perfect;
    S.vars.짐결과 = ok;
    msg.className = 'cr-msg good';
    msg.textContent = `가마니 ${ok}개를 날랐다. 품삯 ${pay}전 · 화면을 눌러 계속`;
    await new Promise((res) => { carryDrop = () => { carryDrop = null; res(); }; });
    box.onclick = null;
    box.hidden = true;
    applyEffects([{ v: '돈', d: pay }]);
  }

  /* ---------- exam ---------- */
  async function exam(c) {
    $('dialog').hidden = true;
    hideTip();
    const box = $('exam');
    const btnO = $('btnO');
    const btnX = $('btnX');
    const stamp = $('exStamp');
    const fb = $('exFeedback');
    const timerBox = $('exTimer');
    const bonus = Math.max(0, Math.min(4, S.vars.학업 - 3));
    const secs = c.secs + bonus;
    $('exPart').textContent = c.title || '시험';
    box.hidden = false;
    let correct = 0;
    for (let qi = 0; qi < c.qs.length; qi++) {
      const q = c.qs[qi];
      $('exProg').textContent = `${qi + 1} / ${c.qs.length}` + (bonus ? ` · 학업 보너스 +${bonus}초` : '');
      $('exQ').textContent = q.text;
      stamp.hidden = true;
      fb.textContent = '';
      btnO.disabled = false;
      btnX.disabled = false;
      const answer = await new Promise((res) => {
        const t0 = performance.now();
        const total = secs * 1000;
        const tick = setInterval(() => {
          const left = Math.max(0, total - (performance.now() - t0));
          $('exSec').textContent = Math.ceil(left / 1000);
          timerBox.classList.toggle('hurry', left < 2000);
          if (left <= 0) done(null);
        }, 100);
        $('exSec').textContent = secs;
        function done(v) {
          clearInterval(tick);
          btnO.onclick = null;
          btnX.onclick = null;
          timerBox.classList.remove('hurry');
          res(v);
        }
        btnO.onclick = (e) => { e.stopPropagation(); done('O'); };
        btnX.onclick = (e) => { e.stopPropagation(); done('X'); };
      });
      btnO.disabled = true;
      btnX.disabled = true;
      if (answer) {
        stamp.src = answer === 'O' ? 'assets/minigame/mg_stamp_o.webp' : 'assets/minigame/mg_stamp_x.webp';
        stamp.hidden = false;
        stamp.style.animation = 'none'; void stamp.offsetWidth; stamp.style.animation = '';
      }
      const hit = answer === q.ans;
      if (hit) {
        correct += 1;
        applyEffects([{ v: '성적', d: c.key === '수신' ? 3 : 2 }], true);
      }
      if (c.key === '수신') fb.textContent = answer ? `시험 정답: ${q.ans}  ·  ${hit ? '+3점' : '0점'}` : `시간 초과  ·  시험 정답: ${q.ans}`;
      else fb.textContent = answer ? (hit ? '정답!' : '오답') : '시간 초과';
      await sleep(1100);
    }
    S.vars[c.key] = (S.vars[c.key] || 0) + correct;
    $('exQ').textContent = `${c.title} 끝\n${c.qs.length}문제 중 ${correct}문제가 시험 정답과 같았다.`;
    stamp.hidden = true;
    fb.textContent = '화면을 눌러 계속';
    await sleep(400);
    await waitTap();
    box.hidden = true;
    toast(`장학생 게이지 +${correct * (c.key === '수신' ? 3 : 2)}`);
  }

  async function resultBoard() {
    $('dialog').hidden = true;
    const myStudy = Math.min(99, 84 + 2 * S.vars.학과 + 2 * Math.max(0, S.vars.학업 - 3));
    const myCivic = 25 * S.vars.수신;
    const rows = [
      { name: '김덕수', study: 72, civic: 100, conduct: '갑', rank: 1 },
      { name: '박기천', study: 80, civic: 100, conduct: '갑', rank: 2 },
      { name: '윤재', study: myStudy, civic: myCivic, conduct: '을', rank: 3, me: true },
    ];
    $('rsTitle').textContent = '1929년도 전라남도 장학생 후보 · 중간 순위';
    $('rsSub').textContent = '조선인 학생 장학생 정원 2명';
    $('rsTable').innerHTML =
      '<tr><th>이름</th><th>학과</th><th>수신</th><th>품행</th><th>순위</th></tr>' +
      rows.map((r) => `<tr class="${r.me ? 'me' : ''}"><td>${r.name}</td><td class="${r.me ? 'best' : ''}">${r.study}</td><td>${r.civic}</td><td>${r.conduct}</td><td>${r.rank}</td></tr>`).join('');
    $('rsNote').textContent = '※ 순위는 품행 평가를 먼저 반영함. 일본인 학생 장학생 정원 12명은 별도로 선발함.';
    $('result').hidden = false;
    await sleep(600);
    await waitTap();
    $('result').hidden = true;
  }

  function endScreen() {
    $('dialog').hidden = true;
    clearSave();
    $('esCard').src = cardSrc('study', S.cards.study);
    const v = S.vars;
    const hearts = (k) => { const n = Math.max(0, Math.min(5, v[k] || 0)); return '♥'.repeat(n) + '♡'.repeat(5 - n); };
    const stats = [
      ['능력치', `학업 ${v.학업} · 눈치 ${v.눈치} · 체력 ${v.체력} · 용기 ${v.용기}`],
      ['모은 돈', `${v.돈}전` + (S.quests.find((q) => q.id === '월사금' && q.done) ? ' (월사금 마련!)' : '')],
      ['장학생 게이지', `${Math.max(0, Math.min(100, v.성적))} / 100`],
      ['수신 시험', `시험이 원하는 답을 ${v.수신} / 4개 골랐어요`],
      ['만식', hearts('만식')],
    ];
    if (S.flags.has('만남_정희')) stats.push(['정희', hearts('정희')]);
    if (S.flags.has('만남_진수')) stats.push(['진수 형', hearts('진수')]);
    if (S.perks.length) stats.push(['새로운 마음', S.perks.map((p) => p.name).join(', ')]);
    $('esStats').innerHTML = stats.map(([k, val]) => `<li><b>${k}</b><span>${val}</span></li>`).join('');
    $('endscreen').hidden = false;
  }

  async function setBg(name) {
    const src = BG[name];
    if (!src) return;
    S.bg = name;
    const el = $('bg');
    if (el.getAttribute('src') === src) return;
    el.style.opacity = 0;
    await sleep(300);
    el.src = src;
    el.style.opacity = 1;
  }

  /* ---------- prologue slides ---------- */
  let skipTarget = null;
  let skipReq = false;
  async function slide(arg) {
    const bar = arg.indexOf('|');
    const left = (bar < 0 ? '' : arg.slice(0, bar)).trim();
    const text = (bar < 0 ? arg : arg.slice(bar + 1)).trim();
    const [bgName, who] = left.split(/\s+/);
    const box = $('slide');
    const bg = $('slBg');
    const ch = $('slChar');
    $('dialog').hidden = true;
    hideTip();
    box.hidden = false;
    const src = BG[bgName];
    if (src && bg.getAttribute('src') !== src) {
      bg.style.opacity = 0;
      await sleep(300);
      bg.src = src;
      bg.style.opacity = 1;
    }
    if (skipReq) return;
    if (who && CHARS[who]) {
      const next = charSrc(CHARS[who].key, 'normal');
      if (ch.hidden || ch.getAttribute('src') !== next) { ch.src = next; ch.hidden = false; }
      box.classList.add('with-char');
    } else {
      ch.hidden = true;
      box.classList.remove('with-char');
    }
    hidePops();
    const voice = text.startsWith('(속)');
    $('slText').classList.toggle('voice', voice);
    await typeRich($('slText'), interp(voice ? text.slice(3).trim() : text), voice ? 55 : 45);
    if (skipReq) { hidePops(); return; }
    await waitTap();
    hidePops();
  }

  /* ---------- save / continue ---------- */
  function save(atPc) {
    try {
      const data = {
        pc: atPc, vars: S.vars, flags: [...S.flags], cards: S.cards, seenTerms: [...S.seenTerms],
        notes: S.notes, items: S.items, perks: S.perks, quests: S.quests, hud: hudList(), day: S.day, bg: S.bg,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (err) { /* storage may be unavailable */ }
  }
  function loadSave() {
    try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch (err) { return null; }
  }
  function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* ignore */ } }

  /* ---------- runner ---------- */
  async function exec(c, id) {
    switch (c.type) {
      case 'day': save(pc - 1); return dayCard(c.arg);
      case 'bg': return setBg(c.arg);
      case 'show': { const [who, face, pos] = c.arg.split(/\s+/); setSprite(who, face, pos); return sleep(120); }
      case 'face': { const [who, face] = c.arg.split(/\s+/); setSprite(who, face); return; }
      case 'hide': hideSprite(c.arg.trim()); return sleep(150);
      case 'say': {
        if (c.face) setSprite(c.who, c.face);
        highlight(sprites.has(c.who) ? c.who : null);
        return speak('say', c.who === '진수' ? '진수 형' : c.who, c.text);
      }
      case 'think': highlight(sprites.has('윤재') ? '윤재' : null); return speak('think', '윤재 속마음', c.text);
      case 'narr': highlight(null); return speak('narr', '', c.text);
      case 'choice': {
        const o = await choose(c.options);
        applyEffects(o.effects);
        if (o.go) pc = labelAt(o.go);
        return;
      }
      case 'jump': if (!c.cond || cond(c.cond)) pc = labelAt(c.go); return;
      case 'stat': {
        const [eff, note] = c.arg.split('|').map((x) => x.trim());
        const m = eff.match(/^(\S+)\s*([+-]\d+)$/);
        if (m) {
          applyEffects([{ v: m[1], d: Number(m[2]) }], !!note);
          if (note) toast(`${note}  ·  ${m[1] === '성적' ? '장학생 게이지' : m[1]} ${m[2]}`);
        }
        return sleep(300);
      }
      case 'flag': S.flags.add(c.arg.trim()); return;
      case 'tip':
      case 'guide': {
        const [term, text] = c.arg.split('|').map((x) => x.trim());
        $('tipTerm').textContent = term;
        $('tipText').textContent = text || '';
        $('tip').dataset.kind = c.type;
        $('tip').hidden = false;
        tipShown = true;
        return;
      }
      case 'hud': hud(c.arg.split(/\s+/)); renderTop(); return sleep(300);
      case 'slide': return slide(c.arg);
      case 'skippable': {
        const target = c.arg.trim();
        skipTarget = target && target !== '끝' ? target : null;
        $('btnSkip').hidden = !skipTarget;
        return;
      }
      case 'note': return noteEvent(c.arg);
      case 'perk': return perkEvent(c.arg);
      case 'waver': return waver(c.arg);
      case 'get': {
        const name = c.arg.trim();
        if (!has(name)) S.items.push(name);
        hud(['가방']);
        flashBag();
        toast(`‘${name}’을(를) 얻었다`, (prog.items[name] || {}).img);
        return sleep(300);
      }
      case 'lose': {
        const name = c.arg.trim();
        S.items = S.items.filter((x) => x !== name);
        toast(`‘${name}’을(를) 건넸다`, (prog.items[name] || {}).img);
        return sleep(300);
      }
      case 'quest': {
        const [qid, text] = c.arg.split('|').map((x) => x.trim());
        if (!S.quests.some((q) => q.id === qid)) S.quests.push({ id: qid, text: text || qid, done: false });
        hud(['가방']);
        flashBag();
        toast(`할 일: ${text || qid}`);
        return sleep(300);
      }
      case 'done': {
        const q = S.quests.find((x) => x.id === c.arg.trim());
        if (q && !q.done) { q.done = true; toast(`할 일 완료: ${q.text}`); }
        return sleep(300);
      }
      case 'explore': save(pc - 1); return explore(c.arg, id);
      case 'return': return;
      case 'carry': return carryGame();
      case 'notebook': return notebook(c.arg);
      case 'cards': S.flags.add('믿음소개'); return cardsIntro();
      case 'card': return cardEvent(c.arg);
      case 'exam': return exam(c);
      case 'result': return resultBoard();
      case 'shake': $('stage').classList.add('shake'); await sleep(450); $('stage').classList.remove('shake'); return;
      case 'wait': return sleep(Number(c.arg) * 1000 || 500);
      case 'end': endScreen(); pc = prog.cmds.length; return;
      default: console.warn('알 수 없는 명령:', c.type); return;
    }
  }

  function labelAt(name) {
    if (!(name in prog.labels)) { console.warn('없는 라벨:', name); return pc; }
    return prog.labels[name];
  }

  async function run(id) {
    while (id === runId && pc < prog.cmds.length) {
      const c = prog.cmds[pc++];
      if (c.type !== 'slide') {
        skipReq = false;
        if (!$('slide').hidden) $('slide').hidden = true;
      }
      try { await exec(c, id); } catch (err) { console.error(err); }
    }
  }

  const OVERLAYS = ['endscreen', 'choices', 'dialog', 'exam', 'result', 'cardshow', 'notebook', 'cardsintro', 'daycard',
    'tip', 'slide', 'btnSkip', 'noteshow', 'bag', 'cardping', 'mapview', 'carry', 'beliefview'];

  function start(fromSave) {
    runId += 1;
    S = newState();
    pc = 0;
    tapResolver = null;
    carryDrop = null;
    skipTarget = null;
    skipReq = false;
    hidePops();
    resetHud();
    hideSprite('모두');
    $('bg').removeAttribute('src');
    $('slBg').removeAttribute('src');
    OVERLAYS.forEach((k) => { $(k).hidden = true; });
    if (fromSave) {
      Object.assign(S.vars, fromSave.vars);
      S.flags = new Set(fromSave.flags);
      S.cards = fromSave.cards;
      S.seenTerms = new Set(fromSave.seenTerms);
      S.notes = fromSave.notes;
      S.items = fromSave.items;
      S.perks = fromSave.perks;
      S.quests = fromSave.quests;
      S.day = fromSave.day;
      fromSave.hud.forEach((c) => $('game').classList.add(c));
      $('game').classList.toggle('hud-any', fromSave.hud.length > 0);
      if (fromSave.bg) setBg(fromSave.bg);
      pc = fromSave.pc;
    }
    renderTop();
    run(runId);
  }

  /* ---------- boot ---------- */
  function preload(list, onProgress) {
    let done = 0;
    return Promise.all(list.map((src) => new Promise((res) => {
      const im = new Image();
      im.onload = im.onerror = () => { done += 1; onProgress(done / list.length); res(); };
      im.src = src;
    })));
  }

  async function boot() {
    prog = parse(window.STORY_STAGE1 || '');
    buildTermRe();
    buildStatChips();
    S = newState();
    renderTop();
    const list = [
      ...new Set(Object.values(BG)),
      ...Object.values(CHARS).flatMap((c) => Object.values(c.faces).map((f) => charSrc(c.key, f))),
      ...CARDS.flatMap((c) => c.states.map((s) => cardSrc(c.id, s))),
      ...Object.values(STATS).map((s) => s.icon), MONEY_ICON, 'assets/ui/icon_bag.webp',
      ...Object.values(prog.items).map((i) => i.img),
      'assets/bg/map_gwangju.webp',
      'assets/ui/ui_dialog.webp', 'assets/ui/ui_button.webp', 'assets/ui/ui_topbar.webp', 'assets/ui/ui_notebook.webp',
      'assets/minigame/mg_exam_paper.webp', 'assets/minigame/mg_stamp_o.webp', 'assets/minigame/mg_stamp_x.webp',
      'assets/minigame/mg_timer.webp', 'assets/minigame/mg_sack.webp', 'assets/minigame/mg_jige.webp',
    ];
    await preload(list, (p) => {
      $('ldFill').style.width = Math.round(p * 100) + '%';
      $('ldText').textContent = `그림을 불러오는 중 ${Math.round(p * 100)}%`;
    });
    $('btnContinue').hidden = !loadSave();
    $('loading').hidden = true;
    $('title').hidden = false;
  }

  $('btnStart').addEventListener('click', (e) => { e.stopPropagation(); clearSave(); $('title').hidden = true; start(); });
  $('btnContinue').addEventListener('click', (e) => { e.stopPropagation(); const s = loadSave(); $('title').hidden = true; start(s); });
  $('btnRestart').addEventListener('click', (e) => { e.stopPropagation(); start(); });
  $('btnBag').addEventListener('click', (e) => { e.stopPropagation(); openBag(); });
  $('btnBagClose').addEventListener('click', (e) => { e.stopPropagation(); $('bag').hidden = true; });
  $('bag').addEventListener('click', (e) => { e.stopPropagation(); if (e.target.id === 'bag') $('bag').hidden = true; });
  $('beliefview').addEventListener('click', (e) => { e.stopPropagation(); $('beliefview').hidden = true; });
  $('btnSkip').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!skipTarget) return;
    skipReq = true;
    pc = labelAt(skipTarget);
    skipTarget = null;
    $('btnSkip').hidden = true;
    fireTap();
  });
  $('btnFull').addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await document.documentElement.requestFullscreen();
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape').catch(() => {});
    } catch (err) {
      $('btnFull').textContent = '이 기기에서는 전체 화면을 지원하지 않아요';
    }
  });

  window.D100 = { parse, state: () => S };
  boot();
})();
