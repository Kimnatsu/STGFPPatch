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

  /* 한 컬렉션이 실패해도 나머지는 표시 — 실패한 쪽은 빈 배열로 처리 */
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
      S.patches = r[3]; S.events = r[4]; S.boards = r[5]; S.banners = r[6];
      S.loaded = true;
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
    var a = String(c.attr || c.type || '').toLowerCase();
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
  var REPO = 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/';
  function attrIconSrc(cls) {
    var m = { 'attr-force': 'force', 'attr-ki': 'ki', 'attr-sim': 'sim' };
    return m[cls] ? REPO + 'img/attr/' + m[cls] + '.png' : '';
  }
  function typeIconSrc(bt) {
    var m = { '원소': 'element', 'element': 'element', '검사': 'sword', 'sword': 'sword', '격투': 'fighter', 'fighter': 'fighter', '특수': 'special', 'special': 'special' };
    var k = m[bt];
    return k ? REPO + 'img/type/' + k + '.webp' : '';
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

    /* 티커 — 최신 패치노트 1개 + 최신 PvP 날짜 항목 (속도: ≤5→20s, 6~9→40s, ≥10→60s) */
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

    /* 진행 중이면서 실제 내용(제목·본문·이미지 중 하나라도)이 있는 이벤트만 */
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
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
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

    /* 3) 이벤트 — 진행 중만 롤링, 없으면 Box 숨김 */
    var evBox = $('homeEventBox'), evRoll = $('homeEventRoll');
    if (noEv) {
      if (evBox) evBox.hidden = true;
    } else {
      evBox.hidden = false;
      evRoll.innerHTML = evs.map(function (e) {
        return '<article class="ev-card" data-ev="' + UI.esc(e.docId) + '" role="button" tabindex="0">' +
          '<div class="ev-img">' + (e.image ? '<img src="' + UI.esc(e.image) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '<span class="badge badge--ing">진행중</span></div>' +
          '<div class="ev-tx"><b>' + UI.esc(e.title) + '</b><small>' + UI.esc(UI.fmtDate(e.date)) + '</small></div></article>';
      }).join('');
      var cards = evRoll.querySelectorAll('.ev-card');
      var idx = 0, timer = null;
      function showEv(i) {
        idx = (i + cards.length) % cards.length;
        cards.forEach(function (cc, j) { cc.classList.toggle('on', j === idx); });
      }
      showEv(0);
      if (cards.length > 1) timer = setInterval(function () { showEv(idx + 1); }, 4200);
      evRoll.parentElement.addEventListener('mouseenter', function () { if (timer) clearInterval(timer); });
      evRoll.parentElement.addEventListener('mouseleave', function () {
        if (cards.length > 1 && !timer) timer = setInterval(function () { showEv(idx + 1); }, 4200);
      });
      cards.forEach(function (cc) {
        cc.addEventListener('click', function () { location.href = 'Community.html#event/view/' + cc.getAttribute('data-ev'); });
      });
    }

    /* 4) 커뮤니티 */
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
    if (b) {
      b.classList.toggle('is-on', F.fav);
      b.setAttribute('aria-pressed', String(F.fav));
    }
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
        (c.image ? '<img src="' + UI.esc(c.image) + '" alt="' + UI.esc(c.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : '') +
        '<div class="char-card-placeholder"' + (c.image ? ' style="display:none"' : '') + '>' + UI.esc((c.name || '?').charAt(0)) + '</div>' +
        (attrCls ? '<div class="char-badge ' + attrCls + '" aria-hidden="true"></div>' : '') +
        ((attrCls || bt) ? '<div class="char-card-icons">' +
          (attrCls ? '<img class="char-attr-icon" src="' + attrIconSrc(attrCls) + '" alt="' + UI.esc(charAttrLabel(c)) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          (bt && typeIconSrc(bt) ? '<img class="char-type-icon" src="' + typeIconSrc(bt) + '" alt="' + UI.esc(bt) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '</div>' : '') +
        (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
        '<button class="char-fav-btn' + (favOn ? ' active' : '') + '" data-fav="' + UI.esc(String(c.id)) + '" aria-pressed="' + favOn + '" aria-label="즐겨찾기" type="button">' + (favOn ? '★' : '☆') + '</button>' +
        '</div><div class="char-card-name">' + UI.esc(c.name) + '</div></article>';
    }).join('');

    grid.querySelectorAll('.char-card').forEach(function (card) {
      var id = card.getAttribute('data-id');
      var isSupportTab = F.tab === 'support';
      var open = function () { openCharPanel(findChar(id, F.tab) || { id: id, name: '캐릭터' + id }, isSupportTab); };
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
  var CP = null; /* { c, tab, support } */
  /* 현질 서폿 캐릭터 판별 — 서폿에만 존재하는 캐릭터 */
  function isSupportChar(c) {
    var inSupport = S.supports.some(function (x) { return String(x.id) === String(c.id); });
    var inChars = S.chars.some(function (x) { return String(x.id) === String(c.id); });
    return inSupport && !inChars;
  }
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
      '<div class="cp-related" id="cpRelated">' +
      '<div class="cp-related-head">관련 캐릭터</div>' +
      '<div class="cp-related-icons" id="cpRelatedIcons"></div>' +
      '</div>' +
      '</div>';
    document.body.appendChild(back);
    document.body.appendChild(panel);

    back.addEventListener('click', closeCharPanel);
    panel.querySelector('#cpClose').addEventListener('click', closeCharPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('cpPanel') && $('cpPanel').classList.contains('open')) closeCharPanel();
    });
    panel.querySelectorAll('.cp-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        CP.tab = t.getAttribute('data-cpt');
        panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x === t); });
        renderCpBody();
      });
    });
    panel.querySelector('#cpFav').addEventListener('click', function () {
      if (!CP || !CP.c) return;
      var kind = (S.supports.filter(function (x) { return String(x.id) === String(CP.c.id); }).length &&
        !S.chars.filter(function (x) { return String(x.id) === String(CP.c.id); }).length) ? 'support' : 'char';
      UI.toggleFav(kind, CP.c.id).then(paintCpFav);
    });
  }
  function cpSectionHTML(items) {
    if (!items || !items.length) return '<p class="cp-empty">등록된 내용이 없습니다.</p>';
    return '<ul class="cp-list">' + items.map(function (s) {
      var nm = typeof s === 'string' ? s : (s.name || '');
      var ds = typeof s === 'string' ? '' : (s.desc || s.description || '');
      return '<li><b>' + UI.escBr(nm) + '</b>' + (ds ? '<small>' + UI.escBr(ds) + '</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function cpTipsHTML(c) {
    var tips = c.tips || [];
    if (!tips.length) return '<p class="cp-empty">등록된 팁이 없습니다.</p>';
    return '<ul class="cp-list">' + tips.map(function (t) {
      return '<li><small>' + UI.escBr(typeof t === 'string' ? t : (t.text || '')) + '</small></li>';
    }).join('') + '</ul>';
  }
  /* 최근패치 — 날짜별로 묶고, 가장 최근 5개 날짜분만 노출 */
  function cpPatchesHTML(c) {
    var items = [];
    S.pvps.forEach(function (g) {
      if (String(g.charId) === String(c.id)) {
        g.items.forEach(function (it) {
          items.push({ type: g.type, date: String(g.date || ''), text: it.text || '' });
        });
      }
    });
    if (c.recentPatches && c.recentPatches.length) {
      c.recentPatches.forEach(function (p) { items.push({ type: p.type || 'fix', date: String(p.date || ''), text: typeof p === 'string' ? p : (p.text || '') }); });
    }
    if (!items.length) return '<p class="cp-empty">패치 내역이 없습니다.</p>';

    /* 날짜별 그룹 (내림차순) */
    var byDate = {};
    items.forEach(function (it) {
      var k = it.date || '미상';
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(it);
    });
    var dates = Object.keys(byDate).sort(function (a, b) { return b.localeCompare(a); });
    var recent = dates.slice(0, 5); /* 최근 5개 날짜 */

    var order = { buff: 0, nerf: 1, fix: 2 };
    return recent.map(function (d) {
      var list = byDate[d].slice().sort(function (a, b) {
        return (order[a.type] == null ? 9 : order[a.type]) - (order[b.type] == null ? 9 : order[b.type]);
      });
      return '<div class="cpp-group">' +
        '<div class="cpp-date"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke-linecap="round"/></svg> ' +
        UI.esc(d === '미상' ? '날짜 미상' : UI.fmtDate(d)) +
        '<span class="cpp-cnt">' + list.length + '건</span></div>' +
        '<ul class="cp-list">' + list.map(function (it) {
          return '<li class="cpp-item cpp-item--' + it.type + '"><b>' + (BSYM[it.type] || '✦') + ' ' + UI.esc(BNAME[it.type] || '패치') + '</b>' +
            '<small>' + UI.escBr(it.text) + '</small></li>';
        }).join('') + '</ul></div>';
    }).join('');
  }
  function renderCpBody() {
    if (!CP) return;
    var c = CP.c;
    var body = $('cpBody');
    if (CP.tab === 'skills') body.innerHTML = cpSectionHTML(c.skills);
    else if (CP.tab === 'support') body.innerHTML = cpSectionHTML(c.supportSkills);
    else if (CP.tab === 'tips') body.innerHTML = cpTipsHTML(c);
    else body.innerHTML = cpPatchesHTML(c);
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  }
  /* 이름 정규화 — 공백·기호·버전 표기를 걷어낸다 */
  function nameKey(n) {
    var s = String(n || '').replace(/[\s\-·・.,()（）\[\]【】'’""]/g, '').toLowerCase();
    return s.replace(/(진화|각성|한계돌파|초월|개화|한돌)$/g, '');
  }
  function isRelatedName(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var ka = nameKey(a), kb = nameKey(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    /* 검색과 동일한 포함 관계 매칭 */
    if (ka.length >= 2 && kb.length >= 2 && (ka.indexOf(kb) > -1 || kb.indexOf(ka) > -1)) return true;
    return false;
  }
  function renderCpRelated() {
    var box = $('cpRelatedIcons');
    var wrap = $('cpRelated');
    if (!CP || !CP.c) { wrap.hidden = true; return; }
    var name = CP.c.name;
    var rel = S.chars.concat(S.supports).filter(function (x) {
      return isRelatedName(x.name, name) && String(x.id) !== String(CP.c.id);
    });
    if (!rel.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    box.innerHTML = rel.map(function (r) {
      return '<button class="cp-rel" type="button" data-rid="' + UI.esc(r.id) + '" aria-label="' + UI.esc(r.name) + '">' +
        '<span class="cp-rel-circle">' +
        '<span class="cp-rel-img"><img src="' + UI.esc(r.image || UI.PLACEHOLDER_IMG) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>' +
        (r.grade ? '<span class="cp-rel-grade grade-' + UI.esc(r.grade) + '">' + UI.esc(r.grade) + '</span>' : '') +
        '</span>' +
        '<span class="cp-rel-name">' + UI.esc(r.name) + '</span>' +
        '</button>';
    }).join('');
    box.querySelectorAll('.cp-rel').forEach(function (b) {
      b.addEventListener('click', function () {
        var rid = b.getAttribute('data-rid');
        var next = S.chars.concat(S.supports).filter(function (x) { return String(x.id) === String(rid); })[0];
        if (next) openCharPanel(next, isSupportChar(next));
      });
    });
  }
  function paintCpFav() {
    if (!CP || !CP.c) return;
    var kind = (S.supports.filter(function (x) { return String(x.id) === String(CP.c.id); }).length &&
      !S.chars.filter(function (x) { return String(x.id) === String(CP.c.id); }).length) ? 'support' : 'char';
    var on = UI.isFav(kind, CP.c.id);
    var btn = $('cpFav');
    btn.classList.toggle('on', on);
    $('cpFavTx').textContent = on ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가';
  }
  function openCharPanel(c, supportOverride) {
    ensureCharPanel();
    /* 서폿 탭에서 열었으면 무조건 서폿 구성 — ID 중복과 무관하게 컨텍스트 우선 */
    var support = (supportOverride === true) || (supportOverride === false ? false : isSupportChar(c));
    /* 서폿 캐릭터는 서폿 스킬이 Default, 일반 캐릭터는 스킬이 Default */
    CP = { c: c, tab: support ? 'support' : 'skills', support: support };
    var panel = $('cpPanel'), back = $('cpBackdrop');
    var wasOpen = panel.classList.contains('open'); /* 관련 캐릭터 전환 시 잠금 중복 방지 */
    /* 서폿 캐릭터는 스킬 탭 미노출 */
    var skillsTab = panel.querySelector('.cp-tab[data-cpt="skills"]');
    if (skillsTab) skillsTab.style.display = support ? 'none' : '';
    var attrCls = charAttrClass(c);
    $('cpName').textContent = c.name || '이름 미상';
    $('cpAva').innerHTML = '<img src="' + UI.esc(c.image || UI.PLACEHOLDER_IMG) + '" alt="' + UI.esc(c.name || '') + '" onerror="this.style.display=\'none\'">';
    /* 등급은 파스텔 배지, 속성·타입은 원본 레포 이미지 아이콘으로 노출 */
    var attrSrc = attrCls ? attrIconSrc(attrCls) : '';
    var typeSrc = c.battleType ? typeIconSrc(c.battleType) : '';
    $('cpMeta').innerHTML =
      (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
      (attrSrc ? '<img class="cp-ic" src="' + attrSrc + '" alt="' + UI.esc(charAttrLabel(c)) + '" title="속성: ' + UI.esc(charAttrLabel(c)) + '" onerror="this.style.display=\'none\'">' : '') +
      (typeSrc ? '<img class="cp-ic" src="' + typeSrc + '" alt="' + UI.esc(c.battleType) + '" title="타입: ' + UI.esc(c.battleType) + '" onerror="this.style.display=\'none\'">' : '');
    paintCpFav();
    panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-cpt') === CP.tab); });
    renderCpBody();
    renderCpRelated();
    back.classList.add('open');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (!wasOpen) UI.lockBody(); /* 뒷배경 스크롤 잠금 (이미 열려있던 관련 캐릭터 전환이면 스킵) */
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
      if (!groups.length) {
        colEl.innerHTML = '<div class="empty" style="padding:18px 10px"><p>' + BNAME[kind] + ' 내역이 없습니다.</p></div>';
        return;
      }
      colEl.innerHTML = '<div class="pvp-col-grid">' + groups.map(function (g) {
        var c = g.charId != null ? findChar(g.charId) : null;
        var name = (c && c.name) || g.name || ('No.' + g.charId);
        var img = (c && c.image) || g.image || UI.PLACEHOLDER_IMG;
        return '<button class="orb" type="button" data-gid="' + UI.esc(g.uid) + '" aria-label="' + UI.esc(name) + ' (' + BNAME[kind] + ')">' +
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
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
  /* PvP 패치 정보 팝업 — 버프/너프/기능수정 한 번에 */
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
      var body = groups.length
        ? '<ul class="pvp-list">' + groups.map(function (gr) {
            return gr.items.map(function (it) { return '<li><small>' + UI.escBr(it.text || '') + '</small></li>'; }).join('');
          }).join('') + '</ul>'
        : '<p class="pvp-empty">' + BNAME[k] + ' 내역이 없습니다.</p>';
      return '<div class="pvp-sec pvp-sec--' + k + '"><h4><span class="badge badge--' + k + '">' + BSYM[k] + '</span> ' + BNAME[k] + '</h4>' + body + '</div>';
    }).join('');
    UI.openModal({
      cls: 'pvp-modal',
      title: name,
      body:
      '<div class="pvp-top">' +
      '<span class="pvp-ava"><img src="' + UI.esc(img) + '" alt="" onerror="this.style.display=\'none\'"></span>' +
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
      renderChars();
      if (params && params.char != null) {
        var c = findChar(params.char, F.tab);
        if (c) setTimeout(function () { openCharPanel(c, F.tab === 'support'); }, 80);
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
      if (el) el.addEventListener('change', function () {
        F[id.slice(1).toLowerCase()] = el.value;
        renderChars();
      });
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
