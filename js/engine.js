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
    경찰서: 'assets/bg/bg_police.webp',
    만식네: 'assets/bg/bg_poorhouse.webp',
    골목: 'assets/bg/bg_alley.webp',
    책상: 'assets/bg/bg_desk.webp',
    취조실: 'assets/bg/bg_interrogation.webp',
    아버지기억: 'assets/bg/cg_father.webp',
    논: 'assets/bg/bg_harvest.webp',
    타작마당: 'assets/bg/bg_threshing.webp',
    화물역: 'assets/bg/bg_freight.webp',
    어머니기억: 'assets/bg/cg_mother.webp',
    냇가기억: 'assets/bg/cg_stream_friends.webp',
    윤재울음: 'assets/bg/cg_yunjae_cry.webp',
    은행: 'assets/bg/bg_bank.webp',
    빨간펜: 'assets/bg/cg_redpen.webp',
    진수작별: 'assets/bg/cg_jinsu_leave.webp',
    나주역: 'assets/bg/cg_naju.webp',
    신문사: 'assets/bg/bg_newsroom.webp',
    검열: 'assets/bg/cg_censor.webp',
    거리행진: 'assets/bg/bg_street_march.webp',
    단상: 'assets/bg/cg_stage_silent.webp',
    독서회: 'assets/bg/bg_reading_room.webp',
    감옥: 'assets/bg/cg_prison.webp',
    광복: 'assets/bg/cg_liberation.webp',
    함께행진: 'assets/bg/cg_march_friends.webp',
  };
  const NAME_LABEL = { 교관: '마쓰다 교관', 형사: '사토 형사', 진수: '진수 형', 감독: '동척 감독 오카다', 계장: '은행 계장 야마시타', 순사: '일본인 순사' };
  const MEMORY_CAPTION = {
    아버지기억: '새벽 논에서 허리 한 번 못 펴는 아버지',
    어머니기억: '밤새 남의 옷을 기우는 어머니',
    냇가기억: '냇가에서 만식이와 웃고 떠들던 날',
  };
  const CHARS = {
    윤재: { key: 'yunjae', scale: 1, faces: { 기본: 'normal', 웃음: 'smile', 놀람: 'surprised', 화남: 'angry', 슬픔: 'sad' } },
    만식: { key: 'mansik', scale: 0.84, faces: { 기본: 'normal', 웃음: 'smile', 걱정: 'worried', 멍: 'bruised' } },
    교장: { key: 'principal', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    교관: { key: 'instructor', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    진수: { key: 'senior', scale: 1.02, faces: { 기본: 'normal', 씁쓸: 'bitter' } },
    정희: { key: 'junghee', scale: 0.97, faces: { 기본: 'normal', 웃음: 'smile', 걱정: 'worried' } },
    기철: { key: 'gicheol', scale: 1.02, faces: { 기본: 'normal', 진지: 'serious' } },
    형사: { key: 'detective', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    다나카: { key: 'tanaka', scale: 0.98, faces: { 기본: 'normal', 비웃음: 'smirk' } },
    아버지: { key: 'father', scale: 1.02, faces: { 기본: 'normal', 슬픔: 'sad' } },
    감독: { key: 'overseer', scale: 1.04, faces: { 기본: 'normal', 엄격: 'stern' } },
    계장: { key: 'banker', scale: 1.04, faces: { 기본: 'normal' } },
    순사: { key: 'constable', scale: 1.04, faces: { 기본: 'normal' } },
  };
  const POS = { 왼쪽: 24, 가운데: 50, 오른쪽: 76 };
  const STATS = {
    학업: { icon: 'assets/ui/icon_study.webp', desc: '시험과 공부에 강해져요. 시험 시간이 늘어나요.' },
    눈치: { icon: 'assets/ui/icon_eye.webp', desc: '숨은 것과 남의 속마음을 알아채요.' },
    체력: { icon: 'assets/ui/icon_stamina.webp', desc: '몸 쓰는 일에 강해요. 짐 나르기가 쉬워져요.' },
    용기: { icon: 'assets/ui/icon_courage.webp', desc: '할 말을 할 수 있어요. 대담한 선택지가 열려요.' },
  };
  const PERK_ICON = 'assets/ui/icon_heart.webp';   // one shared picture for every '마음' (perk)
  const MONEY_ICON = 'assets/ui/icon_money.webp';
  const RELS = {
    만식: { name: '만식', up: '만식과 가까워졌다', down: '만식이 조금 서운해한다' },
    정희: { name: '정희', up: '정희와 가까워졌다', down: '정희가 고개를 갸웃한다' },
    진수: { name: '진수 형', up: '진수 형과 가까워졌다', down: '진수 형이 씁쓸하게 웃는다' },
    기철: { name: '기철', up: '기철과 가까워졌다', down: '기철이 말없이 고개를 끄덕인다' },
  };
  const CARDS = [
    { id: 'study', name: '공부', label: '공부만 잘하면 돼', truth: '실력만으로 오르는 사다리가 아니었다.', states: ['normal', 'hairline', 'cracked', 'broken'] },
    { id: 'safe', name: '안전', label: '가만히 있으면 안전해', truth: '가만히 있어도 안전하지 않았다. 감시는 아무나 노렸다.', states: ['normal', 'cracked', 'broken'] },
    { id: 'home', name: '집', label: '우리 집 먹고사는 게 먼저야', truth: '먹고사는 일과 나라 일은 따로가 아니었다. 나라를 빼앗긴 땅에서는 먹고사는 것부터 빼앗긴다.', states: ['normal', 'cracked', 'broken'] },
    { id: 'escape', name: '탈출', label: '나 하나만 빠져나가면 돼', truth: '나 하나 빠져나가는 길은 없었다. 그 문을 지나려면 내 입으로 우리를 지워야 했다.', states: ['normal', 'cracked', 'broken'] },
    { id: 'hopeless', name: '원래', label: '태어나 보니 원래 이랬어', truth: '원래 그런 세상은 없었다. 누군가 빼앗은 것이다.', states: ['normal', 'cracked', 'broken'] },
  ];
  const CARD_STATE = { 기본: 'normal', 실금: 'hairline', 금감: 'cracked', 깨짐: 'broken' };
  const CARD_STATE_TEXT = { hairline: '윤재의 믿음에 처음으로 실금이 갔다.', cracked: '윤재의 믿음에 금이 크게 갔다.' };
  const COMMON_TRUTH = '내가 틀린 게 아니었다. 세상이 그렇게 놔두지 않았다.';
  const HUD = { 디데이: 'hud-dday', 장학생: 'hud-grade', 의심: 'hud-susp', 능력치: 'hud-stats', 돈: 'hud-money', 가방: 'hud-bag', 믿음: 'hud-bag', 노트: 'hud-bag', 쌀독: 'hud-rice' };
  const GRADE_ORDER = ['S', 'A', 'B', 'C'];
  const TITLES = { 학업: '책벌레', 눈치: '매의 눈', 체력: '황소', 용기: '불씨' };
  const TIMES = ['오전', '오후', '저녁'];
  const SAVE_KEY = 'colony15-save-v1';
  const ddayText = (n) => (n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`);
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
    if (m[1] === '마음') return { text: m[3], req: { perk: m[2].trim() } };
    if (m[1] === '판정') {
      const [k, n] = m[2].trim().split(/\s+/);
      return { text: m[3], req: { check: true, k, n: Number(n) || 1 } };
    }
    return { text: m[3], req: { k: m[1], n: Number(m[2]) } };
  }

  function parse(src) {
    const cmds = [];
    const labels = {};
    const terms = {};
    const items = {};
    const spots = {};
    const badges = {};
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (!t || t.startsWith('//')) continue;
      const before = cmds[cmds.length - 1];
      if (before && before.type === 'choice' && !t.startsWith('?')) before.closed = true;
      if (t.startsWith('## ')) { labels[t.slice(3).trim()] = cmds.length; continue; }
      if (t.startsWith('@')) {
        const raw = t.slice(1).split(/\s+/)[0];
        const arg = t.slice(1 + raw.length).trim();
        const quiet = raw.endsWith('!');
        const name = quiet ? raw.slice(0, -1) : raw;
        const parts = arg.split('|').map((x) => x.trim());
        if (name === 'term') { if (parts[1]) terms[parts[0]] = parts.slice(1).join(' | '); continue; }
        if (name === 'itemdef') { items[parts[0]] = { img: `assets/item/${parts[1]}.webp`, desc: parts[2] || '', risk: Number(parts[3]) || 0 }; continue; }
        if (name === 'badgedef') { badges[parts[0]] = { name: parts[1] || parts[0], desc: parts[2] || '' }; continue; }
        if (name === 'spot') { spots[parts[0]] = { x: Number(parts[1]), y: Number(parts[2]), hint: parts[3] || '' }; continue; }
        if (name === 'interrogate') {
          const qs = [];
          while (++i < lines.length && lines[i].trim() !== '@endinterrogate') {
            const l = lines[i].trim();
            if (l.startsWith('Q ')) {
              const [text, ...raw] = l.slice(2).split('|').map((x) => x.trim());
              const answers = raw.map((a) => {
                const tags = a.match(/[#!]\S+/g) || [];
                return {
                  text: a.replace(/\s*[#!]\S+/g, '').trim(),
                  claims: tags.filter((x) => x[0] === '#').map((x) => x.slice(1)),
                  contra: tags.filter((x) => x[0] === '!').map((x) => x.slice(1)),
                };
              });
              qs.push({ text, answers, reply: '' });
            }
            else if (l.startsWith('R ') && qs.length) qs[qs.length - 1].reply = l.slice(2).trim();
          }
          cmds.push({ type: 'interrogate', qs });
          continue;
        }
        if (name === 'rhythm') {
          // @rhythm 게임이름 | 모드(연설/구호) | 배경
          // T 구절(띄어 쓴 마디마다 한 박) | 기억 그림 | stop
          const lines2 = [];
          while (++i < lines.length && lines[i].trim() !== '@endrhythm') {
            const l = lines[i].trim();
            if (!l.startsWith('T ')) continue;
            const [text, img, flag] = l.slice(2).split('|').map((x) => x.trim());
            lines2.push({ text, img: img || '', stop: flag === 'stop' });
          }
          cmds.push({ type: 'rhythm', game: parts[0], mode: parts[1] || '구호', bg: parts[2] || '', lines: lines2 });
          continue;
        }
        if (name === 'rebut' || name === 'manifesto') {
          // M id | 이름 | 배경 그림 | 설명      (memory card)
          // L 문장 | 정답 id (띄어 쓰면 그중 하나, '+'로 이으면 모두) | 해설
          const mems = [];
          const sents = [];
          while (++i < lines.length && !['@endrebut', '@endmanifesto'].includes(lines[i].trim())) {
            const l = lines[i].trim();
            const [a, b, c2, d] = l.slice(2).split('|').map((x) => x.trim());
            if (l.startsWith('M ')) mems.push({ id: a, name: b || a, img: c2 || '', desc: d || '' });
            else if (l.startsWith('L ')) {
              const all = (b || '').includes('+');   // '화물칸+쌀장부' = both cards needed, '일당 순위표' = either one
              sents.push({ text: a, ok: (b || '').split(all ? '+' : /\s+/).map((x) => x.trim()).filter(Boolean), all, why: c2 || '' });
            }
          }
          cmds.push({ type: name, title: arg, mems, sents });
          continue;
        }
        if (name === 'exam') {
          const qs = [];
          while (++i < lines.length && lines[i].trim() !== '@endexam') {
            const m = lines[i].trim().match(/^Q\s+([OX])\s*\|\s*(.+)$/);
            if (m) {
              const [text, flash] = m[2].split('|').map((x) => x.trim());
              qs.push({ ans: m[1], text, flash: flash || null });
            }
          }
          cmds.push({ type: 'exam', key: parts[0], title: parts[1], secs: Number(parts[2]) || 6, qs });
          continue;
        }
        cmds.push({ type: name, arg, quiet });
        continue;
      }
      if (t.startsWith('?')) {
        const m = t.slice(1).match(/^(.*?)\s*(?:\{([^}]*)\})?\s*(?:->\s*(\S+)(?:\s*\/\s*(\S+))?)?\s*$/);
        const { text, req } = parseReq(m[1].trim());
        const opt = { text, req, effects: parseEffects(m[2]), go: m[3] || null, fail: m[4] || null };
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
    return { cmds, labels, terms, items, spots, badges };
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
      ep: 1,
      records: {},
      badges: [],
      goal: null,
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
    // Reserve the full line's height first so the box does not grow mid-typing.
    el.style.minHeight = '';
    el.textContent = nodes.map((n) => n.text).join('');
    el.style.minHeight = el.offsetHeight + 'px';
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
    $('riceVal').textContent = Math.max(0, S.vars.쌀 || 0);
    renderGoal();
    $('ddayNum').textContent = ddayText(S.day);
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
      if (!ef.d) return;
      const k = ef.v;
      S.vars[k] = (S.vars[k] || 0) + ef.d;
      if (k === '돈' && S.vars.돈 < 0) S.vars.돈 = 0;
      if (STATS[k]) {
        hud(['능력치']);
        renderTop(k);
        if (!quiet) toast(`${k} ${sign(ef.d)}`, STATS[k].icon);
      } else if (k === '쌀') {
        if (S.vars.쌀 < 0) S.vars.쌀 = 0;
        hud(['쌀독']);
        renderTop();
        if (!quiet) toast(`쌀 ${sign(ef.d)}가마`, 'assets/minigame/mg_sack.webp');
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
    const pm = e.match(/^확률\s+(\d+)$/);
    if (pm) return Math.random() * 100 < Number(pm[1]);
    const m = e.match(/^(\S+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/);
    if (m) {
      const v = S.vars[m[1]] || 0;
      const n = Number(m[3]);
      return { '>=': v >= n, '<=': v <= n, '==': v === n, '!=': v !== n, '>': v > n, '<': v < n }[m[2]];
    }
    return S.flags.has(e.replace(/^flag:/, ''));
  }
  // chance of a stat check: 55% at the required value, 15% per point above or below, 10%..95%
  function checkChance(req) {
    return Math.max(10, Math.min(95, 55 + ((S.vars[req.k] || 0) - req.n) * 15));
  }
  function reqMet(req) {
    if (!req || req.check) return true;
    if (req.item) return has(req.item);
    if (req.perk) return S.perks.some((p) => p.name === req.perk);
    return (S.vars[req.k] || 0) >= req.n;
  }
  function reqChip(req) {
    const span = document.createElement('span');
    span.className = 'req';
    let icon = '';
    let label = '';
    if (req.item) { icon = prog.items[req.item] ? prog.items[req.item].img : ''; label = req.item; }
    else if (req.perk) { icon = STATS.용기.icon; label = `마음: ${req.perk}`; }
    else if (req.check) { icon = STATS[req.k] ? STATS[req.k].icon : ''; label = `${req.k} 판정 · 성공 ${checkChance(req)}%`; span.classList.add('check'); }
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
            toast(r.perk ? `‘${r.perk}’ 마음이 있어야 해요` : r.item ? `‘${r.item}’이(가) 있어야 해요` : r.k === '돈' ? `돈이 ${r.n}전 있어야 해요` : `${r.k}이(가) ${r.n} 이상이어야 해요`, r.item ? null : STATS[r.k] ? STATS[r.k].icon : MONEY_ICON);
            return;
          }
          box.hidden = true;
          res(o);
        });
        box.appendChild(b);
      });
      placeAbove(box, $('dialog'));
      box.hidden = false;
      $('dialog').classList.remove('ready');
    });
  }
  // Keep a panel's bottom edge just above a (visible) box, so a taller box never covers it.
  function placeAbove(el, below) {
    if (below.hidden || !below.offsetParent) { el.style.bottom = ''; return; }
    const parent = (el.offsetParent || el.parentElement).getBoundingClientRect();
    const top = below.getBoundingClientRect().top;
    el.style.bottom = top > parent.top ? Math.round(parent.bottom - top + 8) + 'px' : '';
  }

  /* ---------- overlays ---------- */
  async function dayCard(arg) {
    const [n, date, place] = arg.split('|').map((x) => x.trim());
    const showNum = n && n !== '-';
    if (showNum) { S.day = Number(n); $('dcNum').textContent = ddayText(S.day); }
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
  // minRead: milliseconds the popup stays before it can be closed (history notes: 5 s, so students read them)
  async function modal({ kicker, title, text, img, icon, saved, minRead = 0 }) {
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
    const hint = $('nsHint');
    const bar = $('nsRead');
    if (minRead > 0) {
      hint.classList.add('wait');
      bar.hidden = false;
      const t0 = performance.now();
      await new Promise((res) => {
        const tick = () => {
          const left = Math.max(0, minRead - (performance.now() - t0));
          bar.firstElementChild.style.width = 100 * (1 - left / minRead) + '%';
          hint.textContent = left > 0 ? `천천히 읽어 보세요 · ${Math.ceil(left / 1000)}초 뒤에 넘길 수 있어요` : '화면을 눌러 계속';
          if (left > 0) setTimeout(tick, 100); else res();
        };
        tick();
      });
      hint.classList.remove('wait');
      bar.hidden = true;
    } else {
      hint.textContent = '화면을 눌러 계속';
      await sleep(500);
    }
    await waitTap();
    $('noteshow').hidden = true;
    hud(['가방']);
    flashBag();
  }
  async function noteEvent(arg, quiet) {
    const [title, bgKey, ...rest] = arg.split('|').map((x) => x.trim());
    if (S.notes.some((n) => n.title === title)) return;
    const note = { title, img: BG[bgKey] || '', text: rest.join(' | ') };
    S.notes.push(note);
    if (quiet) return;
    await modal({ kicker: '알고 가기', title, text: note.text, img: note.img, saved: '역사 노트에 저장했어요. 위쪽 ‘가방’에서 다시 볼 수 있어요.', minRead: 5000 });
  }
  async function perkEvent(arg, quiet) {
    const [name, ...rest] = arg.split('|').map((x) => x.trim());
    if (S.perks.some((p) => p.name === name)) return;
    const perk = { name, text: rest.join(' | ') };
    S.perks.push(perk);
    if (quiet) return;
    await modal({ kicker: '새로운 마음을 얻었다', title: name, text: perk.text, img: PERK_ICON, icon: true, saved: '가방 > 윤재에서 볼 수 있어요.' });
  }

  /* ---------- bag ---------- */
  let bagTab = '윤재';
  let bagNote = -1;
  let bagItem = -1;
  function openBag(tab) {
    if (tab) bagTab = tab;
    const tabs = $('bagTabs');
    tabs.textContent = '';
    ['윤재', '소지품', '할 일', '믿음', '역사 노트', '업적'].forEach((t) => {
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
      S.perks.forEach((p) => row(c, PERK_ICON, p.name, null, p.text));
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
    } else if (bagTab === '업적') {
      const a = col(`업적 ${S.badges.length} / ${Object.keys(prog.badges).length}`);
      Object.entries(prog.badges).forEach(([id, b]) => {
        const got = S.badges.includes(id);
        const d = document.createElement('div');
        d.className = 'badge' + (got ? ' got' : '');
        const n = document.createElement('b');
        n.textContent = (got ? '★ ' : '☆ ') + b.name;
        const s = document.createElement('small');
        s.textContent = b.desc;
        d.append(n, s);
        a.appendChild(d);
      });
      const r = col(`모은 것`);
      row(r, null, '역사 노트', `${S.notes.length} / ${totalNotes()}`, '');
      row(r, null, '칭호', playerTitle(), '가장 높은 능력치로 정해져요.');
      const recs = Object.entries(S.records);
      if (recs.length) recs.forEach(([k, g]) => row(r, null, k, `최고 등급 ${g}`, ''));
      else empty(r, '아직 미니게임 등급이 없어요.');
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
        b.querySelector('small').textContent = (S.spotHints || {})[n] || sp.hint;
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

  // popup before the map: how many moves today, where you can go, and today's note
  function freeIntro(names, times, extra) {
    $('fiKicker').textContent = `자유 시간 · ${ddayText(S.day)}`;
    $('fiTitle').textContent = `오늘은 ${times.length}번 움직일 수 있어요`;
    $('fiText').textContent = `${times.join(', ')}에 지도에서 갈 곳을 하나씩 골라요. 어디에 시간을 쓰느냐에 따라 능력치, 돈, 친구와의 사이가 달라져요.`;
    const g = S.goal;
    const goalLine = g ? `목표: ${g.text} ${Math.min(Math.max(0, S.vars[g.k] || 0), g.n)}/${g.n}${g.k === '돈' ? '전' : ''} · D-${g.due}까지` : '';
    $('fiExtra').textContent = [extra, goalLine].filter(Boolean).join('\n');
    const box = $('fiSpots');
    box.textContent = '';
    names.forEach((n) => {
      const sp = prog.spots[n] || { hint: '' };
      const d = document.createElement('div');
      d.className = 'fi-spot' + ((S.vars['방문_' + n] || 0) === 0 ? ' new' : '');
      const b = document.createElement('b');
      b.textContent = n;
      const s = document.createElement('small');
      s.textContent = (S.spotHints || {})[n] || sp.hint;
      d.append(b, s);
      box.appendChild(d);
    });
    $('freeintro').hidden = false;
    return new Promise((res) => {
      const done = (e) => { e.stopPropagation(); $('btnFreeGo').onclick = null; $('freeintro').onclick = null; $('freeintro').hidden = true; res(); };
      $('btnFreeGo').onclick = done;
      $('freeintro').onclick = (e) => { if (e.target.id === 'freeintro') done(e); else e.stopPropagation(); };
    });
  }

  async function explore(arg, id) {
    const parts = arg.split('|');
    const count = Number(parts[0].trim()) || 3;
    const names = (parts[1] || '').trim().split(/\s+/).filter(Boolean);
    const extra = parts.slice(2).join('|').trim();
    const times = TIMES.slice(TIMES.length - Math.min(count, TIMES.length));
    hideSprite('모두');
    $('dialog').hidden = true;
    hideTip();
    for (let i = 0; i < count; i++) {
      S.time = times[i] || '저녁';
      renderTop();
      const pick = chooseSpot(names, S.time, count - i);
      if (i === 0) await freeIntro(names, times, extra); // popup over the map on the first move
      const n = await pick;
      $('mapview').hidden = true;
      S.vars['방문_' + n] = (S.vars['방문_' + n] || 0) + 1;
      if (BG[n]) await setBg(n);
      const epLabel = `장소${S.ep > 1 ? S.ep : ''}:${n}`;
      const label = epLabel in prog.labels ? epLabel : '장소:' + n;
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
    const grade = ok >= 6 ? 'S' : ok >= 5 ? 'A' : ok >= 3 ? 'B' : 'C';
    recordGrade('짐나르기', grade);
    msg.className = 'cr-msg good';
    msg.textContent = `가마니 ${ok}개를 날랐다. 품삯 ${pay}전 · 등급 ${grade} · 화면을 눌러 계속`;
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
      const mem = $('exMem');
      mem.classList.remove('pinned');
      if (q.flash && BG[q.flash]) {
        $('exMemImg').src = BG[q.flash];
        $('exMemCap').textContent = MEMORY_CAPTION[q.flash] || '';
        mem.hidden = false;
        mem.style.animation = 'none'; void mem.offsetWidth; mem.style.animation = '';
        await sleep(1300);
        mem.classList.add('pinned');
        await sleep(450);
      } else mem.hidden = true;
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
    $('exMem').hidden = true;
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
      { name: '다나카', who: '내지인', study: 61, civic: 100, conduct: '갑', rank: '1 · 합격' },
      { name: '야마모토', who: '내지인', study: 66, civic: 100, conduct: '갑', rank: '2 · 합격' },
      { name: '스즈키', who: '내지인', study: 58, civic: 75, conduct: '갑', rank: '3 · 합격' },
      { name: '윤재', who: '조선인', study: myStudy, civic: myCivic, conduct: '을', rank: '4', me: true },
      { name: '박기천', who: '조선인', study: 80, civic: 100, conduct: '을', rank: '5' },
    ];
    $('rsTitle').textContent = '1929년도 전라남도 장학생 후보 · 중간 순위';
    $('rsSub').textContent = '장학생 3명 · 내지인(일본인) 먼저 선발';
    $('rsTable').innerHTML =
      '<tr><th>이름</th><th>구분</th><th>학과</th><th>수신</th><th>품행</th><th>순위</th></tr>' +
      rows.map((r) => `<tr class="${r.me ? 'me' : ''}${r.who === '내지인' ? ' jp' : ''}"><td>${r.name}</td><td>${r.who}</td><td class="${r.me ? 'best' : ''}">${r.study}</td><td>${r.civic}</td><td>${r.conduct}</td><td>${r.rank}</td></tr>`).join('');
    $('rsNote').textContent = '※ 내지인 학생을 먼저 선발함. 조선인 학생은 품행 \'갑\'인 경우에만 선발함.';
    $('result').hidden = false;
    await sleep(600);
    await waitTap();
    $('result').hidden = true;
  }

  function endScreen() {
    $('dialog').hidden = true;
    clearSave();
    $('btnNext').hidden = true;
    $('esNextBox').hidden = true;
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

  /* ---------- inspection mini-game: hide risky items before the detective arrives ---------- */
  // positions are % of the 16:9 desk picture
  const INSPECT_SPOTS = [
    { name: '도시락통', x: 67, y: 31 },
    { name: '서랍 밑', x: 50, y: 88 },
    { name: '손수건 밑', x: 82, y: 60, need: 3 },
  ];
  async function inspectGame(arg) {
    $('dialog').hidden = true;
    hideTip();
    const box = $('inspect');
    const bagEl = $('insBag');
    const spotsEl = $('insSpots');
    const det = $('insDet');
    const msg = $('insMsg');
    const secs = (Number(arg) || 12) + Math.max(0, S.vars.눈치 - 2);
    const spots = INSPECT_SPOTS.filter((sp) => !sp.need || S.vars.눈치 >= sp.need);
    const place = {};
    S.items.forEach((n) => { place[n] = null; });
    let sel = null;
    let locked = false;
    const itemBtn = (n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ins-item' + (sel === n ? ' sel' : '');
      const meta = prog.items[n] || {};
      if (meta.risk > 0) b.classList.add('risky');
      b.innerHTML = `<img alt="" src="${meta.img || ''}"><span></span>${meta.risk > 0 ? '<em>위험</em>' : ''}`;
      b.querySelector('span').textContent = n;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        if (locked) return;
        if (place[n]) { place[n] = null; sel = null; } else { sel = sel === n ? null : n; }
        render();
      });
      return b;
    };
    const render = () => {
      bagEl.textContent = '';
      Object.keys(place).filter((n) => !place[n]).forEach((n) => bagEl.appendChild(itemBtn(n)));
      spotsEl.textContent = '';
      spots.forEach((sp) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ins-spot' + (sel ? ' ready' : '');
        b.style.left = sp.x + '%';
        b.style.top = sp.y + '%';
        const inside = Object.keys(place).find((n) => place[n] === sp.name);
        const label = document.createElement('span');
        label.textContent = sp.name;
        b.appendChild(label);
        if (inside) b.appendChild(itemBtn(inside));
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          if (locked || !sel) return;
          const prev = Object.keys(place).find((n) => place[n] === sp.name);
          if (prev) place[prev] = null;
          place[sel] = sp.name;
          sel = null;
          render();
        });
        spotsEl.appendChild(b);
      });
    };
    const risky = S.items.filter((n) => (prog.items[n] || {}).risk > 0);
    det.style.setProperty('--near', 0.45);
    $('insInfo').textContent = '';
    if (!risky.length) {
      // nothing to hide: the search still happens
      locked = true;
      render();
      msg.textContent = '가방에 걸릴 만한 물건은 없다. 형사가 가방을 뒤진다… · 화면을 눌러 계속';
      box.hidden = false;
      S.vars.검사적발 = 0;
      S.flags.add('숨길것없음');
      await new Promise((res) => { box.onclick = (e) => { e.stopPropagation(); box.onclick = null; res(); }; });
      box.hidden = true;
      return;
    }
    render();
    msg.textContent = '물건을 누른 뒤, 숨길 곳을 누르세요';
    $('insBriefText').textContent = `형사가 윤재 자리까지 오는 데 ${secs}초. 가방 속에서 걸리면 안 되는 물건은 이것이에요.`;
    const bi = $('insBriefItems');
    bi.textContent = '';
    risky.forEach((n) => bi.appendChild(itemBtn(n)));
    $('insBrief').hidden = false;
    box.hidden = false;
    await new Promise((res) => {
      $('btnInsStart').onclick = (e) => { e.stopPropagation(); $('btnInsStart').onclick = null; res(); };
    });
    $('insBrief').hidden = true;
    const t0 = performance.now();
    await new Promise((res) => {
      const tick = setInterval(() => {
        const left = Math.max(0, secs * 1000 - (performance.now() - t0));
        $('insInfo').textContent = `형사가 오기까지 ${Math.ceil(left / 1000)}초`;
        det.style.setProperty('--near', (0.45 + 0.5 * (1 - left / (secs * 1000))).toFixed(3));
        if (left <= 0) { clearInterval(tick); res(); }
      }, 100);
    });
    locked = true;
    sel = null;
    render();
    const found = Object.keys(place).filter((n) => !place[n] && (prog.items[n] || {}).risk > 0);
    S.vars.검사적발 = found.length;
    found.forEach((n) => {
      const risk = prog.items[n].risk;
      S.items = S.items.filter((x) => x !== n);
      S.flags.add('걸림_' + n);
      applyEffects(risk >= 2 ? [{ v: '의심', d: 20 }, { v: '성적', d: -15 }] : [{ v: '의심', d: 5 }]);
    });
    msg.textContent = found.length
      ? `형사가 가방을 뒤졌다. 걸린 물건: ${found.join(', ')} · 화면을 눌러 계속`
      : '형사가 가방을 뒤졌다. 숨긴 물건은 들키지 않았다 · 화면을 눌러 계속';
    await new Promise((res) => {
      box.onclick = (e) => { e.stopPropagation(); box.onclick = null; res(); };
    });
    box.hidden = true;
  }

  /* ---------- chase mini-game: top-down alley map, the detective moves after every step ---------- */
  // node positions are % of the 16:9 map_alley picture; links are walkable alleys
  const ALLEY = [
    { x: 2.5, y: 46.5, l: [1], tag: '입구' },
    { x: 14, y: 46.5, l: [0, 2, 19] },
    { x: 20, y: 35, l: [1, 3], hide: '장독대' },
    { x: 29.3, y: 35, l: [2, 4, 5] },
    { x: 33.8, y: 12, l: [3], dead: true },
    { x: 29.3, y: 57.5, l: [3, 6, 20] },
    { x: 36.8, y: 58, l: [5, 7], hide: '짚더미' },
    { x: 43, y: 58, l: [6, 8, 14] },
    { x: 43, y: 38.3, l: [7, 9] },
    { x: 61, y: 38.3, l: [8, 10, 11] },
    { x: 61, y: 50, l: [9, 15], hide: '우물' },
    { x: 81, y: 38.8, l: [9, 12, 13] },
    { x: 82.8, y: 12.8, l: [11], dead: true },
    { x: 81, y: 59.5, l: [11, 17, 18] },
    { x: 43, y: 69, l: [7, 15] },
    { x: 60.4, y: 65.4, l: [14, 10, 17, 16] },
    { x: 59.2, y: 91.4, l: [15], dead: true },
    { x: 70.6, y: 62.7, l: [15, 13], hide: '장작더미' },
    { x: 95, y: 58.5, l: [13], goal: true },
    { x: 13.8, y: 66, l: [1, 20] },
    { x: 28.7, y: 66, l: [19, 5, 21] },
    { x: 28.7, y: 84, l: [20], dead: true },
  ];
  function alleyDist(from) {
    const d = ALLEY.map(() => Infinity);
    d[from] = 0;
    const q = [from];
    while (q.length) { const a = q.shift(); ALLEY[a].l.forEach((b) => { if (d[b] === Infinity) { d[b] = d[a] + 1; q.push(b); } }); }
    return d;
  }
  async function chaseGame(arg) {
    $('dialog').hidden = true;
    hideTip();
    const box = $('chase');
    // '@chase 밤': carry leaflets to the reading room at night (same map, different words)
    const night = (arg || '').trim() === '밤';
    const T = night
      ? { head: '격문을 지켜라', brief: '격문을 품고 독서회 뒷문까지', goal: '독서회 뒷문', ok: '독서회 뒷문 안으로 미끄러져 들어갔다!', ng: '형사에게 붙잡혔다… 격문 몇 장을 빼앗겼다' }
      : { head: '형사를 따돌려라', brief: '집 대문까지 도망쳐라', goal: '집 대문', ok: '집 대문 안으로 뛰어들었다!', ng: '어깨를 붙잡혔다…' };
    box.classList.toggle('night', night);
    box.querySelector('.ch-head b').textContent = T.head;
    $('chBrief').querySelector('.note-title').textContent = T.brief;
    const nodesEl = $('chNodes');
    const tools = $('chTools');
    const msg = $('chMsg');
    const seeDead = S.vars.눈치 >= 2;
    const lostTurns = S.vars.눈치 >= 3 ? 3 : 2;
    let sprints = S.vars.체력 >= 6 ? 2 : S.vars.체력 >= 4 ? 1 : 0;
    let me = 1;
    let det = -1;          // not on the map yet: enters at the alley mouth after the first step
    let lost = 0;
    let turn = 0;
    let sprinting = false;
    const hidUsed = new Set();
    const mk = (cls, n) => {
      const d = document.createElement('div');
      d.className = cls;
      d.style.left = ALLEY[n].x + '%';
      d.style.top = ALLEY[n].y + '%';
      return d;
    };
    const reach = () => {
      if (!sprinting) return ALLEY[me].l.slice();
      const set = new Set();
      ALLEY[me].l.forEach((a) => { set.add(a); ALLEY[a].l.forEach((b) => { if (b !== me) set.add(b); }); });
      return [...set];
    };
    let pickRes = null;
    const render = () => {
      nodesEl.textContent = '';
      const can = new Set(reach());
      ALLEY.forEach((nd, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ch-node' + (can.has(i) ? ' can' : '') + (nd.goal ? ' goal' : '') + (nd.hide ? ' hide' : '') + (nd.dead && seeDead ? ' dead' : '');
        b.style.left = nd.x + '%';
        b.style.top = nd.y + '%';
        const label = nd.goal ? T.goal : nd.hide ? nd.hide : nd.dead && seeDead ? '막다른 길' : '';
        if (label) { const s = document.createElement('span'); s.textContent = label; b.appendChild(s); }
        b.addEventListener('click', (e) => { e.stopPropagation(); if (can.has(i) && pickRes) { const r = pickRes; pickRes = null; r({ go: i }); } });
        nodesEl.appendChild(b);
      });
      const yt = mk('ch-token me', me);
      yt.innerHTML = '<img alt="윤재" src="assets/char/char_yunjae_surprised.webp">';
      nodesEl.appendChild(yt);
      if (det >= 0) {
        const dt = mk('ch-token det' + (lost ? ' lost' : ''), det);
        dt.innerHTML = '<img alt="사토 형사" src="assets/char/char_detective_stern.webp">';
        if (lost) { const q = document.createElement('i'); q.textContent = '?'; dt.appendChild(q); }
        nodesEl.appendChild(dt);
      }
      const gap = det < 0 ? '아직 안 보임' : `${alleyDist(me)[det]}칸`;
      $('chInfo').textContent = `형사와의 거리 ${gap}` + (lost ? ' · 형사가 길을 잃었다' : '');
      tools.textContent = '';
      if (ALLEY[me].hide && !hidUsed.has(me) && det >= 0) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = `${ALLEY[me].hide} 뒤에 숨기`;
        b.addEventListener('click', (e) => { e.stopPropagation(); if (pickRes) { const r = pickRes; pickRes = null; r({ hide: true }); } });
        tools.appendChild(b);
      }
      if (sprints > 0) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn' + (sprinting ? ' on' : '');
        b.textContent = sprinting ? '전력 질주 중 (두 칸)' : `전력 질주 ×${sprints}`;
        b.addEventListener('click', (e) => { e.stopPropagation(); sprinting = !sprinting; render(); });
        tools.appendChild(b);
      }
    };
    const caught = () => det >= 0 && det === me;
    const detStep = () => {
      if (det < 0) { if (turn >= 2) det = 0; return; }
      if (lost > 0) {
        lost -= 1;
        const opts = ALLEY[det].l;
        det = opts[Math.floor(Math.random() * opts.length)];
        return;
      }
      const d = alleyDist(me);
      det = ALLEY[det].l.reduce((best, n) => (d[n] < d[best] ? n : best), ALLEY[det].l[0]);
    };
    $('chBriefHide').hidden = false;
    $('chBriefRun').hidden = sprints === 0;
    $('chBrief').hidden = false;
    msg.textContent = '';
    render();
    box.hidden = false;
    await new Promise((res) => { $('btnChStart').onclick = (e) => { e.stopPropagation(); $('btnChStart').onclick = null; res(); }; });
    $('chBrief').hidden = true;
    msg.textContent = '빛나는 동그라미를 눌러 움직이세요';
    let result = null;
    while (!result) {
      render();
      const act = await new Promise((res) => { pickRes = res; });
      turn += 1;
      if (act.hide) {
        hidUsed.add(me);
        lost = lostTurns;
        msg.textContent = `${ALLEY[me].hide} 뒤에 숨었다. 형사가 두리번거린다…`;
      } else {
        if (sprinting) { sprints -= 1; sprinting = false; }
        me = act.go;
        msg.textContent = ALLEY[me].dead ? '막다른 길이다! 되돌아가야 한다' : '';
      }
      if (ALLEY[me].goal) { result = 'escape'; break; }
      if (caught()) { result = 'caught'; break; }
      render();
      await sleep(260);
      detStep();
      if (caught()) { result = 'caught'; break; }
      if (turn % 4 === 0 && lost === 0 && det >= 0) {
        render();
        await sleep(220);
        detStep();
        if (!msg.textContent) msg.textContent = '형사가 뛰기 시작했다!';
        if (caught()) { result = 'caught'; break; }
      }
      box.classList.toggle('danger', det >= 0 && alleyDist(me)[det] <= 1);
    }
    render();
    box.classList.remove('danger');
    tools.textContent = '';
    S.vars.추격성공 = result === 'escape' ? 1 : 0;
    msg.textContent = (result === 'escape' ? T.ok : T.ng) + ' · 화면을 눌러 계속';
    if (result === 'caught') { $('stage').classList.add('shake'); setTimeout(() => $('stage').classList.remove('shake'), 450); }
    await new Promise((res) => { box.onclick = (e) => { e.stopPropagation(); box.onclick = null; res(); }; });
    box.hidden = true;
  }

  /* ---------- interrogation mini-game: whatever you answer, the pressure only grows ---------- */
  async function interrogate(c) {
    $('dialog').hidden = true;
    hideTip();
    hideSprite('모두');
    const box = $('interro');
    const qEl = $('itQ');
    const opts = $('itOpts');
    const bar = $('itTime');
    const det = $('itDet');
    const claims = {};     // claim tag -> the answer text that asserted it
    let will = 100;
    let lies = 0;
    const drop = Math.max(6, 14 - 2 * S.vars.용기);
    const showWill = () => {
      const n = Math.max(0, Math.ceil(will / 20));
      $('itInfo').textContent = `버티는 힘 ${'■'.repeat(n)}${'□'.repeat(5 - n)}`;
    };
    const slam = async (hard) => {
      const f = $('itFlash');
      f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
      $('stage').classList.add('shake');
      box.classList.add('shake');
      await sleep(hard ? 700 : 450);
      $('stage').classList.remove('shake');
      box.classList.remove('shake');
    };
    const typeQ = (text) => typeRich(qEl, interp(text), 30);
    box.hidden = false;
    showWill();
    det.style.setProperty('--near', 0.8);
    for (let i = 0; i < c.qs.length; i++) {
      const q = c.qs[i];
      opts.textContent = '';
      bar.style.width = '100%';
      det.style.setProperty('--near', (0.8 + 0.06 * i).toFixed(2));
      await typeQ(q.text);
      const secs = 7;
      const answer = await new Promise((res) => {
        const t0 = performance.now();
        const tick = setInterval(() => {
          const left = Math.max(0, secs * 1000 - (performance.now() - t0));
          bar.style.width = (100 * left) / (secs * 1000) + '%';
          if (left <= 0) { clearInterval(tick); res(null); }
        }, 50);
        q.answers.forEach((a) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.textContent = a.text;
          b.addEventListener('click', (e) => { e.stopPropagation(); clearInterval(tick); res(a); });
          opts.appendChild(b);
        });
        placeAbove(opts, qEl.closest('.it-box'));
      });
      opts.textContent = '';
      const caught = answer ? answer.contra.find((k) => k in claims) : null;
      if (caught) {
        lies += 1;
        will -= 40;
        showWill();
        await slam(true);
        await typeQ(`거짓말이군! 아까는 "${claims[caught]}"라고 했지! 말이 왜 바뀌나!`);
      } else {
        if (answer) answer.claims.forEach((k) => { claims[k] = answer.text; });
        will -= drop + (answer ? 0 : 6);
        showWill();
        await slam(false);
        await typeQ(answer ? q.reply : '(침묵) … 말 못 하겠나? ' + q.reply);
      }
      await sleep(250);
      await waitTap();
    }
    will = Math.max(0, will);
    S.vars.심문버팀 = will;
    S.vars.심문거짓말 = lies;
    if (will >= 25) S.flags.add('심문완주');
    box.hidden = true;
  }

  /* ---------- RPG helpers: stat checks, goals, badges, grades ---------- */
  async function rollCheck(req) {
    const chance = checkChance(req);
    const box = $('dice');
    const num = $('diceNum');
    const res = $('diceRes');
    $('diceTitle').textContent = `${req.k} 판정 · 성공 확률 ${chance}%`;
    $('diceRule').textContent = `1~100 사이 숫자가 ${chance} 이하로 나오면 성공`;
    res.textContent = '';
    res.className = 'dice-res';
    box.hidden = false;
    const roll = 1 + Math.floor(Math.random() * 100);
    const t0 = performance.now();
    await new Promise((done) => {
      const tick = () => {
        if (performance.now() - t0 < 900) { num.textContent = 1 + Math.floor(Math.random() * 100); requestAnimationFrame(tick); }
        else done();
      };
      tick();
    });
    num.textContent = roll;
    const ok = roll <= chance;
    res.textContent = ok ? '성공!' : '실패…';
    res.classList.add(ok ? 'ok' : 'no');
    await sleep(1200);
    box.hidden = true;
    return ok;
  }

  function renderGoal() {
    const el = $('goal');
    const g = S && S.goal;
    if (!g) { el.hidden = true; return; }
    const cur = Math.max(0, S.vars[g.k] || 0);
    const unit = g.k === '돈' ? '전' : g.k === '쌀' ? '가마' : '';
    $('goalText').textContent = `${g.text} ${Math.min(cur, g.n)}/${g.n}${unit} · D-${g.due}까지`;
    el.classList.toggle('met', cur >= g.n);
    el.hidden = false;
  }

  function unlockBadge(id, quiet) {
    const def = prog.badges[id];
    if (!def || S.badges.includes(id)) return;
    S.badges.push(id);
    if (!quiet) { toast(`업적 달성 · ${def.name}`); hud(['가방']); flashBag(); }
  }

  function recordGrade(game, grade) {
    const prev = S.records[game];
    if (!prev || GRADE_ORDER.indexOf(grade) < GRADE_ORDER.indexOf(prev)) S.records[game] = grade;
    if (grade === 'S') unlockBadge('S_' + game);
  }

  function totalNotes() {
    return new Set(prog.cmds.filter((c) => c.type === 'note').map((c) => c.arg.split('|')[0].trim())).size;
  }

  function playerTitle() {
    let best = '학업';
    Object.keys(STATS).forEach((k) => { if ((S.vars[k] || 0) > (S.vars[best] || 0)) best = k; });
    return TITLES[best];
  }

  // shared briefing popup for mini-games: resolves when the player taps Start
  function briefing(boxId, btnId) {
    $(boxId).hidden = false;
    return new Promise((res) => {
      $(btnId).onclick = (e) => { e.stopPropagation(); $(btnId).onclick = null; $(boxId).hidden = true; res(); };
    });
  }
  function waitBoxTap(box) {
    return new Promise((res) => { box.onclick = (e) => { e.stopPropagation(); box.onclick = null; res(); }; });
  }

  /* ---------- episode 3 mini-game: reaping rice ---------- */
  async function reapGame() {
    $('dialog').hidden = true;
    hideTip();
    const box = $('reap');
    const stack = $('rpStack');
    const needle = $('rpNeedle');
    const zone = $('rpZone');
    const msg = $('rpMsg');
    stack.textContent = '';
    msg.textContent = '';
    $('rpInfo').textContent = '';
    box.hidden = false;
    await briefing('rpBrief', 'btnRpStart');
    const swings = 10;
    // Yellow zone grows with stamina; the dark (double) zone is its middle 40%.
    const width = Math.min(40, 22 + 2.5 * Math.max(0, S.vars.체력 || 0));
    // The sickle sweeps at a constant speed (no sudden speed-up at the edges) and a bit faster each swing.
    const sweep = (sec, n) => {
      const period = (2 * Math.PI) / ((1.25 + n * 0.07) * 2);
      const ph = (sec % period) / period;
      return 2 + 96 * (ph < 0.5 ? ph * 2 : 2 - ph * 2);
    };
    let bundles = 0;
    // n = -1 is one practice swing that does not count.
    for (let n = -1; n < swings; n++) {
      const practice = n < 0;
      $('rpInfo').textContent = practice ? `연습 · 볏단 ${bundles}` : `${n + 1} / ${swings} · 볏단 ${bundles}`;
      const center = 25 + Math.random() * 50;
      zone.style.left = center - width / 2 + '%';
      zone.style.width = width + '%';
      const t0 = performance.now();
      let p = 0;
      msg.textContent = practice ? '연습 한 번! 노란 칸에 왔을 때 화면을 누르세요' : '노란 칸에 왔을 때 화면을 누르세요';
      await new Promise((res) => {
        let raf = 0;
        const loop = (now) => {
          p = sweep((now - t0) / 1000, Math.max(0, n));
          needle.style.left = p + '%';
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        box.onclick = (e) => { e.stopPropagation(); box.onclick = null; cancelAnimationFrame(raf); res(); };
      });
      const off = Math.abs(p - center);
      const got = off <= width / 5 ? 2 : off <= width / 2 ? 1 : 0;
      if (practice) {
        msg.textContent = got === 2 ? '연습인데 두 단! 이제 진짜로 베어요' : got === 1 ? '좋아요, 그 느낌! 이제 진짜로 베어요' : '조금 빨랐거나 늦었어요. 이제 진짜로 베어요';
        await sleep(1300);
        continue;
      }
      bundles += got;
      for (let i = 0; i < got; i++) {
        const im = document.createElement('img');
        im.src = 'assets/minigame/mg_ricebundle.webp';
        im.alt = '';
        stack.appendChild(im);
      }
      msg.textContent = got === 2 ? '쓱싹! 단번에 두 단' : got === 1 ? '한 단 베었다' : '헛손질…';
      $('rpInfo').textContent = `${n + 1} / ${swings} · 볏단 ${bundles}`;
      await sleep(520);
    }
    const harvest = 14 + Math.round(bundles / 2);
    const grade = bundles >= 18 ? 'S' : bundles >= 13 ? 'A' : bundles >= 8 ? 'B' : 'C';
    S.vars.수확 = harvest;
    recordGrade('벼베기', grade);
    msg.textContent = `벼 ${harvest}가마를 거두었다 · 등급 ${grade} · 화면을 눌러 계속`;
    await waitBoxTap(box);
    box.hidden = true;
  }

  /* ---------- episode 3 mini-game: spot the oversized measuring box ---------- */
  async function measureGame() {
    $('dialog').hidden = true;
    hideTip();
    const box = $('measure');
    const row = $('msRow');
    const msg = $('msMsg');
    const bar = $('msTime');
    row.textContent = '';
    msg.textContent = '';
    $('msInfo').textContent = '';
    box.hidden = false;
    await briefing('msBrief', 'btnMsStart');
    const rounds = 5;
    const secs = Math.max(3.5, Math.min(6.5, 4.5 + 0.5 * ((S.vars.눈치 || 0) - 2)));
    const hintOn = (S.vars.눈치 || 0) >= 3;
    let caught = 0;
    for (let r = 0; r < rounds; r++) {
      $('msInfo').textContent = `${r + 1} / ${rounds} · 지킨 쌀 ${caught}가마`;
      msg.textContent = '조금 더 큰 되를 찾아 누르세요';
      const big = Math.floor(Math.random() * 3);
      const scale = 1.27 - r * 0.03;
      row.textContent = '';
      const btns = [0, 1, 2].map((i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ms-box';
        b.innerHTML = '<img alt="되" src="assets/minigame/mg_measure.webp">';
        const img = b.querySelector('img');
        img.style.setProperty('--s', i === big ? scale : 1);
        img.style.setProperty('--r', (Math.random() * 8 - 4).toFixed(1) + 'deg');
        b.style.marginTop = (Math.random() * 6 - 3).toFixed(1) + 'vh';
        row.appendChild(b);
        return b;
      });
      const pick = await new Promise((res) => {
        const t0 = performance.now();
        let hinted = false;
        const tick = setInterval(() => {
          const left = Math.max(0, secs * 1000 - (performance.now() - t0));
          bar.style.width = (100 * left) / (secs * 1000) + '%';
          if (hintOn && !hinted && left < secs * 450) { hinted = true; btns[big].classList.add('hint'); }
          if (left <= 0) { clearInterval(tick); res(-1); }
        }, 50);
        btns.forEach((b, i) => b.addEventListener('click', (e) => { e.stopPropagation(); clearInterval(tick); res(i); }));
      });
      btns.forEach((b) => b.classList.remove('hint'));
      if (pick === big) {
        caught += 1;
        btns[pick].classList.add('right');
        msg.textContent = '속임수 간파! 쌀 한 가마를 지켰다';
      } else {
        btns[big].classList.add('right');
        if (pick >= 0) btns[pick].classList.add('wrong');
        msg.textContent = pick < 0 ? '놓쳤다… 큰 되로 한 가마를 더 퍼 갔다' : '그건 보통 되였다… 큰 되는 저것!';
      }
      $('msInfo').textContent = `${r + 1} / ${rounds} · 지킨 쌀 ${caught}가마`;
      await sleep(1100);
    }
    const grade = caught >= 5 ? 'S' : caught >= 4 ? 'A' : caught >= 2 ? 'B' : 'C';
    S.vars.되질지킴 = caught;
    recordGrade('되질감시', grade);
    row.textContent = '';
    msg.textContent = `속임수 ${rounds}번 중 ${caught}번을 잡아냈다 · 등급 ${grade} · 화면을 눌러 계속`;
    await waitBoxTap(box);
    box.hidden = true;
  }

  /* ---------- episode 3 mini-game: share out the harvest, see how long it lasts ---------- */
  async function splitGame() {
    $('dialog').hidden = true;
    hideTip();
    const box = $('split');
    const harvest = S.vars.수확 || 18;
    const caught = S.vars.되질지킴 || 0;
    const rent = Math.round(harvest * 0.6);
    const cheat = 5 - caught;
    const left = Math.max(3, harvest - rent - cheat - 2);
    const fee = 20;
    const DAYS = 12;
    const NEED = 126;            // Sep 26, 1929 (threshing day) -> Lunar New Year, Jan 30, 1930
    let debt = 0;
    let sell = 0;
    const moneyNow = Math.max(0, S.vars.돈 || 0);
    $('spTitle').textContent = '설날까지 버텨라';
    $('spLedger').innerHTML = `
      <span>거둔 쌀</span><span>${harvest}가마</span>
      <span>소작료 6할 (동척)</span><span class="neg">−${rent}가마</span>
      <span>큰 되 속임수</span><span class="neg">−${cheat}가마</span>
      <span>비료·종자값 (동척에서 빌린 것)</span><span class="neg">−2가마</span>
      <span class="sum">우리 집에 남은 쌀</span><span class="sum">${left}가마</span>`;
    $('spShort').innerHTML = `거둔 쌀 ${harvest} <i>− 소작료 ${rent} − 속임수 ${cheat} − 비료·종자 2</i> = <b>남은 쌀 ${left}가마</b>`;
    const dateOf = (days) => { const d = new Date(1929, 8, 26); d.setDate(d.getDate() + days); return `${d.getMonth() + 1}월 ${d.getDate()}일`; };
    const render = () => {
      const food = left - debt - sell;
      const bins = $('spBins');
      bins.innerHTML = '';
      const mk = (name, desc, val, onMinus, onPlus, canMinus, canPlus) => {
        const d = document.createElement('div');
        d.className = 'sp-bin';
        d.innerHTML = `<b>${name}</b><div class="sp-ctrl"><button type="button" aria-label="빼기">−</button><span>${val}</span><button type="button" aria-label="더하기">+</button></div><small>${desc}</small>`;
        const [m, p] = d.querySelectorAll('button');
        m.disabled = !canMinus;
        p.disabled = !canPlus;
        m.addEventListener('click', (e) => { e.stopPropagation(); onMinus(); render(); });
        p.addEventListener('click', (e) => { e.stopPropagation(); onPlus(); render(); });
        bins.appendChild(d);
      };
      const d = document.createElement('div');
      d.className = 'sp-bin';
      d.innerHTML = `<b>겨울 양식</b><div class="sp-ctrl"><span>${food}</span></div><small>한 가마로 다섯 식구가 ${DAYS}일을 버텨요. 나머지 쌀은 모두 여기로. 1가마는 꼭 남겨요.</small>`;
      $('spBins').appendChild(d);
      mk('장리쌀 빚 갚기', '봄에 빌린 쌀 2가마. 못 갚으면 내년에 이자가 붙어요.', debt,
        () => { debt -= 1; }, () => { debt += 1; }, debt > 0, food > 1 && debt < 2);
      mk('팔아서 수리조합비', `한 가마에 5전. 지금 돈 ${moneyNow}전, 필요한 돈 ${fee}전.`, sell,
        () => { sell -= 1; }, () => { sell += 1; }, sell > 0, food > 1);
      const days = food * DAYS;
      $('spFill').style.width = Math.min(100, (100 * days) / NEED) + '%';
      $('spCalText').textContent = `쌀독이 바닥나는 날: ${dateOf(days)} · 설날까지 ${Math.max(0, NEED - days)}일 모자라요`;
      const warn = [];
      if (debt < 2) warn.push('빚을 다 못 갚으면 내년 봄 이자가 붙어요.');
      if (moneyNow + sell * 5 < fee) warn.push(`수리조합비가 ${fee - moneyNow - sell * 5}전 모자라요. D-30까지 직접 벌어야 해요.`);
      $('spWarn').textContent = warn.join('\n');
    };
    render();
    box.hidden = false;
    await new Promise((res) => { $('btnSpDone').onclick = (e) => { e.stopPropagation(); $('btnSpDone').onclick = null; res(); }; });
    const food = left - debt - sell;
    const paidDebt = debt >= 2;
    const feeOk = moneyNow + sell * 5 >= fee;
    // Points: debt paid 1, fee covered 1, winter food 1 bag 0 / 2 bags 1 / 3+ bags 2.
    // The grade compares this split with the best split possible for this harvest (at least 1 bag kept).
    const score = (dbt, sl) => {
      const f = left - dbt - sl;
      return (dbt >= 2 ? 1 : 0) + (moneyNow + sl * 5 >= fee ? 1 : 0) + (f >= 3 ? 2 : f === 2 ? 1 : 0);
    };
    let best = 0;
    for (let dbt = 0; dbt <= 2; dbt++) for (let sl = 0; left - dbt - sl >= 1; sl++) best = Math.max(best, score(dbt, sl));
    const gap = best - score(debt, sell);
    // With only one bag left for the winter (12 days), the grade stays at B or below.
    const grade = gap <= 0 && food > 1 ? 'S' : gap <= 1 && food > 1 ? 'A' : gap <= 2 ? 'B' : 'C';
    recordGrade('쌀나누기', grade);
    S.vars.쌀 = food;
    S.vars.쌀판것 = sell;
    if (sell) applyEffects([{ v: '돈', d: sell * 5 }]);
    if (paidDebt) S.flags.add('빚갚음');
    hud(['쌀독']);
    renderTop();
    $('spTitle').textContent = `등급 ${grade}`;
    $('spBins').innerHTML = '';
    $('spWarn').textContent = '';
    $('spCalText').textContent = `빚 갚기 ${paidDebt ? '○' : '✕'} · 수리조합비 ${feeOk ? '○' : '✕'} · 겨울 양식 ${food}가마(${food * DAYS}일)\n${dateOf(food * DAYS)}, 쌀독이 바닥나요. 설날까지 ${Math.max(0, NEED - food * DAYS)}일 모자라요.\n윤재가 잘못 나눈 게 아니에요. 처음부터 모자랐어요.`;
    $('spCalText').style.whiteSpace = 'pre-line';
    $('btnSpDone').textContent = '계속';
    await new Promise((res) => { $('btnSpDone').onclick = (e) => { e.stopPropagation(); $('btnSpDone').onclick = null; res(); }; });
    $('btnSpDone').textContent = '이대로 나누기';
    $('spCalText').style.whiteSpace = '';
    box.hidden = true;
  }

  /* ---------- episode 4 mini-game: add up bank slips with an abacus ---------- */
  function wonText(x) {
    const w = Math.floor(x / 100);
    const j = x % 100;
    if (!w) return `${j}전`;
    return j ? `${w}원 ${j}전` : `${w}원`;
  }
  async function abacusGame() {
    $('dialog').hidden = true;
    hideTip();
    const box = $('abacus');
    const opts = $('abOpts');
    const msg = $('abMsg');
    const bar = $('abTime');
    opts.textContent = '';
    msg.textContent = '';
    $('abSum').textContent = '';
    $('abKicker').textContent = '전표';
    $('abInfo').textContent = '';
    box.hidden = false;
    await briefing('abBrief', 'btnAbStart');
    const rounds = 8;
    const secs = Math.max(4, Math.min(8, 5 + 0.5 * ((S.vars.학업 || 0) - 4)));
    const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
    let correct = 0;
    for (let r = 0; r < rounds; r++) {
      $('abInfo').textContent = `전표 ${r + 1} / ${rounds} · 맞힘 ${correct}`;
      msg.textContent = '두 금액을 더한 값을 고르세요';
      const a = r < 4 ? rnd(12, 89) : 100 + rnd(10, 95);
      const b = rnd(15, 89);
      const ans = a + b;
      $('abSum').textContent = `${wonText(a)} + ${wonText(b)}`;
      const wrongs = [10, -10, 1, -1, 9, -9, 11, -11].map((d) => ans + d).filter((v) => v > 0);
      const picks = [ans];
      while (picks.length < 3) {
        const v = wrongs.splice(Math.floor(Math.random() * wrongs.length), 1)[0];
        if (!picks.includes(v)) picks.push(v);
      }
      picks.sort(() => Math.random() - 0.5);
      opts.textContent = '';
      const btns = picks.map((v) => {
        const b2 = document.createElement('button');
        b2.type = 'button';
        b2.className = 'btn ab-opt';
        b2.textContent = wonText(v);
        opts.appendChild(b2);
        return b2;
      });
      const pick = await new Promise((res) => {
        const t0 = performance.now();
        const tick = setInterval(() => {
          const left = Math.max(0, secs * 1000 - (performance.now() - t0));
          bar.style.width = (100 * left) / (secs * 1000) + '%';
          if (left <= 0) { clearInterval(tick); res(-1); }
        }, 50);
        btns.forEach((b2, i) => b2.addEventListener('click', (e) => { e.stopPropagation(); clearInterval(tick); res(i); }));
      });
      const right = picks.indexOf(ans);
      btns[right].classList.add('right');
      if (pick === right) { correct += 1; msg.textContent = '딱 맞았다!'; }
      else { if (pick >= 0) btns[pick].classList.add('wrong'); msg.textContent = pick < 0 ? `시간이 지났다… 답은 ${wonText(ans)}` : `틀렸다… 답은 ${wonText(ans)}`; }
      $('abInfo').textContent = `전표 ${r + 1} / ${rounds} · 맞힘 ${correct}`;
      await sleep(950);
    }
    opts.textContent = '';
    const rival = 4 + (Math.random() < 0.5 ? 0 : 1);   // the Japanese errand boy next to Yunjae
    const grade = correct >= 8 ? 'S' : correct >= 6 ? 'A' : correct >= 4 ? 'B' : 'C';
    S.vars.주판 = correct;
    S.vars.사환 = rival;
    S.vars.주판차 = correct - rival;
    recordGrade('주판셈', grade);
    $('abKicker').textContent = '결과';
    $('abSum').textContent = `윤재 ${correct}장 · 일본인 사환 ${rival}장`;
    msg.textContent = `전표 ${rounds}장 중 ${correct}장을 맞혔다 · 등급 ${grade} · 화면을 눌러 계속`;
    await waitBoxTap(box);
    box.hidden = true;
  }

  /* ---------- episode 4 mini-game: rebut the speech with Yunjae's own memories ---------- */
  async function rebutGame(c, mode) {
    const mf = mode === 'manifesto';   // fill the blank (___) of each slogan with the right card
    $('dialog').hidden = true;
    hideTip();
    const box = $('rebut');
    box.querySelector('.ch-head b').textContent = mf ? '격문 쓰기' : '연설문 속 거짓 찾기';
    box.querySelector('.rb-kicker').textContent = mf ? '독서회 격문 · 빈칸을 채워라' : '마쓰다 교관이 써 준 연설문';
    box.querySelector('.rb-ev-kicker').textContent = mf ? '윤재가 겪은 일 · 이 말을 쓰는 이유' : '윤재가 직접 겪은 일 · 증거';
    box.classList.toggle('mf', mf);
    const bk = $('rbBrief');
    bk.querySelector('.note-kicker').textContent = mf ? '미니게임 · 격문 쓰기' : '미니게임 · 연설문 속 거짓 찾기';
    bk.querySelector('.note-title').textContent = mf ? '내가 겪은 일로 격문을 써라' : '내가 겪은 일로 뒤집어라';
    bk.querySelector('.fi-text').textContent = mf
      ? '11월 12일에 돌릴 격문. 빈칸마다 윤재가 직접 겪은 일에서 나온 말을 채워 넣는다.'
      : '마쓰다 교관이 써 준 연설문. 문장마다 윤재가 직접 겪은 일과 맞지 않는 곳이 있다.';
    const steps = bk.querySelectorAll('.brief-steps li');
    if (mf) {
      steps[0].innerHTML = '가운데 격문에서 <b>노랗게 표시된 문장</b>의 빈칸을 채운다. 순서는 매번 섞인다';
      steps[1].innerHTML = '아래 <b>낱말 카드</b> 중에서 빈칸에 맞는 말을 고른다. 일본이 좋아할 말도 섞여 있다';
      steps[2].innerHTML = '한 번에 맞히면 ★, 두 번 틀리면 맞는 카드가 빛난다';
    } else {
      steps[0].innerHTML = '가운데 연설문에서 <b>노랗게 표시된 문장</b>을 따진다. 문장과 카드 순서는 매번 섞인다';
      steps[1].innerHTML = '아래 <b>기억 카드</b> 중에서 그 문장을 뒤집을 증거를 고른다. 진짜 기억이지만 증거가 아닌 카드도 있다';
      steps[2].innerHTML = '카드가 <b>두 장</b> 필요한 문장도 있다. 한 번에 맞히면 ★, 두 번 틀리면 맞는 카드가 빛난다';
    }
    const hand = $('rbHand');
    const list = $('rbList');
    const res = $('rbRes');
    const ev = $('rbEvidence');
    hand.textContent = '';
    list.textContent = '';
    res.textContent = '';
    ev.hidden = true;
    $('rbTap').hidden = true;
    $('rbInfo').textContent = '';
    box.hidden = false;
    await briefing('rbBrief', 'btnRbStart');
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const mems = shuffle(c.mems);
    const sents = shuffle(c.sents);
    // the whole speech stays on the page; the sentence being checked is highlighted
    const lis = sents.map((sent) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${mf ? sent.text.replace('___', '<u>　　　</u>') : sent.text}</span>`;
      list.appendChild(li);
      return li;
    });
    const cards = mems.map((m) => {
      const b2 = document.createElement('button');
      b2.type = 'button';
      b2.className = 'rb-card';
      b2.innerHTML = `<img alt="" src="${BG[m.img] || ''}"><b>${m.name}</b><small>${m.desc}</small>`;
      hand.appendChild(b2);
      return b2;
    });
    let first = 0;
    for (let i = 0; i < sents.length; i++) {
      const sent = sents[i];
      const li = lis[i];
      lis.forEach((l) => l.classList.remove('cur'));
      li.classList.add('cur');
      $('rbInfo').textContent = `${i + 1} / ${sents.length} · ★ ${first}`;
      cards.forEach((b2) => b2.classList.remove('hint', 'wrong', 'picked'));
      const picked = new Set();
      const need = sent.all ? sent.ok.length : 1;
      let misses = 0;
      res.className = 'rb-res';
      res.textContent = mf ? '빈칸에 들어갈 말을 아래 낱말 카드에서 고르세요.'
        : need > 1 ? `이 문장은 증거가 ${need}장 필요해요. 기억 카드를 ${need}장 고르세요.` : '이 문장을 뒤집을 윤재의 기억을 아래에서 고르세요.';
      while (picked.size < need) {
        const k = await new Promise((r) => cards.forEach((b2, j) => { b2.onclick = (e) => { e.stopPropagation(); r(j); }; }));
        cards.forEach((b2) => { b2.onclick = null; });
        const id = mems[k].id;
        if (picked.has(id)) continue;
        if (sent.ok.includes(id)) {
          picked.add(id);
          cards[k].classList.remove('hint');
          cards[k].classList.add('picked');
          if (picked.size < need) { res.textContent = `맞아요! 하나 더 골라야 해요. (${picked.size} / ${need})`; }
          continue;
        }
        misses += 1;
        cards[k].classList.remove('wrong'); void cards[k].offsetWidth; cards[k].classList.add('wrong');
        res.textContent = misses >= 2
          ? '그 기억으로는 이 문장을 뒤집기 어려워요. 빛나는 카드가 힌트예요.'
          : mf ? '그 말은 이 빈칸에 어울리지 않아요. 다시 골라 보세요.' : '그 기억은 이 문장을 뒤집는 증거가 아니에요. 다시 골라 보세요.';
        if (misses >= 2) mems.forEach((m, j) => { if (sent.ok.includes(m.id) && !picked.has(m.id)) cards[j].classList.add('hint'); });
      }
      if (!misses) first += 1;
      $('rbInfo').textContent = `${i + 1} / ${sents.length} · ★ ${first}`;
      // evidence: the chosen memories come up large with the explanation
      await sleep(350);
      $('rbEvImgs').innerHTML = mems.filter((m) => picked.has(m.id))
        .map((m) => `<figure><img alt="" src="${BG[m.img] || ''}"><figcaption>${m.name}</figcaption></figure>`).join('');
      $('rbEvWhy').textContent = sent.why;
      ev.hidden = false;
      await sleep(500);
      await waitBoxTap(box);
      ev.hidden = true;
      li.classList.remove('cur');
      li.classList.add('done');
      if (mf) {
        li.querySelector('span').textContent = sent.text.replace('___', mems.filter((m) => picked.has(m.id)).map((m) => m.name).join(' '));
        li.insertAdjacentHTML('beforeend', '<img class="rb-x" alt="완성" src="assets/minigame/mg_stamp_o.webp">');
      } else {
        li.insertAdjacentHTML('beforeend', '<img class="rb-x" alt="거짓" src="assets/minigame/mg_stamp_x.webp">');
      }
      await sleep(250);
    }
    cards.forEach((b2) => b2.classList.remove('hint', 'wrong', 'picked'));
    const n = sents.length;
    const grade = first >= n ? 'S' : first >= n - 2 ? 'A' : first >= Math.ceil(n / 3) ? 'B' : 'C';
    S.vars[mf ? '격문쓰기' : '거짓찾기'] = first;
    recordGrade(mf ? '격문쓰기' : '거짓찾기', grade);
    res.className = 'rb-res ok';
    res.textContent = mf ? `격문 ${n}줄을 모두 완성했다 · 한 번에 맞힌 줄 ${first}개 · 등급 ${grade}`
      : `연설문 ${n}문장을 모두 뒤집었다 · 한 번에 맞힌 문장 ${first}개 · 등급 ${grade}`;
    $('rbTap').hidden = false;
    await waitBoxTap(box);
    $('rbTap').hidden = true;
    box.hidden = true;
  }

  /* ---------- people hub: pick whom to meet (free time in episodes 5-6, witnesses) ---------- */
  // @hub 횟수 | 라벨 접두어 | 이름:그림 이름:그림 ... | 제목 | 안내   → runs '## 접두어:이름' until @return
  async function hub(arg, id) {
    const parts = arg.split('|').map((x) => x.trim());
    const count = Number(parts[0]) || 1;
    const prefix = parts[1] || '사람';
    const people = (parts[2] || '').split(/\s+/).filter(Boolean).map((t) => { const [n, img] = t.split(':'); return { n, img: img || n }; });
    hideSprite('모두');
    $('dialog').hidden = true;
    hideTip();
    const met = new Set();
    for (let i = 0; i < count; i++) {
      $('hbTitle').textContent = parts[3] || '누구를 만날까?';
      $('hbText').textContent = parts[4] || '';
      $('hbLeft').textContent = `남은 횟수 ${count - i}`;
      const grid = $('hbGrid');
      grid.textContent = '';
      const n = await new Promise((res) => {
        people.forEach((pp) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'rb-card hb-card' + (met.has(pp.n) ? ' met' : '');
          const src = CHARS[pp.img] ? charSrc(CHARS[pp.img].key, 'normal') : BG[pp.img] || '';
          const rel = RELS[pp.n] ? Math.max(0, Math.min(5, S.vars[pp.n] || 0)) : -1;
          b.innerHTML = `<img class="${CHARS[pp.img] ? 'face' : ''}" alt="" src="${src}"><b>${(RELS[pp.n] || {}).name || pp.n}</b>`
            + (rel >= 0 ? `<small class="hearts">${'♥'.repeat(rel)}${'♡'.repeat(5 - rel)}</small>` : '')
            + (met.has(pp.n) ? '<small>이미 만났어요</small>' : '');
          b.disabled = met.has(pp.n);
          b.addEventListener('click', (e) => { e.stopPropagation(); res(pp.n); });
          grid.appendChild(b);
        });
        $('hub').hidden = false;
      });
      $('hub').hidden = true;
      met.add(n);
      const label = `${prefix}:${n}`;
      if (label in prog.labels) await runSub(prog.labels[label], id);
      hideSprite('모두');
      $('dialog').hidden = true;
      if (id !== runId) return;
    }
  }

  /* ---------- rhythm game: read the speech (강당) or chant the slogans (거리) ---------- */
  async function rhythmGame(c) {
    $('dialog').hidden = true;
    hideTip();
    hideSprite('모두');
    const speech = c.mode === '연설';
    const box = $('rhythm');
    const lane = $('rhLane');
    const phraseEl = $('rhPhrase');
    const msg = $('rhMsg');
    const mem = $('rhMem');
    $('rhBg').src = BG[c.bg] || BG[speech ? '강당' : '거리행진'] || '';
    box.classList.toggle('speech', speech);
    $('rhTitle').textContent = speech ? '연설' : '구호';
    lane.querySelectorAll('.rh-note').forEach((x) => x.remove());
    phraseEl.textContent = '';
    msg.textContent = '';
    mem.hidden = true;
    // crowd rows: 1 + comrades (episode 6) or friends with 3+ hearts (episode 5)
    const crowdLv = speech ? 0 : Math.max(1, Math.min(5, 1 + (S.vars.동료 || 0)));
    const crowd = $('rhCrowd');
    crowd.innerHTML = '';
    for (let k = 0; k < crowdLv; k++) crowd.insertAdjacentHTML('beforeend', `<img alt="" src="assets/minigame/mg_crowd.webp" style="--k:${k}">`);
    $('rhBriefTitle').textContent = speech ? '마쓰다의 연설문을 읽어라' : '함께 구호를 외쳐라';
    $('rhBriefText').textContent = speech
      ? '수여식 단상. 마쓰다 교관이 써 준 연설문을 한 마디씩 읽는다.'
      : `거리의 학생들과 함께 구호를 외친다. 함께하는 사람이 많을수록 대열이 커진다. (지금 대열 ${crowdLv}줄)`;
    box.hidden = false;
    $('rhInfo').textContent = '';
    await briefing('rhBrief', 'btnRhStart');
    // build the beat chart: one beat per space-separated chunk
    const beat = speech ? 900 : 760;
    const travel = 2300;
    const notes = [];
    let t = 1600;
    c.lines.forEach((ln, li) => {
      const words = ln.text.split(/\s+/).filter(Boolean);
      words.forEach((w, wi) => {
        notes.push({ t, w, li, wi, last: wi === words.length - 1, stop: ln.stop && wi === words.length - 1 });
        t += beat;
      });
      t += beat * 0.8;
    });
    const hitX = 18;     // % from the left where notes should be hit
    notes.forEach((nt) => {
      const el = document.createElement('div');
      el.className = 'rh-note';
      el.textContent = nt.w;
      el.style.left = '110%';
      lane.appendChild(el);
      nt.el = el;
    });
    let score = 0;
    let hits = 0;
    let streak = 0;
    let lineShown = -1;
    let stopped = false;
    const judge = (nt, dt) => {
      const a = Math.abs(dt);
      const pts = a <= 160 ? 2 : a <= 320 ? 1 : 0;
      nt.done = true;
      nt.el.classList.add(pts === 2 ? 'perfect' : pts ? 'good' : 'miss');
      score += pts;
      if (pts) { hits += 1; streak += 1; } else streak = 0;
      msg.textContent = pts === 2 ? '좋아!' : pts ? '괜찮아' : speech ? '…목소리가 떨린다' : '놓쳤다';
      if (!speech) crowd.style.setProperty('--glow', Math.min(1, streak / 8).toFixed(2));
      phraseEl.querySelectorAll('span')[nt.wi]?.classList.add(pts ? 'on' : 'off');
    };
    const t0 = performance.now() + 300;
    const tap = (e) => {
      if (e) e.stopPropagation();
      const now = performance.now() - t0;
      const cand = notes.filter((nt) => !nt.done && !nt.stop && Math.abs(nt.t - now) <= 420);
      if (!cand.length) return;
      cand.sort((x, y) => Math.abs(x.t - now) - Math.abs(y.t - now));
      judge(cand[0], now - cand[0].t);
    };
    box.onclick = tap;
    const key = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tap(); } };
    window.addEventListener('keydown', key);
    await new Promise((res) => {
      const loop = () => {
        const now = performance.now() - t0;
        // show the current line big in the middle, word by word
        const cur = notes.find((nt) => !nt.done && nt.t - now < travel * 0.55) || notes[notes.length - 1];
        if (cur && cur.li !== lineShown) {
          lineShown = cur.li;
          const ln = c.lines[cur.li];
          phraseEl.innerHTML = ln.text.split(/\s+/).filter(Boolean).map((w) => `<span>${w}</span>`).join(' ');
          if (ln.img && BG[ln.img]) { $('rhMemImg').src = BG[ln.img]; mem.hidden = false; mem.classList.remove('pop'); void mem.offsetWidth; mem.classList.add('pop'); }
          else mem.hidden = true;
        }
        notes.forEach((nt) => {
          if (nt.done && !nt.el.classList.contains('miss')) { nt.el.style.opacity = '0'; return; }
          const x = hitX + ((nt.t - now) / travel) * (100 - hitX);
          nt.el.style.left = x + '%';
          if (nt.stop && now >= nt.t - 120) { stopped = true; }
          if (!nt.done && !nt.stop && now - nt.t > 420) judge(nt, 999);
        });
        $('rhInfo').textContent = speech ? '' : `대열 ${crowdLv}줄 · 연속 ${streak}`;
        if (stopped) { res(); return; }
        if (now > notes[notes.length - 1].t + 700) { res(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    box.onclick = null;
    window.removeEventListener('keydown', key);
    const total = notes.filter((nt) => !nt.stop).length * 2;
    const ratio = total ? score / total : 0;
    if (c.game && c.game !== '-') {
      const grade = ratio >= 0.85 ? 'S' : ratio >= 0.65 ? 'A' : ratio >= 0.4 ? 'B' : 'C';
      recordGrade(c.game, grade);
      S.vars[c.game + '점수'] = Math.round(ratio * 100);
      msg.textContent = `구호 ${hits}번을 함께 외쳤다 · 등급 ${grade} · 화면을 눌러 계속`;
    } else if (stopped) {
      notes.forEach((nt) => { if (nt.stop) nt.el.classList.add('miss'); });
      msg.textContent = '"배불리…" 그 말이, 목에서 나오지 않는다 · 화면을 눌러 계속';
    } else {
      msg.textContent = '화면을 눌러 계속';
    }
    await sleep(500);
    await waitBoxTap(box);
    box.hidden = true;
    mem.hidden = true;
  }

  /* ---------- finale: the five broken beliefs gather into one new card ---------- */
  async function hopeCard() {
    $('dialog').hidden = true;
    hideTip();
    hideSprite('모두');
    const box = $('hope');
    const row = $('hpRow');
    row.innerHTML = CARDS.map((cd, k) => `<img alt="" style="--k:${k}" src="${cardSrc(cd.id, S.cards[cd.id] === 'normal' ? 'normal' : 'broken')}">`).join('');
    $('hpCard').hidden = true;
    $('hpText').textContent = '';
    box.classList.remove('gather');
    box.hidden = false;
    await sleep(1600);
    box.classList.add('gather');
    await sleep(1500);
    $('hpCard').hidden = false;
    $('hpText').textContent = '원래 그런 세상은 없다. 그러니 우리가 바꿀 수 있다.';
    S.flags.add('희망카드');
    await sleep(900);
    await waitBoxTap(box);
    box.hidden = true;
  }

  /* ---------- chapter title and chapter end ---------- */
  async function chapterCard(arg) {
    const [num, title, cardName] = arg.split('|').map((x) => x.trim());
    const card = CARDS.find((c) => c.name === cardName);
    $('dialog').hidden = true;
    hideTip();
    hideSprite('모두');
    const img = $('dcImg');
    img.hidden = !card;
    if (card) img.src = cardSrc(card.id, S.cards[card.id]);
    $('dcNum').hidden = false;
    $('dcNum').textContent = num + '화';
    $('dcDate').textContent = title || '';
    $('dcPlace').textContent = card ? `윤재의 믿음 · ‘${card.label}’` : '';
    $('daycard').hidden = false;
    await sleep(800);
    await Promise.race([sleep(2600), waitTap()]);
    tapResolver = null;
    $('daycard').hidden = true;
    img.hidden = true;
  }

  function chapterStats() {
    const v = S.vars;
    const hearts = (k) => { const n = Math.max(0, Math.min(5, v[k] || 0)); return '♥'.repeat(n) + '♡'.repeat(5 - n); };
    const stats = [
      ['능력치', `학업 ${v.학업} · 눈치 ${v.눈치} · 체력 ${v.체력} · 용기 ${v.용기}`],
      ['돈', `${v.돈}전`],
      ['장학생 게이지', `${Math.max(0, Math.min(100, v.성적))} / 100`],
      ['의심도', `${Math.max(0, Math.min(100, v.의심))} / 100`],
      ['만식', hearts('만식')],
    ];
    ['정희', '진수', '기철'].forEach((k) => { if (S.flags.has('만남_' + k)) stats.push([RELS[k].name, hearts(k)]); });
    if (S.perks.length) stats.push(['새로운 마음', S.perks.map((p) => p.name).join(', ')]);
    stats.push(['역사 노트', `${S.notes.length} / ${totalNotes()}`]);
    const nb = Object.keys(prog.badges).length;
    if (nb) stats.push(['업적', `${S.badges.length} / ${nb}`]);
    const rec = Object.entries(S.records).map(([k, g]) => `${k} ${g}`).join(' · ');
    if (rec) stats.push(['미니게임 등급', rec]);
    stats.push(['칭호', playerTitle()]);
    return stats;
  }

  async function chapterEnd(arg) {
    const [num, title, cardName, ask, nextTitle, nextDesc] = arg.split('|').map((x) => x.trim());
    const card = CARDS.find((c) => c.name === cardName) || CARDS[0];
    $('dialog').hidden = true;
    hideSprite('모두');
    save(pc);
    $('esCard').src = cardName === '희망' ? 'assets/card/card_hope.webp' : cardSrc(card.id, S.cards[card.id]);
    $('esKicker').textContent = cardName === '희망' ? '6화 끝 · 마지막 이야기' : `${num}화 끝`;
    $('esTitle').textContent = title || '';
    $('esAsk').textContent = ask || '';
    $('esNextBox').hidden = !nextTitle;
    $('esNextTitle').textContent = nextTitle ? `다음 화 · ${nextTitle}` : '';
    $('esNextDesc').textContent = nextDesc || '';
    $('btnNext').hidden = !nextTitle || !(nextLabelExists());
    if (nextTitle && $('btnNext').hidden) $('esNextTitle').textContent += ' (준비 중)';
    $('esStats').innerHTML = chapterStats().map(([k, val]) => `<li><b>${k}</b><span>${val}</span></li>`).join('');
    $('endscreen').hidden = false;
    await new Promise((res) => { nextResolver = res; });
    $('endscreen').hidden = true;
  }
  let nextResolver = null;
  function nextLabelExists() {
    const c = prog.cmds[pc];
    return !!c && c.type === 'jump' && !c.cond && c.go in prog.labels;
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
        notes: S.notes, items: S.items, perks: S.perks, quests: S.quests, hud: hudList(), day: S.day, bg: S.bg, ep: S.ep,
        records: S.records, badges: S.badges, goal: S.goal, spotHints: S.spotHints || {},
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
        return speak('say', NAME_LABEL[c.who] || c.who, c.text);
      }
      case 'think': highlight(sprites.has('윤재') ? '윤재' : null); return speak('think', '윤재 속마음', c.text);
      case 'narr': highlight(null); return speak('narr', '', c.text);
      case 'choice': {
        const o = await choose(c.options);
        if (o.req && o.req.check) {
          const ok = await rollCheck(o.req);
          if (ok) { applyEffects(o.effects); if (o.go) pc = labelAt(o.go); }
          else if (o.fail) pc = labelAt(o.fail);
          return;
        }
        applyEffects(o.effects);
        if (o.go) pc = labelAt(o.go);
        return;
      }
      case 'jump': if (!c.cond || cond(c.cond)) pc = labelAt(c.go); return;
      case 'stat': {
        const [eff, note] = c.arg.split('|').map((x) => x.trim());
        const m = eff.match(/^(\S+)\s*([+-]\d+)$/);
        if (m) {
          applyEffects([{ v: m[1], d: Number(m[2]) }], !!note || c.quiet);
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
      case 'note': { const r = noteEvent(c.arg, c.quiet); S.vars.노트수 = S.notes.length; return r; }
      case 'unlock': unlockBadge(c.arg.trim(), c.quiet); return sleep(c.quiet ? 0 : 300);
      case 'goal': {
        const [id, text, k, n, due] = c.arg.split('|').map((x) => x.trim());
        S.goal = { id, text, k, n: Number(n) || 0, due: Number(due) || 0 };
        renderGoal();
        if (!c.quiet) toast(`목표: ${text}`);
        return sleep(c.quiet ? 0 : 300);
      }
      case 'goalend': S.goal = null; renderGoal(); return;
      case 'perk': return perkEvent(c.arg, c.quiet);
      case 'set': {
        const [k, v] = c.arg.split(/\s+/);
        S.vars[k] = Number(v) || 0;
        renderTop();
        return;
      }
      case 'episode': {
        S.ep = Number(c.arg) || 1;
        S.spotHints = {};
        Object.keys(S.vars).forEach((k) => { if (k.startsWith('방문_')) delete S.vars[k]; });
        return;
      }
      case 'chapter': save(pc - 1); return chapterCard(c.arg);
      case 'chapterend': return chapterEnd(c.arg);
      case 'inspect': return inspectGame(c.arg);
      case 'chase': return chaseGame(c.arg);
      case 'interrogate': return interrogate(c);
      case 'reap': return reapGame();
      case 'measure': return measureGame();
      case 'ricesplit': return splitGame();
      case 'abacus': return abacusGame();
      case 'spothint': {
        const [n, hint] = c.arg.split('|').map((x) => x.trim());
        S.spotHints = { ...(S.spotHints || {}), [n]: hint || '' };
        return;
      }
      case 'rebut': return rebutGame(c);
      case 'manifesto': return rebutGame(c, 'manifesto');
      case 'rhythm': return rhythmGame(c);
      case 'hub': return hub(c.arg, id);
      case 'hopecard': return hopeCard();
      case 'gradevar': {
        const [game, k, cuts] = c.arg.split('|').map((x) => x.trim());
        const [a, b2, d] = (cuts || '3 2 1').split(/\s+/).map(Number);
        const v = S.vars[k] || 0;
        const grade = v >= a ? 'S' : v >= b2 ? 'A' : v >= d ? 'B' : 'C';
        recordGrade(game, grade);
        toast(`${game} · 등급 ${grade}`);
        return sleep(600);
      }
      case 'waver': return waver(c.arg);
      case 'get': {
        const name = c.arg.trim();
        if (!has(name)) S.items.push(name);
        if (c.quiet) return;
        hud(['가방']);
        flashBag();
        toast(`‘${name}’을(를) 얻었다`, (prog.items[name] || {}).img);
        return sleep(300);
      }
      case 'lose': {
        const name = c.arg.trim();
        S.items = S.items.filter((x) => x !== name);
        if (c.quiet) return;
        toast(`‘${name}’을(를) 건넸다`, (prog.items[name] || {}).img);
        return sleep(300);
      }
      case 'quest': {
        const [qid, text] = c.arg.split('|').map((x) => x.trim());
        if (!S.quests.some((q) => q.id === qid)) S.quests.push({ id: qid, text: text || qid, done: false });
        if (c.quiet) return;
        hud(['가방']);
        flashBag();
        toast(`할 일: ${text || qid}`);
        return sleep(300);
      }
      case 'done': {
        const q = S.quests.find((x) => x.id === c.arg.trim());
        if (q && !q.done) { q.done = true; if (!c.quiet) toast(`할 일 완료: ${q.text}`); }
        return sleep(300);
      }
      case 'explore': save(pc - 1); return explore(c.arg, id);
      case 'return': return;
      case 'carry': return carryGame();
      case 'notebook': return notebook(c.arg);
      case 'cards': S.flags.add('믿음소개'); return cardsIntro();
      case 'card': {
        if (c.quiet) {
          const [name, stName] = c.arg.split(/\s+/);
          const card = CARDS.find((x) => x.name === name || x.id === name);
          if (card) S.cards[card.id] = CARD_STATE[stName] || stName;
          return;
        }
        return cardEvent(c.arg);
      }
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
    'tip', 'slide', 'btnSkip', 'noteshow', 'bag', 'cardping', 'mapview', 'carry', 'beliefview', 'inspect', 'chase', 'freeintro', 'interro', 'dice', 'reap', 'measure', 'split'];

  function start(fromSave, label) {
    runId += 1;
    S = newState();
    pc = 0;
    tapResolver = null;
    carryDrop = null;
    nextResolver = null;
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
      S.ep = fromSave.ep || 1;
      S.records = fromSave.records || {};
      S.badges = fromSave.badges || [];
      S.goal = fromSave.goal || null;
      S.spotHints = fromSave.spotHints || {};
      fromSave.hud.forEach((c) => $('game').classList.add(c));
      $('game').classList.toggle('hud-any', fromSave.hud.length > 0);
      if (fromSave.bg) setBg(fromSave.bg);
      pc = fromSave.pc;
    }
    if (label && label in prog.labels) pc = prog.labels[label];
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
    prog = parse([1, 2, 3, 4, 5, 6].map((n) => window['STORY_STAGE' + n]).filter(Boolean).join('\n'));
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
      'assets/minigame/mg_measure.webp', 'assets/minigame/mg_ricebundle.webp',
      'assets/minigame/mg_abacus.webp', 'assets/minigame/mg_crowd.webp', 'assets/card/card_hope.webp', PERK_ICON,
    ];
    await preload(list, (p) => {
      $('ldFill').style.width = Math.round(p * 100) + '%';
      $('ldText').textContent = `그림을 불러오는 중 ${Math.round(p * 100)}%`;
    });
    $('btnContinue').hidden = !loadSave();
    const chapters = Object.keys(prog.labels).filter((l) => l.startsWith('바로:'));
    const chList = $('chapterList');
    chList.textContent = '';
    chapters.forEach((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = l.slice(3) + '부터';
      b.addEventListener('click', (e) => { e.stopPropagation(); clearSave(); $('title').hidden = true; start(null, l); });
      chList.appendChild(b);
    });
    $('btnChapters').hidden = chapters.length === 0;
    $('loading').hidden = true;
    $('title').hidden = false;
  }

  $('btnStart').addEventListener('click', (e) => { e.stopPropagation(); clearSave(); $('title').hidden = true; start(); });
  $('btnContinue').addEventListener('click', (e) => { e.stopPropagation(); const s = loadSave(); $('title').hidden = true; start(s); });
  $('btnRestart').addEventListener('click', (e) => { e.stopPropagation(); clearSave(); start(); });
  $('btnNext').addEventListener('click', (e) => { e.stopPropagation(); if (nextResolver) { const r = nextResolver; nextResolver = null; r(); } });
  $('btnChapters').addEventListener('click', (e) => { e.stopPropagation(); $('chapterList').hidden = !$('chapterList').hidden; });
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
