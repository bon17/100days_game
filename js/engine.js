/* D-100 game engine.
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
  };
  const CHARS = {
    윤재: { key: 'yunjae', scale: 1, faces: { 기본: 'normal', 웃음: 'smile', 놀람: 'surprised', 화남: 'angry', 슬픔: 'sad' } },
    만식: { key: 'mansik', scale: 0.84, faces: { 기본: 'normal', 웃음: 'smile', 걱정: 'worried' } },
    교장: { key: 'principal', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    교관: { key: 'instructor', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
  };
  const POS = { 왼쪽: 24, 가운데: 50, 오른쪽: 76 };
  const CARDS = [
    { id: 'study', name: '공부', label: '공부만 잘하면 돼', truth: '실력만으로 오르는 사다리가 아니었다.', states: ['normal', 'cracked', 'broken'] },
    { id: 'safe', name: '안전', label: '가만히 있으면 안전해', states: ['normal'] },
    { id: 'home', name: '집', label: '우리 집 먹고사는 게 먼저야', states: ['normal'] },
    { id: 'escape', name: '탈출', label: '나 하나만 빠져나가면 돼', states: ['normal'] },
    { id: 'hopeless', name: '체념', label: '어차피 안 바뀌어', states: ['normal'] },
  ];
  const CARD_STATE = { 기본: 'normal', 금감: 'cracked', 깨짐: 'broken' };
  const COMMON_TRUTH = '내가 틀린 게 아니었다. 세상이 그렇게 놔두지 않았다.';
  const cardSrc = (id, st) => `assets/card/card_${id}${st === 'normal' ? '' : '_' + st}.webp`;
  const charSrc = (key, face) => `assets/char/char_${key}_${face}.webp`;

  const PRELOAD = [
    ...Object.values(BG),
    ...Object.values(CHARS).flatMap((c) => Object.values(c.faces).map((f) => charSrc(c.key, f))),
    ...CARDS.flatMap((c) => c.states.map((s) => cardSrc(c.id, s))),
    'assets/ui/ui_dialog.webp', 'assets/ui/ui_button.webp', 'assets/ui/ui_topbar.webp', 'assets/ui/ui_notebook.webp',
    'assets/minigame/mg_exam_paper.webp', 'assets/minigame/mg_stamp_o.webp', 'assets/minigame/mg_stamp_x.webp', 'assets/minigame/mg_timer.webp',
  ];

  /* ---------- screenplay parser ---------- */
  function parseEffects(s) {
    if (!s) return [];
    return s.split(',').map((t) => t.trim()).filter(Boolean).map((t) => {
      if (t.startsWith('flag:')) return { flag: t.slice(5).trim() };
      const m = t.match(/^(\S+?)\s*([+-]\d+)$/);
      return m ? { v: m[1], d: Number(m[2]) } : null;
    }).filter(Boolean);
  }

  function parse(src) {
    const cmds = [];
    const labels = {};
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
        if (name === 'exam') {
          const [key, title, secs] = arg.split('|').map((x) => x.trim());
          const qs = [];
          while (++i < lines.length && lines[i].trim() !== '@endexam') {
            const q = lines[i].trim();
            const m = q.match(/^Q\s+([OX])\s*\|\s*(.+)$/);
            if (m) qs.push({ ans: m[1], text: m[2] });
          }
          cmds.push({ type: 'exam', key, title, secs: Number(secs) || 6, qs });
        } else {
          cmds.push({ type: name, arg });
        }
        continue;
      }
      if (t.startsWith('?')) {
        const m = t.slice(1).match(/^(.*?)\s*(?:\{([^}]*)\})?\s*(?:->\s*(\S+))?\s*$/);
        const opt = { text: m[1].trim(), effects: parseEffects(m[2]), go: m[3] || null };
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
    return { cmds, labels };
  }

  /* ---------- state ---------- */
  const VAR_NAME = { 성적: '장학생 게이지', 의심: '의심도' };
  let S;
  let prog;
  let pc = 0;
  let runId = 0;
  const sprites = new Map();

  function newState() {
    return {
      vars: { 성적: 70, 의심: 0, 우정: 0, 학과: 0, 수신: 0 },
      flags: new Set(),
      cards: Object.fromEntries(CARDS.map((c) => [c.id, 'normal'])),
      day: 100,
    };
  }

  /* ---------- input ---------- */
  let tapResolver = null;
  function waitTap() { return new Promise((r) => { tapResolver = r; }); }
  function fireTap() { if (tapResolver) { const r = tapResolver; tapResolver = null; r(); } }
  $('game').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (!$('beliefview').hidden) return;
    fireTap();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
      e.preventDefault();
      fireTap();
    }
  });

  /* ---------- HUD ---------- */
  function renderGauges(pulseVar) {
    const g = Math.max(0, Math.min(100, S.vars.성적));
    const s = Math.max(0, Math.min(100, S.vars.의심));
    $('gGrade').querySelector('.g-fill').style.width = g + '%';
    $('gSusp').querySelector('.g-fill').style.width = s + '%';
    const el = pulseVar === '성적' ? $('gGrade') : pulseVar === '의심' ? $('gSusp') : null;
    if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  }

  function renderBeliefs(flashId) {
    const list = $('beliefList');
    const mini = $('minicards');
    list.textContent = '';
    mini.textContent = '';
    CARDS.forEach((c) => {
      const st = S.cards[c.id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'belief ' + st + (flashId === c.id ? ' flash' : '');
      b.innerHTML = `<img alt="" src="${cardSrc(c.id, st)}"><span>${c.label}</span>`;
      b.addEventListener('click', () => openBelief(c));
      list.appendChild(b);
      const mb = document.createElement('img');
      mb.src = cardSrc(c.id, st);
      mb.alt = c.label;
      if (st === 'broken') mb.className = 'broken';
      mb.addEventListener('click', (e) => { e.stopPropagation(); openBelief(c); });
      mini.appendChild(mb);
    });
  }

  function openBelief(c) {
    const st = S.cards[c.id];
    $('bvImg').src = cardSrc(c.id, st);
    $('bvLabel').textContent = c.label;
    $('bvTruth').textContent = st === 'broken' ? c.truth : st === 'cracked' ? '금이 가기 시작했다.' : '';
    $('beliefview').hidden = false;
  }
  $('beliefview').addEventListener('click', (e) => { e.stopPropagation(); $('beliefview').hidden = true; });

  let toastTimer = null;
  const toastQueue = [];
  function toast(msg) {
    toastQueue.push(msg);
    if (!toastTimer) nextToast();
  }
  function nextToast() {
    const msg = toastQueue.shift();
    const el = $('toast');
    if (!msg) { el.hidden = true; toastTimer = null; return; }
    el.textContent = msg;
    el.hidden = false;
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    toastTimer = setTimeout(nextToast, 1700);
  }

  function applyEffects(effects, quiet) {
    effects.forEach((ef) => {
      if (ef.flag) { S.flags.add(ef.flag); return; }
      S.vars[ef.v] = (S.vars[ef.v] || 0) + ef.d;
      if (ef.v === '성적' || ef.v === '의심') {
        renderGauges(ef.v);
        if (!quiet) toast(`${VAR_NAME[ef.v]} ${ef.d > 0 ? '+' : '−'}${Math.abs(ef.d)}`);
      } else if (ef.v === '우정' && !quiet) {
        toast(ef.d > 0 ? '만식과 조금 더 가까워졌다' : '만식이 조금 서운해한다');
      }
    });
  }

  function interp(text) {
    return text.replace(/\{([^}]+)\}/g, (m, k) => (k in S.vars ? String(S.vars[k]) : m));
  }

  function cond(expr) {
    const m = expr.trim().match(/^(\S+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/);
    if (m) {
      const v = S.vars[m[1]] || 0;
      const n = Number(m[3]);
      return { '>=': v >= n, '<=': v <= n, '==': v === n, '!=': v !== n, '>': v > n, '<': v < n }[m[2]];
    }
    return S.flags.has(expr.trim().replace(/^flag:/, ''));
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
    const line = $('line');
    dialog.hidden = false;
    dialog.className = 'dialog ' + kind;
    $('nametag').textContent = name || '';
    $('nametag').hidden = !name;
    const full = interp(text);
    line.textContent = '';
    await new Promise((res) => {
      let i = 0;
      let timer = null;
      const finish = () => { clearTimeout(timer); line.textContent = full; tapResolver = null; res(); };
      tapResolver = finish;
      const step = () => {
        i += 1;
        line.textContent = full.slice(0, i);
        if (i >= full.length) finish();
        else timer = setTimeout(step, 26);
      };
      step();
    });
    dialog.classList.add('ready');
    await waitTap();
    dialog.classList.remove('ready');
    hideTip();
  }

  function choose(options) {
    return new Promise((res) => {
      const box = $('choices');
      box.textContent = '';
      const shownAt = performance.now();
      options.forEach((o) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.textContent = interp(o.text);
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          // ignore a stray second tap that was meant to advance the dialogue
          if (performance.now() - shownAt < 450) return;
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
    S.day = Number(n);
    $('ddayNum').textContent = 'D-' + n;
    $('dcNum').textContent = 'D-' + n;
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
      const finish = () => { clearTimeout(timer); t.textContent = full; tapResolver = null; res(); };
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
    renderBeliefs(card.id);
    if (st === 'cracked') {
      truth.textContent = '윤재의 믿음에 금이 갔다.';
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

  async function exam(c) {
    $('dialog').hidden = true;
    hideTip();
    const box = $('exam');
    const btnO = $('btnO');
    const btnX = $('btnX');
    const stamp = $('exStamp');
    const fb = $('exFeedback');
    const timerBox = $('exTimer');
    $('exPart').textContent = c.title || '시험';
    box.hidden = false;
    let correct = 0;
    for (let qi = 0; qi < c.qs.length; qi++) {
      const q = c.qs[qi];
      $('exProg').textContent = `${qi + 1} / ${c.qs.length}`;
      $('exQ').textContent = q.text;
      stamp.hidden = true;
      fb.textContent = '';
      btnO.disabled = false;
      btnX.disabled = false;
      const answer = await new Promise((res) => {
        const t0 = performance.now();
        const total = c.secs * 1000;
        const tick = setInterval(() => {
          const left = Math.max(0, total - (performance.now() - t0));
          $('exSec').textContent = Math.ceil(left / 1000);
          timerBox.classList.toggle('hurry', left < 2000);
          if (left <= 0) done(null);
        }, 100);
        $('exSec').textContent = c.secs;
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
    fb.textContent = '';
    await sleep(400);
    await waitTap();
    box.hidden = true;
    toast(`장학생 게이지 +${correct * (c.key === '수신' ? 3 : 2)}`);
  }

  async function resultBoard() {
    $('dialog').hidden = true;
    const myStudy = 90 + 2 * S.vars.학과;
    const myCivic = 25 * S.vars.수신;
    const rows = [
      { name: '김덕수', study: 72, civic: 100, conduct: '갑', rank: 1 },
      { name: '박기천', study: 85, civic: 100, conduct: '갑', rank: 2 },
      { name: '윤재', study: myStudy, civic: myCivic, conduct: '을', rank: 3, me: true },
    ];
    $('rsTitle').textContent = '1929년도 도 장학생 후보 · 중간 순위';
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
    $('esCard').src = cardSrc('study', S.cards.study);
    const f = S.vars.우정;
    const stats = [
      ['장학생 게이지', `${Math.max(0, Math.min(100, S.vars.성적))} / 100`],
      ['수신 시험', `시험이 원하는 답을 ${S.vars.수신} / 4개 골랐어요`],
      ['만식과의 사이', f > 0 ? '가까워졌어요' : f < 0 ? '조금 서먹해졌어요' : '그대로예요'],
      ['의심도', `${S.vars.의심} / 100`],
    ];
    $('esStats').innerHTML = stats.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('');
    $('endscreen').hidden = false;
  }

  async function setBg(name) {
    const src = BG[name];
    if (!src) return;
    const el = $('bg');
    if (el.getAttribute('src') === src) return;
    el.style.opacity = 0;
    await sleep(300);
    el.src = src;
    el.style.opacity = 1;
  }

  /* ---------- runner ---------- */
  async function exec(c) {
    switch (c.type) {
      case 'day': return dayCard(c.arg);
      case 'bg': return setBg(c.arg);
      case 'show': { const [who, face, pos] = c.arg.split(/\s+/); setSprite(who, face, pos); return sleep(120); }
      case 'face': { const [who, face] = c.arg.split(/\s+/); setSprite(who, face); return; }
      case 'hide': hideSprite(c.arg.trim()); return sleep(150);
      case 'say': {
        if (c.face) setSprite(c.who, c.face);
        highlight(sprites.has(c.who) ? c.who : null);
        return speak('say', c.who, c.text);
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
          if (note) toast(`${note}  ·  ${VAR_NAME[m[1]] || m[1]} ${m[2]}`);
        }
        return sleep(300);
      }
      case 'flag': S.flags.add(c.arg.trim()); return;
      case 'tip': {
        const [term, text] = c.arg.split('|').map((x) => x.trim());
        $('tipTerm').textContent = term;
        $('tipText').textContent = text || '';
        $('tip').hidden = false;
        tipShown = true;
        return;
      }
      case 'notebook': return notebook(c.arg);
      case 'cards': return cardsIntro();
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
      try { await exec(c); } catch (err) { console.error(err); }
    }
  }

  function start() {
    runId += 1;
    S = newState();
    pc = 0;
    tapResolver = null;
    hideSprite('모두');
    $('bg').removeAttribute('src');
    ['endscreen', 'choices', 'dialog', 'exam', 'result', 'cardshow', 'notebook', 'cardsintro', 'daycard', 'tip'].forEach((k) => { $(k).hidden = true; });
    $('ddayNum').textContent = 'D-100';
    renderGauges();
    renderBeliefs();
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
    S = newState();
    renderGauges();
    renderBeliefs();
    await preload(PRELOAD, (p) => {
      $('ldFill').style.width = Math.round(p * 100) + '%';
      $('ldText').textContent = `그림을 불러오는 중 ${Math.round(p * 100)}%`;
    });
    $('loading').hidden = true;
    $('title').hidden = false;
  }

  $('btnStart').addEventListener('click', (e) => {
    e.stopPropagation();
    $('title').hidden = true;
    start();
  });
  $('btnRestart').addEventListener('click', (e) => {
    e.stopPropagation();
    start();
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
