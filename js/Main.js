/* ============================================================
   FPP v2 — Main.js
   홈 / 캐릭터(슬라이드 패널) / 현질 서폿 / PvP 패치 — 단일 페이지 라우팅
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = { chars: [], supports: [], pvps: [], patches: [], events: [], boards: [], banners: [], loaded: false };
  var F = { tab: 'char', grade: 'all', attr: 'all', type: 'all', sort: 'id', fav: false, q: '' };
  var pvpSelDate = '';

  var DEMO_BOARDS_KEY = 'fpp_demo_boards';
  function readDemoBoards() {
    try { return JSON.parse(localStorage.getItem(DEMO_BOARDS_KEY) || '[]'); } catch (e) { return []; }
  }

  function safe(p, label) {
    return p.catch(function (e) { console.error('[FPP] ' + label + ' 로드 실패:', e); return []; });
  }
  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    return Promise.all([
      safe(FB.getCharacters(), 'characters'), safe(FB.getSupportCharacters(), 'supportCharacters'),
      safe(FB.getPvpPatches(), 'pvpPatch'), safe(FB.getPatchNotes(), 'patchNotes'),
      safe(FB.getEvents(), 'events'), safe(FB.getBoards(), 'boards'), safe(FB.getBanners(), 'banners')
    ]).then(function (r) {
      S.chars = r[0]; S.supports = r[1];
      S.pvps = r[2].map(function (g, i) { g.uid = (g.docId || 'g') + '_' + i; return g; });
      S.patches = r[3]; S.events = r[4];
      S.boards = readDemoBoards().concat(r[5]);
      S.banners = r[6]; S.loaded = true;
    });
  }

  function findChar(id, tab) {
    var pool = tab === 'support' ? S.supports : S.chars;
    var c = pool.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!c) c = S.chars.concat(S.supports).filter(function (x) { return String(x.id) === String(id); })[0];
    return c || null;
  }
  window.__FPP_CHARS = function (id, kind) { return findChar(id, kind === 'support' ? 'support' : 'char'); };

  /* 속성/타입 매핑 (원본 레포: 力/技/心) */
  function charAttrClass(c) {
    var a = String(c.attr || '').toLowerCase();
    if (a === 'force' || a === '힘' || a === '力') return 'attr-force';
    if (a === 'ki' || a === '기' || a === '技') return 'attr-ki';
    if (a === 'sim' || a === '심' || a === '心') return 'attr-sim';
    return '';
  }
  function charAttrLabel(c) {
    var k = charAttrClass(c);
    if (k === 'attr-force') return '힘';
    if (k === 'attr-ki') return '기';
    if (k === 'attr-sim') return '심';
    return '';
  }
  function attrIconSrc(cls) {
    var m = { 'attr-force': 'force', 'attr-ki': 'ki', 'attr-sim': 'sim' };
    return m[cls] ? 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/img/attr/' + m[cls] + '.png' : '';
  }
  function typeIconSrc(bt) {
    var m = { '원소': 'element', 'element': 'element', '검사': 'sword', 'sword': 'sword', '격투': 'fighter', 'fighter': 'fighter', '특수': 'special', 'special': 'special' };
    var k = m[bt];
    return k ? 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/img/type/' + k + '.webp' : '';
  }

  var BNAME = { buff: '버프', nerf: '너프', fix: '기능수정' };
  var BSYM = { buff: '▲', nerf: '▼', fix: '✦' };

  /* ================= 목록 행 (홈 공용) ================= */
  function rowHTML(o) {
    return '<li class="lst-row" data-go="' + UI.esc(o.page) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="lst-main"><div class="lst-l1">' + o.badge +
      '<span class="lst-title">' + UI.esc(o.title) + '</span></div>' +
      '<div class="lst-l2"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span></div></div>' +
      (UI.isNew(o.date || o.ts) ? '<span class="lst-new">NEW</span>' : '') + '</li>';
  }
  function bindRows(root) {
    root.querySelectorAll('.lst-row').forEach(function (r) {
      var go = function () { location.href = r.getAttribute('data-go'); };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  /* ================= 홈 ================= */
  function renderHome() {
    UI.setActiveNav('home');
    UI.fillBanner($('homeBannerMedia'), 'FPP', S.banners);

    /* 티커 — 최신 패치노트 1개 + 최신 PvP 날짜 항목 */
    var tick = [];
    if (S.patches.length) {
      var np = S.patches[0];
      tick.push('📋 [패치노트] ' + (np.title || '패치노트') + ' · ' + UI.fmtDate(np.date));
    }
    if (S.pvps.length) {
      var latestDate = String(S.pvps[0].date || '');
      S.pvps.filter(function (g) { return String(g.date) === latestDate; }).forEach(function (g) {
        var c = g.charId != null ? findChar(g.charId) : null;
        var nm = (c && c.name) || g.name || '';
        tick.push((nm ? nm + ' ' : '') + (BNAME[g.type] || '수정') + ' · ' + UI.fmtDate(g.date));
      });
    }
    UI.ticker($('homeTicker'), tick);

    var evs = S.events.filter(function (e) {
      return e.status === 'ing' && (e.title || e.content || e.image);
    });
    var noEv = !evs.length;
    var patchBox = $('homePatchBox');
    if (patchBox) patchBox.classList.toggle('no-event', noEv);

    /* 1) 패치노트 — 이벤트 없으면 데스크톱에서 확장·12개 */
    var pl = $('homePatchList');
    if (!S.patches.length) UI.empty(pl, { title: '등록된 패치노트가 없습니다.' });
    else {
      var n = (noEv && window.matchMedia('(min-width:768px)').matches) ? 12 : 5;
      pl.innerHTML = '<ul class="lst">' + S.patches.slice(0, n).map(function (p) {
        return rowHTML({ page: 'Community.html#patch/view/' + p.docId, badge: '<span class="badge badge--patch">패치노트</span>', title: p.title, author: p.author, date: p.date, ts: p.ts });
      }).join('') + '</ul>';
      bindRows(pl);
    }

    /* 2) PvP 패치 — 최신 날짜 아이콘 그리드 (데스크톱 12 / 모바일 8) */
    var pg = $('homePvpGrid');
    var bcls = { buff: 'badge--buff', nerf: 'badge--nerf', fix: 'badge--fix' };
    var orbs = S.pvps.slice(0, 12);
    if (S.pvps.length) {
      var d0 = String(S.pvps[0].date || '');
      orbs = S.pvps.filter(function (g) { return String(g.date) === d0; }).slice(0, 12);
    }
    if (!orbs.length) UI.empty(pg, { title: 'PvP 패치 내역이 없습니다.' });
    else {
      pg.innerHTML = orbs.map(function (o, i) {
        var c = o.charId != null ? findChar(o.charId) : null;
        var nm = (c && c.name) || o.name || ('No.' + o.charId);
        var img = (c && c.image) || o.image || UI.PLACEHOLDER_IMG;
        return '<button class="orb" type="button" data-i="' + i + '" aria-label="' + UI.esc(nm) + ' — ' + BNAME[o.type] + '">' +
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
          '<span class="orb-badge badge ' + (bcls[o.type] || 'badge--fix') + '" aria-hidden="true">' + (BSYM[o.type] || '✦') + '</span></span>' +
          '<span class="orb-name">' + UI.esc(nm) + '</span></button>';
      }).join('');
      pg.querySelectorAll('.orb').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = orbs[Number(b.getAttribute('data-i'))];
          route('pvp');
          openPvpPatchDetail(o);
        });
      });
    }

    /* 3) 이벤트 — 카드 1개씩 노출, 2개 이상이면 > 버튼 순환 */
    var evBox = $('homeEventBox'), evRoll = $('homeEventRoll');
    if (noEv) {
      if (evBox) evBox.hidden = true;
    } else {
      evBox.hidden = false;
      evRoll.className = 'ev-stage';
      var evItems = evs.slice(0, 8);
      evRoll.innerHTML = evItems.map(function (e, i) {
        var banner = e.image
          ? '<img src="' + UI.esc(e.image) + '" alt="" loading="' + (i === 0 ? 'eager' : 'lazy') + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          : '';
        return '<article class="ev-card' + (i === 0 ? ' on' : '') + '" data-ev="' + UI.esc(e.docId) + '" role="button" tabindex="' + (i === 0 ? '0' : '-1') + '" aria-label="' + UI.esc(e.title) + '">' +
          '<div class="ev-banner">' + banner +
          '<span class="ev-banner-ph"' + (e.image ? ' style="display:none"' : '') + ' aria-hidden="true"></span></div>' +
          '<span class="badge badge--ing">진행중</span>' +
          '<div class="ev-info"><b>' + UI.esc(e.title) + '</b>' +
          '<div class="ev-meta"><span>' + UI.esc(e.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(e.date)) + '</span></div></div>' +
          '</article>';
      }).join('') +
      (evItems.length > 1
        ? '<div class="ev-nav">' +
          '<span class="ev-count" aria-hidden="true">1 / ' + evItems.length + '</span>' +
          '<div class="ev-dots">' + evItems.map(function (_, i) { return '<button class="ev-dot' + (i === 0 ? ' on' : '') + '" type="button" aria-label="이벤트 ' + (i + 1) + '"></button>'; }).join('') + '</div>' +
          '<button class="ev-next" type="button" aria-label="다음 이벤트"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
          '</div>'
        : '');
      var evSlides = evRoll.querySelectorAll('.ev-card');
      var evDots = evRoll.querySelectorAll('.ev-dot');
      var evCount = evRoll.querySelector('.ev-count');
      var evIdx = 0;
      function showSlide(n) {
        var next = ((n % evSlides.length) + evSlides.length) % evSlides.length;
        if (next === evIdx) return;
        var cur = evSlides[evIdx];
        cur.classList.remove('on');
        cur.classList.add('leave');
        cur.setAttribute('tabindex', '-1');
        setTimeout(function () { cur.classList.remove('leave'); }, 460);
        evIdx = next;
        evSlides[evIdx].classList.add('on');
        evSlides[evIdx].setAttribute('tabindex', '0');
        evDots.forEach(function (d, j) { d.classList.toggle('on', j === evIdx); });
        if (evCount) evCount.textContent = (evIdx + 1) + ' / ' + evSlides.length;
      }
      var evNext = evRoll.querySelector('.ev-next');
      if (evNext) evNext.addEventListener('click', function (e2) { e2.stopPropagation(); showSlide(evIdx + 1); });
      evDots.forEach(function (d, j) { d.addEventListener('click', function (e2) { e2.stopPropagation(); showSlide(j); }); });
      evSlides.forEach(function (cc) {
        var go = function () { location.href = 'Community.html#event/view/' + cc.getAttribute('data-ev'); };
        cc.addEventListener('click', go);
        cc.addEventListener('keydown', function (e2) { if (e2.key === 'Enter') go(); });
      });
    }

    /* 4) 게시판 — 최대 5개 */
    var bl = $('homeBoardList');
    if (!S.boards.length) UI.empty(bl, { title: '게시글이 없습니다.' });
    else {
      var CAT_CLS = { '자유': 'badge--free', '정보': 'badge--info', '질문': 'badge--q', '자랑': 'badge--brag' };
      bl.innerHTML = '<ul class="lst">' + S.boards.slice(0, 5).map(function (b) {
        return rowHTML({ page: 'Community.html#board/view/' + b.docId, badge: '<span class="badge ' + (CAT_CLS[b.category] || 'badge--free') + '">' + UI.esc(b.category) + '</span>', title: b.title, author: b.author, date: b.date, ts: b.ts });
      }).join('') + '</ul>';
      bindRows(bl);
    }
    UI.watchReveals($('view-home'));
  }

  /* ================= 캐릭터 ================= */
  function setTab(tab) {
    F.tab = tab;
    var tc = $('charTabChar'), ts = $('charTabSupport');
    if (tc) { tc.classList.toggle('is-on', tab === 'char'); tc.setAttribute('aria-selected', String(tab === 'char')); }
    if (ts) { ts.classList.toggle('is-on', tab === 'support'); ts.setAttribute('aria-selected', String(tab === 'support')); }
    var isSupport = tab === 'support';
    ['fAttr', 'fType'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = isSupport ? 'none' : '';
    });
    if (isSupport) { F.attr = 'all'; F.type = 'all'; }
  }
  function syncFavBtn() {
    var b = $('fFav');
    if (b) { b.classList.toggle('is-on', F.fav); b.setAttribute('aria-pressed', String(F.fav)); }
  }
  function fillSelect(sel, options, allLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="all">' + allLabel + '</option>' +
      options.map(function (o) { return '<option value="' + UI.esc(o) + '">' + UI.esc(o) + '</option>'; }).join('');
  }
  function buildFilterOptions() {
    var src = F.tab === 'support' ? S.supports : S.chars;
    var grades = [], attrs = [], types = [];
    src.forEach(function (c) {
      if (c.grade && grades.indexOf(c.grade) < 0) grades.push(c.grade);
      var al = charAttrLabel(c);
      if (al && attrs.indexOf(al) < 0) attrs.push(al);
      if (c.battleType && types.indexOf(c.battleType) < 0) types.push(c.battleType);
    });
    grades.sort();
    fillSelect($('fGrade'), grades, '등급 전체');
    fillSelect($('fAttr'), attrs, '속성 전체');
    fillSelect($('fType'), types, '타입 전체');
    var sortSel = $('fSort');
    if (sortSel) {
      sortSel.innerHTML = '<option value="id">번호순</option><option value="name">이름순</option><option value="grade">등급순</option>';
      sortSel.value = F.sort;
    }
    if ($('fGrade')) $('fGrade').value = F.grade;
    if ($('fAttr')) $('fAttr').value = F.attr;
    if ($('fType')) $('fType').value = F.type;
  }
  function sortChars(list, sort) {
    var arr = list.slice();
    if (sort === 'name') arr.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ko'); });
    else if (sort === 'grade') {
      var order = { SS: 0, S: 1, A: 2, B: 3, C: 4 };
      arr.sort(function (a, b) {
        return (order[a.grade] == null ? 9 : order[a.grade]) - (order[b.grade] == null ? 9 : order[b.grade]);
      });
    } else arr.sort(function (a, b) { return (Number(b.id) || 0) - (Number(a.id) || 0); });
    return arr;
  }
  function renderChars() {
    var grid = $('charGrid');
    if (!grid) return;
    UI.setActiveNav('characters');
    var kind = F.tab === 'support' ? 'support' : 'char';
    var list = (F.tab === 'support' ? S.supports : S.chars).slice();
    if (F.grade !== 'all') list = list.filter(function (c) { return c.grade === F.grade; });
    if (F.tab !== 'support') {
      if (F.attr !== 'all') list = list.filter(function (c) { return charAttrLabel(c) === F.attr; });
      if (F.type !== 'all') list = list.filter(function (c) { return c.battleType === F.type; });
    }
    if (F.fav) list = list.filter(function (c) { return UI.isFav(kind, c.id); });
    if (F.q) {
      var q = F.q.toLowerCase();
      list = list.filter(function (c) { return String(c.name || '').toLowerCase().indexOf(q) > -1; });
    }
    list = sortChars(list, F.sort);

    if (!list.length) {
      grid.innerHTML = '';
      UI.empty(grid, {
        title: F.fav ? '즐겨찾기한 캐릭터가 없습니다.' : '조건에 맞는 캐릭터가 없습니다.',
        desc: F.fav ? '카드의 ☆ 버튼을 눌러 추가해 보세요.' : '필터를 조정해 보세요.'
      });
      return;
    }

    grid.innerHTML = list.map(function (c) {
      var attrCls = charAttrClass(c);
      var bt = c.battleType;
      var favOn = UI.isFav(kind, c.id);
      return '<article class="char-card rv' + (c.grade ? ' grade-' + UI.esc(c.grade) : '') + (attrCls ? ' ' + attrCls : '') + '" data-id="' + UI.esc(c.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(c.name) + '">' +
        '<div class="char-card-img-wrap">' +
        (c.image ? '<img src="' + UI.esc(c.image) + '" alt="' + UI.esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : '') +
        '<div class="char-card-placeholder"' + (c.image ? ' style="display:none"' : '') + '>' + UI.esc((c.name || '?').charAt(0)) + '</div>' +
        (attrCls ? '<div class="char-badge ' + attrCls + '" aria-hidden="true"></div>' : '') +
        ((attrCls || bt) ? '<div class="char-card-icons">' +
          (attrCls ? '<img class="char-attr-icon" src="' + attrIconSrc(attrCls) + '" alt="' + UI.esc(charAttrLabel(c)) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
          (bt && typeIconSrc(bt) ? '<img class="char-type-icon" src="' + typeIconSrc(bt) + '" alt="' + UI.esc(bt) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
          '</div>' : '') +
        (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
        '<button class="char-fav-btn' + (favOn ? ' active' : '') + '" data-fav="' + UI.esc(String(c.id)) + '" aria-pressed="' + favOn + '" aria-label="즐겨찾기" type="button">' + (favOn ? '★' : '☆') + '</button>' +
        '</div><div class="char-card-name">' + UI.esc(c.name) + '</div></article>';
    }).join('');

    grid.querySelectorAll('.char-card').forEach(function (card) {
      var id = card.getAttribute('data-id');
      var open = function () { openCharPanel(findChar(id, F.tab) || { id: id, name: '캐릭터' + id }, F.tab === 'support'); };
      card.addEventListener('click', function (e) { if (e.target.closest('.char-fav-btn')) return; open(); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    });
    grid.querySelectorAll('[data-fav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-fav');
        var key = /^-?\d+$/.test(String(id)) ? Number(id) : id;
        var willBeOn = !UI.isFav(kind, key);
        UI.toggleFav(kind, key).then(function () {
          b.classList.toggle('active', willBeOn);
          b.textContent = willBeOn ? '★' : '☆';
          b.setAttribute('aria-pressed', String(willBeOn));
          if (F.fav) renderChars();
        });
      });
    });
    UI.watchReveals($('view-characters'));
  }

  /* ================= 캐릭터 정보 슬라이드 패널 ================= */
  var CP = null;
  function ensureCharPanel() {
    if ($('cpPanel')) return;
    var back = document.createElement('div');
    back.className = 'cp-backdrop';
    back.id = 'cpBackdrop';
    var panel = document.createElement('aside');
    panel.className = 'cp-panel';
    panel.id = 'cpPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="cp-head">' +
      '<h3 class="cp-name" id="cpName"></h3>' +
      '<button class="cp-close" id="cpClose" type="button" aria-label="닫기">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="cp-hero">' +
      '<span class="cp-ava" id="cpAva"></span>' +
      '<div class="cp-side"><div class="cp-meta" id="cpMeta"></div>' +
      '<button class="cp-fav" id="cpFav" type="button"><span id="cpFavTx">☆ 즐겨찾기 추가</span></button></div>' +
      '</div>' +
      '<div class="cp-tabs" id="cpTabs" role="tablist">' +
      '<button class="cp-tab is-on" data-cpt="skills" type="button" role="tab">스킬</button>' +
      '<button class="cp-tab" data-cpt="support" type="button" role="tab">서폿 스킬</button>' +
      '<button class="cp-tab" data-cpt="tips" type="button" role="tab">캐릭터 팁</button>' +
      '<button class="cp-tab" data-cpt="patches" type="button" role="tab">최근패치</button>' +
      '</div>' +
      '<div class="cp-scroll">' +
      '<div class="cp-body" id="cpBody"></div>' +
      '</div>' +
      '<div class="cp-related" id="cpRelated">' +
      '<div class="cp-related-head">관련 캐릭터 <small id="cpRelCount"></small></div>' +
      '<div class="cp-related-icons" id="cpRelatedIcons"></div>' +
      '</div>';
    document.body.appendChild(back);
    document.body.appendChild(panel);

    back.addEventListener('click', closeCharPanel);
    panel.querySelector('#cpClose').addEventListener('click', closeCharPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('cpPanel') && $('cpPanel').classList.contains('open')) closeCharPanel();
    });
    panel.querySelectorAll('.cp-tab').forEach(function (tb) {
      tb.addEventListener('click', function () {
        if (!CP) return;
        CP.tab = tb.getAttribute('data-cpt');
        panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x === tb); });
        renderCpBody();
      });
    });
    panel.querySelector('#cpFav').addEventListener('click', function () {
      if (!CP || !CP.c) return;
      var kind = CP.support ? 'support' : 'char';
      UI.toggleFav(kind, CP.c.id).then(paintCpFav);
    });
  }
  function cpSectionHTML(items) {
    if (!items || !items.length) return '<p class="cp-empty">등록된 내용이 없습니다.</p>';
    return '<ul class="cp-list">' + items.map(function (s) {
      var nm = typeof s === 'string' ? s : (s.name || '');
      var ds = typeof s === 'string' ? '' : (s.desc || s.description || '');
      return '<li><b>' + UI.esc(nm) + '</b>' + (ds ? '<small>' + UI.esc(ds) + '</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  /* ---------- 꿀팁 헬퍼 ---------- */
  function tipDateStr(ts) {
    if (!ts) return '';
    try {
      var d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
      if (isNaN(d.getTime())) return '';
      var p = function (n) { return String(n).padStart(2, '0'); };
      return d.getFullYear() + '.' + p(d.getMonth() + 1) + '.' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
    } catch (e) { return ''; }
  }
  function bestBadge(rank, likeCount) {
    if (!likeCount || likeCount <= 0) return '';
    if (rank === 1) return '<span class="tip-best best-1">BEST 1</span>';
    if (rank === 2) return '<span class="tip-best best-2">BEST 2</span>';
    if (rank === 3) return '<span class="tip-best best-3">BEST 3</span>';
    if (rank <= 5) return '<span class="tip-best best-rest">BEST</span>';
    return '';
  }
  function tipAvaHTML(t) {
    var name = t.author || '?';
    var initial = UI.esc(name.charAt(0));
    if (t.photo) {
      return '<img class="tip-ava-img" src="' + UI.esc(t.photo) + '" alt="" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' +
        '<span class="tip-ava-initial" style="display:none">' + initial + '</span>';
    }
    return '<span class="tip-ava-initial">' + initial + '</span>';
  }
  function tipRowHTML(t, i, uid, rankMap) {
    var isOwn = !!uid && !!t.authorUid && t.authorUid === uid;
    var likeCount = (t.likedBy || []).length;
    var dislikeCount = (t.dislikedBy || []).length;
    var isLiked = !!uid && (t.likedBy || []).indexOf(uid) > -1;
    var isDisliked = !!uid && (t.dislikedBy || []).indexOf(uid) > -1;
    var rank = (rankMap && rankMap[t.docId]) || 0;
    var dateStr = tipDateStr(t.createdAt);
    var voteDisabled = !uid ? ' disabled title="로그인 후 이용 가능"' : '';
    var html = '<li class="tip-row' + (isOwn ? ' tip-row--own' : '') + '" data-tipid="' + UI.esc(t.docId) + '">' +
      '<span class="tip-ava">' + tipAvaHTML(t) + '</span>' +
      '<div class="tip-main">' +
      '<div class="tip-top">' + bestBadge(rank, likeCount) +
      '<b>' + UI.esc(t.author || '선원') + '</b>' +
      (dateStr ? '<time>' + UI.esc(dateStr) + '</time>' : '') + '</div>' +
      '<p class="tip-txt">' + UI.escBr(t.text) + '</p>' +
      '<div class="tip-foot">' +
      '<button class="tip-vote' + (isLiked ? ' on' : '') + '" data-vote="like" type="button"' + voteDisabled + ' aria-label="좋아요">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>' +
      '<span>' + likeCount + '</span></button>' +
      '<button class="tip-vote tip-vote--down' + (isDisliked ? ' on' : '') + '" data-vote="dislike" type="button"' + voteDisabled + ' aria-label="싫어요">' +
      '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>' +
      '<span>' + dislikeCount + '</span></button>' +
      '</div></div>';
    if (isOwn) { /* 내 팁이면 원격·로컬 저장 구분 없이 수정/삭제 가능 */
      html += '<div class="tip-own">' +
        '<button class="tip-act tip-edit" type="button" aria-label="수정"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.4-9.4a2 2 0 1 1 2.8 2.8L11.8 15H9v-2.8l8.6-8.6z" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        '<button class="tip-act tip-del" type="button" aria-label="삭제"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12" stroke-linecap="round"/></svg></button>' +
        '</div>';
    }
    return html + '</li>';
  }
  function tipWriteHTML() {
    var u = UI.currentUser();
    if (!u) {
      return '<div class="tip-write tip-login"><span>로그인하면 이 캐릭터의 꿀팁을 남길 수 있습니다.</span>' +
        '<a class="btn btn--gold btn--sm" href="Login.html">로그인</a></div>';
    }
    var ud = UI.userDoc() || {};
    return '<div class="tip-write">' +
      '<div class="tip-write-head"><span class="tip-ava">' + tipAvaHTML({ photo: '', author: ud.nickname || '나' }) + '</span><b>꿀팁 작성</b></div>' +
      '<textarea class="tip-input" id="tipInput" maxlength="200" rows="3" placeholder="이 캐릭터를 잘 쓰는 나만의 꿀팁을 공유해 주세요. (최대 200자)"></textarea>' +
      '<div class="tip-write-foot"><span class="tip-count" id="tipCount">0 / 200</span>' +
      '<button class="btn btn--gold btn--sm" id="tipSubmit" type="button">등록하기</button></div>' +
      '</div>';
  }
  function renderTipsTab(c) {
    var body = $('cpBody');
    var uid = UI.currentUser() ? UI.currentUser().uid : null;
    body.innerHTML = '<p class="cp-empty">꿀팁을 불러오는 중…</p>';
    FB.getCharTips(c.id).then(function (remote) {
      var all = (c.tips || []).concat(remote || []);
      /* 좋아요순 순위 맵 (BEST 배지용) */
      var sorted = all.slice().sort(function (a, b) {
        var la = (a.likedBy || []).length, lb = (b.likedBy || []).length;
        return lb - la || (tipDateStr(b.createdAt) < tipDateStr(a.createdAt) ? -1 : 1);
      });
      var rankMap = {};
      sorted.forEach(function (t, i) { rankMap[t.docId] = i + 1; });
      var html = '';
      if (!all.length) html = '<p class="cp-empty">아직 등록된 꿀팁이 없습니다.<br>첫 꿀팁의 주인공이 되어보세요!</p>';
      else html = '<ul class="tip-list">' + all.map(function (t) { return tipRowHTML(t, 0, uid, rankMap); }).join('') + '</ul>';
      body.innerHTML = tipWriteHTML() + html; /* 작성 폼이 목록 상단에 위치 */
      body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
      bindTipWrite(c);
      bindTipActions(c, uid);
    }).catch(function () {
      body.innerHTML = tipWriteHTML() + '<ul class="tip-list">' + (c.tips || []).map(function (t) { return tipRowHTML(t, 0, uid, {}); }).join('') + '</ul>';
      bindTipWrite(c);
      bindTipActions(c, uid);
    });
  }
  function bindTipWrite(c) {
    var u = UI.currentUser();
    if (!u) return;
    var input = $('tipInput'), submit = $('tipSubmit'), count = $('tipCount');
    if (!input || !submit) return;
    input.addEventListener('input', function () { count.textContent = input.value.length + ' / 200'; });
    submit.addEventListener('click', function () {
      var v = input.value.trim();
      if (!v) { UI.toast('꿀팁 내용을 입력해 주세요.', 'err'); input.focus(); return; }
      if (v.length > 200) { UI.toast('200자를 넘을 수 없습니다.', 'err'); return; }
      submit.disabled = true; submit.textContent = '등록 중…';
      FB.addCharTip(c.id, v, u, UI.userDoc()).then(function (res) {
        UI.toast(res.remote ? '꿀팁이 등록되었습니다.' : '꿀팁이 이 기기에 저장되었습니다.', 'ok');
        renderTipsTab(c);
      }).catch(function (e) {
        submit.disabled = false; submit.textContent = '등록하기';
        UI.toast(FB.errMsg(e), 'err');
      });
    });
  }
  function bindTipActions(c, uid) {
    var body = $('cpBody');
    if (!body) return;
    /* 투표 */
    body.querySelectorAll('[data-vote]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!uid) return;
        var row = btn.closest('.tip-row');
        var docId = row.getAttribute('data-tipid');
        FB.toggleTipVote(docId, uid, btn.getAttribute('data-vote')).then(function () {
          renderTipsTab(c);
        }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
      });
    });
    /* 수정 */
    body.querySelectorAll('.tip-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.tip-row');
        var docId = row.getAttribute('data-tipid');
        var txt = row.querySelector('.tip-txt');
        if (!txt || row.querySelector('.tip-edit-wrap')) return;
        var own = row.querySelector('.tip-own');
        if (own) own.style.display = 'none';
        var ta = document.createElement('textarea');
        ta.className = 'tip-input tip-edit-area';
        ta.maxLength = 200; ta.rows = 3;
        ta.value = txt.textContent;
        var actions = document.createElement('div');
        actions.className = 'tip-edit-actions';
        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn--ghost btn--sm'; cancelBtn.type = 'button'; cancelBtn.textContent = '취소';
        var saveBtn = document.createElement('button');
        saveBtn.className = 'btn btn--gold btn--sm'; saveBtn.type = 'button'; saveBtn.textContent = '저장';
        actions.appendChild(cancelBtn); actions.appendChild(saveBtn);
        var wrap = document.createElement('div');
        wrap.className = 'tip-edit-wrap';
        wrap.appendChild(ta); wrap.appendChild(actions);
        txt.replaceWith(wrap);
        ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length;
        cancelBtn.addEventListener('click', function () { renderTipsTab(c); });
        saveBtn.addEventListener('click', function () {
          var nv = ta.value.trim();
          if (!nv) { ta.focus(); return; }
          saveBtn.disabled = true; saveBtn.textContent = '저장 중…';
          FB.updateCharTip(docId, nv).then(function () {
            UI.toast('꿀팁이 수정되었습니다.', 'ok');
            renderTipsTab(c);
          }).catch(function (e) {
            saveBtn.disabled = false; saveBtn.textContent = '저장';
            UI.toast(FB.errMsg(e), 'err');
          });
        });
      });
    });
    /* 삭제 */
    body.querySelectorAll('.tip-del').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('.tip-row');
        var docId = row.getAttribute('data-tipid');
        var m = UI.openModal({
          cls: 'modal-center',
          title: '꿀팁 삭제',
          body: '<p style="font-size:14px;line-height:1.7;text-align:center">이 꿀팁을 삭제하시겠습니까?<br><b style="color:var(--red)">삭제된 꿀팁은 복구할 수 없습니다.</b></p>' +
            '<div style="display:flex;gap:8px;margin-top:16px">' +
            '<button class="btn btn--ghost btn--block" id="tipDelNo" type="button">취소</button>' +
            '<button class="btn btn--danger btn--block" id="tipDelYes" type="button">삭제</button></div>'
        });
        m.body.querySelector('#tipDelNo').addEventListener('click', m.close);
        m.body.querySelector('#tipDelYes').addEventListener('click', function () {
          FB.deleteCharTip(docId).then(function () {
            m.close();
            UI.toast('꿀팁이 삭제되었습니다.', 'ok');
            renderTipsTab(c);
          }).catch(function (e) { m.close(); UI.toast(FB.errMsg(e), 'err'); });
        });
      });
    });
  }
  function cpPatchesHTML(c) {
    var items = [];
    S.pvps.forEach(function (g) {
      if (String(g.charId) === String(c.id)) {
        g.items.forEach(function (it) {
          items.push({ type: g.type, date: g.date, text: it.text || '' });
        });
      }
    });
    if (c.recentPatches && c.recentPatches.length) {
      c.recentPatches.forEach(function (p) { items.push({ type: p.type || 'fix', date: p.date || '', text: typeof p === 'string' ? p : (p.text || '') }); });
    }
    if (!items.length) return '<p class="cp-empty">패치 내역이 없습니다.</p>';
    /* 날짜별 그룹핑 — 날짜 내림차순, 날짜 없는 항목은 '기타' 그룹으로 */
    var buckets = {}, order = [];
    items.forEach(function (it) {
      var d = it.date || '';
      if (!buckets[d]) { buckets[d] = []; order.push(d); }
      buckets[d].push(it);
    });
    order.sort(function (a, b) { return b.localeCompare(a); });
    var shown = order.filter(function (d) { return d !== ''; }).slice(0, 5); /* 최신 5개 날짜 */
    if (buckets['']) shown = shown.concat(['']);
    return '<div class="pvp-date-groups">' + shown.map(function (d) {
      var head = d
        ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>' + UI.esc(UI.fmtDate(d)) + ' <span class="pg-count">' + buckets[d].length + '건</span>'
        : '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>기타';
      return '<div class="pvp-date-group"><div class="pg-head">' + head + '</div>' +
        '<ul class="cp-list">' + buckets[d].map(function (it) {
          return '<li class="cp-patch-row cp-patch-row--' + (it.type || 'fix') + '"><b>' + (BSYM[it.type] || '✦') + ' ' + UI.esc(BNAME[it.type] || '패치') + '</b>' +
            '<small>' + UI.escBr(it.text) + '</small></li>';
        }).join('') + '</ul></div>';
    }).join('') + '</div>';
  }
  function renderCpBody() {
    if (!CP) return;
    var c = CP.c;
    var body = $('cpBody');
    if (CP.tab === 'skills') body.innerHTML = cpSectionHTML(c.skills);
    else if (CP.tab === 'support') body.innerHTML = cpSectionHTML(c.supportSkills);
    else if (CP.tab === 'tips') { renderTipsTab(c); return; } /* 비동기 — 내부에서 렌더·애니메이션 처리 */
    else body.innerHTML = cpPatchesHTML(c);
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  }
  /* 이름 정규화 — 괄호 안 표기(니카/스네이크맨 등)는 매칭에서 제외 */
  function nameKey(n) {
    var s = String(n || '');
    s = s.replace(/\([^)]*\)/g, '').replace(/（[^）]*）/g, '');
    s = s.replace(/\[[^\]]*\]/g, '').replace(/【[^】]*】/g, '').replace(/《[^》]*》/g, '');
    s = s.replace(/[\s\-·・.,'’"“”!?？:;|/\\~＊*☆★<>]/g, '').toLowerCase();
    if (!s) return '';
    s = s.replace(/(진화|각성|한계돌파|한돌|돌파|초월|개화|한정|콜라보|페스|fes|ex|sp|형태|버전|ver)+$/g, '');
    s = s.replace(/\d+$/g, '');
    return s;
  }
  function isRelatedName(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var ka = nameKey(a), kb = nameKey(b);
    if (ka && kb) {
      if (ka === kb) return true;
      if (ka.length >= 2 && kb.length >= 2 && (ka.indexOf(kb) > -1 || kb.indexOf(ka) > -1)) return true;
    }
    /* 검색과 동일한 원문 포함 관계 매칭 */
    var la = String(a).toLowerCase(), lb = String(b).toLowerCase();
    if (la.length >= 2 && lb.length >= 2 && (la.indexOf(lb) > -1 || lb.indexOf(la) > -1)) return true;
    return false;
  }
  function renderCpRelated() {
    var box = $('cpRelatedIcons');
    var wrap = $('cpRelated');
    if (!CP || !CP.c) { wrap.hidden = true; return; }
    var name = CP.c.name;
    var seen = {};
    var rel = S.chars.concat(S.supports).filter(function (x) {
      if (String(x.id) === String(CP.c.id)) return false;
      if (!isRelatedName(x.name, name)) return false;
      if (seen[String(x.id)]) return false;
      seen[String(x.id)] = true;
      return true;
    }).slice(0, 16);
    if (!rel.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var cnt = $('cpRelCount');
    if (cnt) cnt.textContent = rel.length + '명';
    box.innerHTML = rel.map(function (r) {
      var nm = r.name || '';
      var fc = (nm || '?').charAt(0);
      return '<button class="cp-rel" type="button" data-rid="' + UI.esc(r.id) + '" aria-label="' + UI.esc(nm) + '">' +
        '<span class="cp-rel-circle">' +
        '<span class="cp-rel-img">' +
        /* 폴백(첫 글자)은 기본적으로 숨김 — 이미지 로드 실패 시에만 onerror로 표시.
           이미지가 정상일 때는 절대 텍스트가 위에 겹쳐 보이지 않는다. */
        '<span class="cp-rel-ph" style="display:none" aria-hidden="true">' + UI.esc(fc) + '</span>' +
        '<img src="' + UI.esc(r.image || UI.PLACEHOLDER_IMG) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';var p=this.parentNode.querySelector(\'.cp-rel-ph\');if(p)p.style.display=\'flex\'">' +
        '</span>' +
        (r.grade ? '<span class="cp-rel-grade grade-' + UI.esc(r.grade) + '">' + UI.esc(r.grade) + '</span>' : '') +
        '</span>' +
        '<span class="cp-rel-name">' + UI.esc(nm) + '</span>' +
        '</button>';
    }).join('');
    box.querySelectorAll('.cp-rel').forEach(function (b) {
      b.addEventListener('click', function () {
        var rid = b.getAttribute('data-rid');
        var next = S.chars.concat(S.supports).filter(function (x) { return String(x.id) === String(rid); })[0];
        if (next) openCharPanel(next);
      });
    });
  }
  function paintCpFav() {
    if (!CP || !CP.c) return;
    var on = UI.isFav(CP.support ? 'support' : 'char', CP.c.id);
    var btn = $('cpFav');
    btn.classList.toggle('on', on);
    $('cpFavTx').textContent = on ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  }
  function isSupportChar(c) {
    var inSupport = S.supports.filter(function (x) { return String(x.id) === String(c.id); }).length > 0;
    var inChars = S.chars.filter(function (x) { return String(x.id) === String(c.id); }).length > 0;
    return inSupport && !inChars;
  }
  function openCharPanel(c, supportOverride) {
    ensureCharPanel();
    var support = (supportOverride === true) || (supportOverride === false ? false : isSupportChar(c));
    CP = { c: c, tab: support ? 'support' : 'skills', support: support };
    var panel = $('cpPanel'), back = $('cpBackdrop');
    var wasOpen = panel.classList.contains('open');
    var skillsTab = panel.querySelector('.cp-tab[data-cpt="skills"]');
    if (skillsTab) skillsTab.style.display = support ? 'none' : '';
    $('cpName').textContent = c.name || '이름 미상';
    $('cpAva').innerHTML = '<img src="' + UI.esc(c.image || UI.PLACEHOLDER_IMG) + '" alt="' + UI.esc(c.name || '') + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">';
    var attrCls = charAttrClass(c);
    var attrSrc = attrCls ? attrIconSrc(attrCls) : '';
    var typeSrc = c.battleType ? typeIconSrc(c.battleType) : '';
    $('cpMeta').innerHTML =
      (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
      (attrSrc ? '<img class="cp-ic" src="' + attrSrc + '" alt="' + UI.esc(charAttrLabel(c)) + '" title="속성: ' + UI.esc(charAttrLabel(c)) + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '') +
      (typeSrc ? '<img class="cp-ic" src="' + typeSrc + '" alt="' + UI.esc(c.battleType) + '" title="타입: ' + UI.esc(c.battleType) + '" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '');
    paintCpFav();
    panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-cpt') === CP.tab); });
    renderCpBody();
    renderCpRelated();
    back.classList.add('open');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (!wasOpen) UI.lockBody();
  }
  function closeCharPanel() {
    var panel = $('cpPanel'), back = $('cpBackdrop');
    if (!panel) return;
    back.classList.remove('open');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    UI.unlockBody();
  }

  /* ================= PvP 패치 ================= */
  function pvpDates() {
    var seen = {};
    return S.pvps.map(function (g) { return String(g.date || ''); })
      .filter(function (d) { if (!d || seen[d]) return false; seen[d] = 1; return true; })
      .sort()
      .reverse();
  }
  function renderPvpDateFilter() {
    var btn = $('pvpDateBtn'), list = $('pvpDateList'), tx = $('pvpDateText');
    if (!btn || !list) return;
    var dates = pvpDates();
    if (!dates.length) {
      pvpSelDate = '';
      if (tx) tx.textContent = '날짜 없음';
      list.innerHTML = '';
      return;
    }
    if (!pvpSelDate || dates.indexOf(pvpSelDate) < 0) pvpSelDate = dates[0];
    if (tx) tx.textContent = UI.fmtDate(pvpSelDate);
    list.innerHTML = dates.map(function (d) {
      return '<button class="pvp-date-item' + (d === pvpSelDate ? ' is-on' : '') + '" data-d="' + UI.esc(d) + '" type="button" role="option">' + UI.esc(UI.fmtDate(d)) + '</button>';
    }).join('');
    list.querySelectorAll('.pvp-date-item').forEach(function (b) {
      b.addEventListener('click', function () {
        pvpSelDate = b.getAttribute('data-d');
        closePvpDate();
        renderPvpDateFilter();
        renderPvpCols();
        UI.watchReveals($('view-pvp'));
      });
    });
  }
  function openPvpDate() {
    var l = $('pvpDateList'), b = $('pvpDateBtn');
    if (l) l.hidden = false;
    if (b) { b.setAttribute('aria-expanded', 'true'); b.classList.add('is-open'); }
  }
  function closePvpDate() {
    var l = $('pvpDateList'), b = $('pvpDateBtn');
    if (l) l.hidden = true;
    if (b) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('is-open'); }
  }
  function renderPvpCols() {
    var cols = { buff: $('buffCol'), nerf: $('nerfCol'), fix: $('fixCol') };
    ['buff', 'nerf', 'fix'].forEach(function (kind) {
      var colEl = cols[kind];
      if (!colEl) return;
      var groups = S.pvps.filter(function (g) {
        return g.type === kind && (!pvpSelDate || String(g.date) === pvpSelDate);
      });
      /* 타이틀 우측 인원수 — 해당 타입의 고유 캐릭터 수 */
      var cntEl = $(kind + 'Count');
      if (cntEl) {
        var seen = {}, n = 0;
        groups.forEach(function (g) {
          var key = g.charId != null ? String(g.charId) : g.uid;
          if (!seen[key]) { seen[key] = 1; n++; }
        });
        cntEl.textContent = n + '명';
      }
      if (!groups.length) {
        colEl.innerHTML = '<div class="empty" style="padding:18px 10px"><p>' + BNAME[kind] + ' 내역이 없습니다.</p></div>';
        return;
      }
      colEl.innerHTML = '<div class="pvp-col-grid">' + groups.map(function (g) {
        var c = g.charId != null ? findChar(g.charId) : null;
        var name = (c && c.name) || g.name || ('No.' + g.charId);
        var img = (c && c.image) || g.image || UI.PLACEHOLDER_IMG;
        return '<button class="orb" type="button" data-gid="' + UI.esc(g.uid) + '" aria-label="' + UI.esc(name) + ' (' + BNAME[kind] + ')">' +
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' +
          '<span class="orb-badge badge badge--' + kind + '" aria-hidden="true">' + BSYM[kind] + '</span></span>' +
          '<span class="orb-name">' + UI.esc(name) + '</span></button>';
      }).join('') + '</div>';
      colEl.querySelectorAll('.orb').forEach(function (el) {
        var gid = el.getAttribute('data-gid');
        var g = groups.filter(function (x) { return x.uid === gid; })[0];
        el.addEventListener('click', function () { openPvpPatchDetail(g); });
      });
    });
  }
  function openPvpPatchDetail(g) {
    if (!g) return;
    var c = g.charId != null ? findChar(g.charId) : null;
    var name = (c && c.name) || g.name || ('No.' + g.charId);
    var img = (c && c.image) || g.image || UI.PLACEHOLDER_IMG;
    var same = S.pvps.filter(function (x) {
      return String(x.charId) === String(g.charId) && String(x.date) === String(g.date);
    });
    var sections = ['buff', 'nerf', 'fix'].map(function (k) {
      var groups = same.filter(function (x) { return x.type === k; });
      /* 내용이 없는 섹션은 아예 노출하지 않음 */
      if (!groups.length) return '';
      var body = '<ul class="pvp-list">' + groups.map(function (gr) {
          return gr.items.map(function (it) { return '<li><small>' + UI.escBr(it.text || '') + '</small></li>'; }).join('');
        }).join('') + '</ul>';
      return '<div class="pvp-sec pvp-sec--' + k + '"><h4><span class="badge badge--' + k + '">' + BSYM[k] + '</span> ' + BNAME[k] + '</h4>' + body + '</div>';
    }).filter(Boolean).join('');
    if (!sections) sections = '<p class="cp-empty">등록된 패치 내역이 없습니다.</p>';
    UI.openModal({
      cls: 'pvp-modal',
      title: 'PvP 밸런스 패치',
      body:
      '<div class="pvp-top">' +
      '<span class="pvp-ava"><img src="' + UI.esc(img) + '" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'"></span>' +
      '<div class="pvp-id"><div class="pvp-name">' + UI.esc(name) + '</div>' +
      '<div class="pvp-sub"><span class="badge badge--patch">PvP 패치</span><span class="pvp-modal-date">' + UI.esc(UI.fmtDate(g.date)) + '</span></div></div>' +
      '</div>' + sections
    });
  }
  function renderPvp() {
    UI.setActiveNav('pvp');
    renderPvpDateFilter();
    renderPvpCols();
    UI.watchReveals($('view-pvp'));
  }

  /* ================= 라우팅 ================= */
  var VIEWS = { home: 'view-home', characters: 'view-characters', pvp: 'view-pvp' };
  function route(name, params) {
    name = VIEWS[name] ? name : 'home';
    Object.keys(VIEWS).forEach(function (k) { $(VIEWS[k]).hidden = k !== name; });
    window.scrollTo({ top: 0 });
    if (!S.loaded) return;
    if (name === 'home') renderHome();
    if (name === 'characters') {
      UI.setActiveNav('characters');
      if (params) {
        if (params.tab) setTab(params.tab === 'support' ? 'support' : 'char');
        if (params.fav) { F.fav = true; syncFavBtn(); }
      }
      buildFilterOptions();
      var doRender = function () {
        renderChars();
        if (params && params.char != null) {
          var c = findChar(params.char, F.tab);
          if (c) setTimeout(function () { openCharPanel(c, F.tab === 'support'); }, 80);
        }
      };
      if (F.fav) {
        /* 즐겨찾기 데이터가 준비된 뒤에 렌더링 */
        var fired = false;
        var go = function () { if (!fired) { fired = true; doRender(); } };
        document.addEventListener('fpp:favs-loaded', go);
        UI.loadFavs().then(go);
        setTimeout(go, 4000);
      } else {
        doRender();
      }
    }
    if (name === 'pvp') renderPvp();
  }
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || 'home';
    var qi = h.indexOf('?');
    var name = qi > -1 ? h.slice(0, qi) : h;
    var params = {};
    if (qi > -1) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        params[decodeURIComponent(p[0])] = p[1] ? decodeURIComponent(p[1]) : '1';
      });
    }
    return { name: name, params: params };
  }
  function pageBanners() {
    UI.fillPageBanner($('charBannerMedia'), 'characters', S.banners);
    UI.fillPageBanner($('pvpBannerMedia'), 'pvp', S.banners);
  }

  /* ================= 부팅 ================= */
  function bindCharPage() {
    var tc = $('charTabChar'), ts = $('charTabSupport');
    if (tc) tc.addEventListener('click', function () { setTab('char'); buildFilterOptions(); renderChars(); });
    if (ts) ts.addEventListener('click', function () { setTab('support'); buildFilterOptions(); renderChars(); });
    ['fGrade', 'fAttr', 'fType', 'fSort'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () { F[id.slice(1).toLowerCase()] = el.value; renderChars(); });
    });
    var fav = $('fFav');
    if (fav) fav.addEventListener('click', function () { F.fav = !F.fav; syncFavBtn(); renderChars(); });
    var sch = $('fSearch');
    if (sch) {
      var tm = null;
      sch.addEventListener('input', function () {
        clearTimeout(tm);
        tm = setTimeout(function () { F.q = sch.value.trim(); renderChars(); }, 200);
      });
    }
    var rf = $('fRefresh');
    if (rf) rf.addEventListener('click', function () {
      F.grade = 'all'; F.attr = 'all'; F.type = 'all'; F.sort = 'id'; F.fav = false; F.q = '';
      if (sch) sch.value = '';
      buildFilterOptions(); syncFavBtn(); renderChars();
    });
  }

  function start() {
    bindCharPage();
    UI.skelGrid($('charGrid'), 8);
    UI.skelRows($('homePatchList'), 4);
    UI.skelRows($('homeBoardList'), 4);
    var pg = $('homePvpGrid');
    if (pg) pg.innerHTML = '<div class="skel" style="height:150px;margin:10px"></div>';
    var er = $('homeEventRoll');
    if (er) er.innerHTML = '<div class="skel" style="height:120px;margin:8px"></div>';

    var dbtn = $('pvpDateBtn');
    if (dbtn) {
      dbtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var l = $('pvpDateList');
        if (l && !l.hidden) closePvpDate(); else openPvpDate();
      });
      document.addEventListener('click', function (e) {
        var l = $('pvpDateList');
        if (l && !l.hidden && (!e.target.closest || !e.target.closest('#pvpDateWrap'))) closePvpDate();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePvpDate(); });
    }

    var r = parseHash();
    route(r.name, r.params);

    loadAll().then(function () {
      try {
        pageBanners();
        var r2 = parseHash();
        route(r2.name, r2.params);
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
        UI.toast('화면을 그리는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'err');
      }
    }).catch(function (e) {
      console.error('[FPP] 데이터 로드 실패:', e);
      var msg = (e && e.message === 'Firebase SDK 없음')
        ? 'Firebase SDK를 불러오지 못했습니다. 네트워크를 확인해 주세요.'
        : (FB.errMsg ? FB.errMsg(e) : '오류') + ' — 데이터를 불러오지 못했습니다.';
      UI.toast(msg, 'err');
      ['homePatchList', 'homeBoardList'].forEach(function (id) {
        UI.empty($(id), { title: '데이터를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
      });
      UI.empty($('homePvpGrid'), { title: 'PvP 패치를 불러오지 못했습니다.' });
      UI.empty($('homeEventRoll'), { title: '이벤트를 불러오지 못했습니다.' });
      UI.empty($('charGrid'), { title: '캐릭터를 불러오지 못했습니다.' });
    });

    window.addEventListener('hashchange', function () {
      try {
        var rr = parseHash();
        route(rr.name, rr.params);
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
      }
    });
    document.addEventListener('fpp:fav-changed', function () {
      var vc = $('view-characters');
      if (vc && !vc.hidden) renderChars();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
