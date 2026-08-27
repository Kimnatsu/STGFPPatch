/* ============================================================
   FPP v2 — Community.js
   커뮤니티 홈 / 패치노트 / 게시판(글쓰기 포함) / 이벤트 (+ 상세) — 단일 페이지
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = { patches: [], events: [], boards: [], banners: [], loaded: false };
  var likedCache = {};

  function safe(p, label) {
    return p.catch(function (e) { console.error('[FPP] ' + label + ' 로드 실패:', e); return []; });
  }
  var DEMO_BOARDS_KEY = 'fpp_demo_boards';
  function readDemoBoards() {
    try { return JSON.parse(localStorage.getItem(DEMO_BOARDS_KEY) || '[]'); } catch (e) { return []; }
  }
  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    return Promise.all([
      safe(FB.getPatchNotes(), 'patchNotes'), safe(FB.getEvents(), 'events'),
      safe(FB.getBoards(), 'boards'), safe(FB.getBanners(), 'banners')
    ]).then(function (r) {
      S.patches = r[0]; S.events = r[1];
      /* 로컬(데모) 작성 게시글을 목록 앞에 병합 */
      S.boards = readDemoBoards().concat(r[2]);
      S.banners = r[3]; S.loaded = true;
    });
  }

  var CAT_CLS = { '자유': 'badge--free', '정보': 'badge--info', '질문': 'badge--q', '자랑': 'badge--brag' };
  function catBadge(c) { return '<span class="badge ' + (CAT_CLS[c] || 'badge--free') + '">' + UI.esc(c || '자유') + '</span>'; }

  /* 조회수 표기 — 1만 이상은 '1.2만' 형태로 압축 */
  function fmtViews(n) {
    n = Number(n) || 0;
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '만';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + '천';
    return String(n);
  }
  function viewsHTML(n) {
    return '<span class="views"><span class="views-ic" aria-hidden="true">' + UI.IC.eye + '</span>' + fmtViews(n) + '</span>';
  }
  function listRow(o) {
    return '<li class="lst-row" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="lst-main"><div class="lst-l1">' + o.badgeHTML +
      '<span class="lst-title">' + UI.esc(o.title) + '</span></div>' +
      '<div class="lst-l2"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span>' +
      '<span>·</span>' + viewsHTML(o.views) + '</div></div>' +
      (UI.isNew(o.date || o.ts) ? '<span class="lst-new">NEW</span>' : '') + '</li>';
  }
  function cardHTML(o) {
    var ph = '<span class="card-img-ph"' + (o.image ? ' style="display:none"' : '') + ' aria-hidden="true"><small>FPP</small></span>';
    var img = o.image ? '<img src="' + UI.esc(o.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.parentElement.querySelector(\'.card-img-ph\').style.display=\'flex\'">' : '';
    return '<article class="card" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="card-img">' + o.badgeHTML + img + ph + '</div>' +
      '<div class="card-body"><h3 class="card-title">' + UI.esc(o.title) + '</h3>' +
      '<div class="card-meta"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span></div>' +
      '<div class="card-foot"><span>' + UI.IC.heart + ' ' + (o.likeCount || 0) + '</span>' +
      (o.commentCount != null ? '<span>' + UI.IC.chat + ' ' + o.commentCount + '</span>' : '') +
      viewsHTML(o.views) +
      (o.period ? '<span class="ev-period" style="margin-left:auto">' + o.period + '</span>' : '') + '</div></div></article>';
  }
  function bindView(root, prefix) {
    root.querySelectorAll('[data-view]').forEach(function (el) {
      var go = function () { location.hash = prefix + '/view/' + el.getAttribute('data-view'); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  /* ===== 페이지네이션 — 목록형, 한 페이지 10개 ===== */
  var PAGE_SIZE = 10;
  var patchPage = 1, boardPage = 1, eventPage = 1;
  function pageOf(list, page) {
    var total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    var p = Math.min(Math.max(1, page || 1), total);
    return { items: list.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE), total: total, page: p };
  }
  function resolvePage(v, total, cur) {
    if (v === 'first') return 1;
    if (v === 'last') return total;
    if (v === 'prev') return Math.max(1, cur - 1);
    if (v === 'next') return Math.min(total, cur + 1);
    var n = parseInt(v, 10);
    return isNaN(n) ? cur : Math.min(Math.max(1, n), total);
  }
  function paginationHTML(total, page) {
    if (total <= 1) return '';
    var start = Math.max(1, Math.min(page - 2, total - 4));
    var end = Math.min(total, start + 4);
    var nums = '';
    for (var i = start; i <= end; i++) {
      nums += '<button class="pg-btn pg-num' + (i === page ? ' is-on' : '') + '" data-pg="' + i + '" type="button"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    return '<nav class="pager" aria-label="페이지 이동">' +
      '<button class="pg-btn pg-nav" data-pg="first" type="button"' + (page === 1 ? ' disabled' : '') + ' aria-label="첫 페이지">«</button>' +
      '<button class="pg-btn pg-nav" data-pg="prev" type="button"' + (page === 1 ? ' disabled' : '') + ' aria-label="이전 페이지">‹</button>' +
      '<span class="pg-pages">' + nums + '</span>' +
      '<button class="pg-btn pg-nav" data-pg="next" type="button"' + (page === total ? ' disabled' : '') + ' aria-label="다음 페이지">›</button>' +
      '<button class="pg-btn pg-nav" data-pg="last" type="button"' + (page === total ? ' disabled' : '') + ' aria-label="마지막 페이지">»</button>' +
      '<span class="pg-info">' + page + ' <em>/</em> ' + total + '</span>' +
      '</nav>';
  }
  function bindPager(root, onGo) {
    root.querySelectorAll('.pg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled) return;
        onGo(b.getAttribute('data-pg'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /* ================= 커뮤니티 홈 ================= */
  function renderComHome() {
    UI.setActiveNav('comhome');
    var pl = $('comPatchList');
    if (!S.patches.length) UI.empty(pl, { title: '등록된 패치노트가 없습니다.' });
    else {
      pl.innerHTML = '<ul class="lst">' + S.patches.slice(0, 5).map(function (p) {
        return listRow({ id: p.docId, badgeHTML: '<span class="badge badge--patch">패치노트</span>', title: p.title, author: p.author, date: p.date, ts: p.ts });
      }).join('') + '</ul>';
      bindView(pl, 'patch');
    }
    var bl = $('comBoardList');
    if (!S.boards.length) UI.empty(bl, { title: '게시글이 없습니다.' });
    else {
      bl.innerHTML = '<ul class="lst">' + S.boards.slice(0, 5).map(function (b) {
        return listRow({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, ts: b.ts });
      }).join('') + '</ul>';
      bindView(bl, 'board');
    }
    var evBox = $('comEventList');
    if (!S.events.length) UI.empty(evBox, { title: '진행 중인 이벤트가 없습니다.', desc: '새로운 이벤트가 시작되면 이곳에 표시됩니다.' });
    else {
      evBox.innerHTML = '<ul class="lst">' + S.events.slice(0, 5).map(function (e) {
        return listRow({ id: e.docId, badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: e.title, author: e.author, date: e.date, ts: e.ts });
      }).join('') + '</ul>';
      bindView(evBox, 'event');
    }
    document.querySelectorAll('#view-comhome [data-go]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = b.getAttribute('data-go'); });
    });
    UI.watchReveals($('view-comhome'));
  }

  /* ================= 패치노트 ================= */
  var patchMonth = 'all';
  function renderMonthFilter() {
    var months = {};
    S.patches.forEach(function (p) {
      var m = String(p.date || '').slice(0, 7);
      if (m) months[m] = (months[m] || 0) + 1;
    });
    var keys = Object.keys(months).sort().reverse();
    var box = $('monthList');
    box.innerHTML = '<button class="month-item' + (patchMonth === 'all' ? ' is-on' : '') + '" data-m="all" type="button">전체 <small>' + S.patches.length + '</small></button>' +
      keys.map(function (k) {
        return '<button class="month-item' + (patchMonth === k ? ' is-on' : '') + '" data-m="' + k + '" type="button">' + k.replace('-', '년 ') + '월 <small>' + months[k] + '</small></button>';
      }).join('');
    box.querySelectorAll('.month-item').forEach(function (b) {
      b.addEventListener('click', function () {
        patchMonth = b.getAttribute('data-m');
        patchPage = 1;
        renderMonthFilter();
        renderPatchList();
      });
    });
    /* 모바일 드롭다운 버튼 동기화 — 선택 라벨 + 건수 칩 + 옵션 목록 */
    var ddLabel = $('monthDdLabel'), ddCount = $('monthDdCount'), ddList = $('monthDdList');
    if (ddLabel) ddLabel.textContent = patchMonth === 'all' ? '전체 월' : patchMonth.replace('-', '년 ') + '월';
    if (ddCount) ddCount.textContent = (patchMonth === 'all' ? S.patches.length : (months[patchMonth] || 0)) + '건';
    if (ddList) {
      ddList.innerHTML =
        '<button class="month-dd-item' + (patchMonth === 'all' ? ' is-on' : '') + '" data-m="all" type="button" role="option"><span>전체 월</span><small>' + S.patches.length + '</small></button>' +
        keys.map(function (k) {
          return '<button class="month-dd-item' + (patchMonth === k ? ' is-on' : '') + '" data-m="' + k + '" type="button" role="option"><span>' + k.replace('-', '년 ') + '월</span><small>' + months[k] + '</small></button>';
        }).join('');
    }
    /* 월별 필터 컨테이너 자체도 .rv이므로 직접 리빌 처리한다. */
    var monthFilter = $('monthFilter');
    if (monthFilter) UI.watchReveals(monthFilter);
  }
  /* 모바일 월별 드롭다운 버튼 — 검색 없음, 선택만 */
  function bindMonthDd() {
    var btn = $('monthDdBtn'), list = $('monthDdList');
    if (!btn || !list) return;
    function close() {
      list.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.classList.remove('is-open');
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = list.hidden;
      list.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
      btn.classList.toggle('is-open', willOpen);
    });
    list.addEventListener('click', function (e) {
      var item = e.target.closest('.month-dd-item');
      if (!item) return;
      e.stopPropagation();
      patchMonth = item.getAttribute('data-m');
      patchPage = 1;
      close();
      renderMonthFilter();
      renderPatchList();
    });
    document.addEventListener('click', function (e) {
      if (!list.hidden && (!e.target.closest || !e.target.closest('#monthDd'))) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !list.hidden) close(); });
  }
  function renderPatchList() {
    var el = $('patchContent');
    var list = patchMonth === 'all' ? S.patches : S.patches.filter(function (p) { return String(p.date || '').slice(0, 7) === patchMonth; });
    $('monthFilter').style.display = '';
    if (!list.length) { UI.empty(el, { title: '등록된 패치노트가 없습니다.' }); return; }
    var pg = pageOf(list, patchPage);
    patchPage = pg.page;
    el.innerHTML = '<div class="pn-list">' + pg.items.map(function (p) {
      var d = String(p.date || '').split('-');
      return '<div class="pn-row" data-view="' + UI.esc(p.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(p.title) + '">' +
        '<div class="pn-date"><b>' + UI.esc(d[2] || '') + '</b><small>' + UI.esc((d[0] || '').slice(2) + '.' + (d[1] || '')) + '</small></div>' +
        '<div class="pn-main"><div class="pn-title">' + UI.esc(p.title) + '</div>' +
        '<div class="pn-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span>' +
        '<span>·</span>' + viewsHTML(p.views) +
        (UI.isNew(p.date) ? '<span class="lst-new">NEW</span>' : '') + '</div></div>' +
        '<span class="pn-arrow">›</span></div>';
    }).join('') + '</div>' + paginationHTML(pg.total, pg.page);
    bindView(el, 'patch');
    bindPager(el, function (v) { patchPage = resolvePage(v, pg.total, patchPage); renderPatchList(); });
    UI.watchReveals(el);
  }
  function renderPatchDetail(id) {
    var p = S.patches.filter(function (x) { return x.docId === id; })[0];
    var el = $('patchContent');
    $('monthFilter').style.display = 'none';
    if (!p) { UI.empty(el, { title: '패치노트를 찾을 수 없습니다.', btnText: '목록으로', btnHref: 'Community.html#patch' }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="patch">' + UI.IC.back + ' 패치노트 목록</button>' +
      '<article class="detail"><div class="detail-head">' +
      '<div class="detail-title-line"><span class="badge badge--patch">패치노트</span>' +
      '<h2 class="detail-title">' + UI.esc(p.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span>' +
      '<span>·</span>' + viewsHTML(p.views) + '</div></div>' +
      '<div class="detail-body">' + UI.renderContent(p.content) + '</div>' +
      actionRow('patch', p.docId, p.title) + '</article>' +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">패치노트</h2>' +
      '<button class="box-go" type="button" data-back="patch">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + S.patches.slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: '<span class="badge badge--patch">패치노트</span>', title: x.title, author: x.author, date: x.date });
      }).join('') + '</ul></div></div>';
    bindDetail(el, p, 'patch');
    bindView(el, 'patch');
    el.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { location.hash = 'patch'; }); });
    guardImages(el);
  }

  /* ================= 좋아요/공유 ================= */
  function likeKey(type, id) { return type + '_' + id; }
  function likeState(type, id, fallbackCount) {
    var key = likeKey(type, id);
    var uid = UI.currentUser() && UI.currentUser().uid;
    if (type === 'board') {
      var b = S.boards.filter(function (x) { return x.docId === id; })[0];
      likedCache[key] = !!(uid && b && b.likedBy && b.likedBy.indexOf(uid) > -1);
      return Promise.resolve(b ? b.likeCount : 0);
    }
    return FB.getLikeDoc(type, id).then(function (d) {
      likedCache[key] = !!(uid && d && d.likedBy && d.likedBy.indexOf(uid) > -1);
      return d ? d.likeCount : (fallbackCount || 0);
    }).catch(function () { likedCache[key] = false; return fallbackCount || 0; });
  }
  function actionRow(type, id) {
    return '<div class="detail-actions">' +
      '<button class="act-btn act-like" type="button" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24"><path d="M12 20.4l-7.2-7A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.2 6.8z"/></svg>' +
      '<span>좋아요</span> <b class="like-n">…</b></button>' +
      '<button class="act-btn act-share" type="button" aria-label="공유하기">' +
      '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg>' +
      '<span>공유하기</span></button></div>';
  }
  function bindDetail(el, item, type) {
    var key = likeKey(type, item.docId);
    var likeBtn = el.querySelector('.act-like');
    var likeN = el.querySelector('.like-n');
    function paint(count) {
      likeN.textContent = count;
      var on = !!likedCache[key];
      likeBtn.classList.toggle('on', on);
      likeBtn.setAttribute('aria-pressed', String(on));
    }
    likeState(type, item.docId, item.likeCount).then(paint);
    likeBtn.addEventListener('click', function () {
      var u = UI.currentUser();
      if (!u) { UI.toast('로그인 후 이용할 수 있습니다.'); setTimeout(function () { location.href = 'Login.html'; }, 700); return; }
      var nowLiked = !!likedCache[key];
      var pr = type === 'board'
        ? FB.toggleBoardLike(item.docId, u.uid, nowLiked)
        : FB.toggleGenericLike(type, item.docId, u.uid);
      pr.then(function (newLiked) {
        likedCache[key] = newLiked;
        var cur = parseInt(likeN.textContent, 10) || 0;
        paint(cur + (newLiked ? 1 : -1));
        if (type === 'board') item.likeCount = cur + (newLiked ? 1 : -1);
        FB.bumpUserLikeCount(u.uid, newLiked ? 1 : -1);
      }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
    });
    el.querySelector('.act-share').addEventListener('click', function () {
      UI.share(item.title, location.href);
    });
  }
  function guardImages(root) {
    root.querySelectorAll('.detail-body img').forEach(function (im) { im.onerror = function () { im.style.display = 'none'; }; });
  }

  /* ================= 댓글 ================= */
  function commentSection() {
    return '<section class="comment-sec" id="cmtSec"><h3 class="comment-head">댓글 <em id="cmtCnt"></em></h3>' +
      '<div id="cmtWrite"></div><div id="cmtList"></div></section>';
  }
  function renderComments(type, id) {
    var write = $('cmtWrite');
    var listEl = $('cmtList');
    var u = UI.currentUser();
    if (!u) {
      write.innerHTML = '<div class="cmt-login"><span>댓글은 로그인 후 작성할 수 있습니다.</span><a class="btn btn--gold btn--sm" href="Login.html">로그인</a></div>';
    } else {
      var ud = UI.userDoc() || {};
      write.innerHTML = '<div class="comment-write"><span class="c-avatar"><img src="' + UI.esc(UI.avatarOf(ud.profileIcon)) + '" alt="내 프로필"></span>' +
        '<div class="comment-input"><textarea id="cmtText" maxlength="500" placeholder="커뮤니티 규칙을 지키는 건강한 댓글을 남겨주세요." aria-label="댓글 작성"></textarea>' +
        '<button class="btn btn--gold btn--sm" id="cmtSubmit" type="button">댓글 등록</button></div></div>';
      write.querySelector('#cmtSubmit').addEventListener('click', function () {
        var ta = write.querySelector('#cmtText');
        var v = ta.value.trim();
        if (!v) { UI.toast('댓글 내용을 입력해 주세요.', 'err'); return; }
        FB.addComment(type, id, v, u, ud).then(function () {
          ta.value = '';
          UI.toast('댓글이 등록되었습니다.', 'ok');
          FB.bumpUserCommentCount(u.uid, 1);
          renderComments(type, id);
        }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
      });
    }
    FB.getComments(type, id).then(function (cmts) {
      $('cmtCnt').textContent = cmts.length ? cmts.length + '개' : '';
      if (!cmts.length) { listEl.innerHTML = '<div class="empty" style="padding:22px 10px"><p>첫 댓글을 남겨보세요.</p></div>'; return; }
      listEl.innerHTML = cmts.map(function (c) {
        var mine = u && c.uid === u.uid;
        return '<div class="cmt"><span class="cmt-av"><img src="' + UI.esc(UI.avatarOf(c.authorIcon)) + '" alt=""></span>' +
          '<div class="cmt-main"><div class="cmt-top"><b>' + UI.esc(c.authorName || '선원') + '</b>' +
          '<time>' + UI.esc(UI.fmtDate(c.createdAt ? FB.dateKey(c.createdAt) : c.createdAt)) + '</time>' +
          (mine ? '<button class="cmt-del" type="button" data-del="' + UI.esc(c.docId) + '">삭제</button>' : '') + '</div>' +
          '<p class="cmt-txt">' + UI.esc(c.text) + '</p></div></div>';
      }).join('');
      listEl.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          FB.deleteComment(type, b.getAttribute('data-del')).then(function () {
            UI.toast('댓글이 삭제되었습니다.');
            renderComments(type, id);
          }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
        });
      });
    }).catch(function (e) {
      listEl.innerHTML = '';
      UI.empty(listEl, { title: '댓글을 불러오지 못했습니다.', desc: FB.errMsg(e) });
    });
  }

  /* ================= 게시판 ================= */
  var B = { cat: 'all', view: 'list', sort: 'new' };
  function sortItems(list, sort) {
    var arr = list.slice();
    if (sort === 'like') arr.sort(function (a, b) { return (b.likeCount || 0) - (a.likeCount || 0); });
    else if (sort === 'old') arr.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    else arr.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    return arr;
  }
  function boardListFiltered() {
    var list = B.cat === 'all' ? S.boards : S.boards.filter(function (b) { return b.category === B.cat; });
    return sortItems(list, B.sort);
  }
  function renderBoardList() {
    var el = $('boardContent');
    var toolbar = $('boardToolbar');
    var writeToolbar = document.querySelector('#view-board .write-toolbar');
    toolbar.style.display = '';
    if (writeToolbar) UI.watchReveals(writeToolbar);
    /* 목록으로 돌아오거나 초기 로딩이 끝난 뒤에도 툴바 리빌을 보장한다. */
    UI.watchReveals(toolbar);
    var list = boardListFiltered();
    if (!list.length) { UI.empty(el, { title: '게시글이 없습니다.', desc: B.cat === 'all' ? '첫 게시글의 주인공이 되어보세요.' : '\'' + B.cat + '\' 카테고리에 글이 없습니다.' }); return; }
    if (B.view === 'card') {
      el.innerHTML = '<div class="cards cards--board">' + list.map(function (b) {
        return cardHTML({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, image: b.images && b.images[0], likeCount: b.likeCount, commentCount: b.commentCount });
      }).join('') + '</div>';
    } else {
      var pgB = pageOf(list, boardPage);
      boardPage = pgB.page;
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + pgB.items.map(function (b) {
        return listRow({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, ts: b.ts });
      }).join('') + '</ul></div>' + paginationHTML(pgB.total, pgB.page);
      bindPager(el, function (v) { boardPage = resolvePage(v, pgB.total, boardPage); renderBoardList(); });
    }
    bindView(el, 'board');
    UI.watchReveals(el);
  }
  function renderBoardDetail(id) {
    var b = S.boards.filter(function (x) { return x.docId === id; })[0];
    var el = $('boardContent');
    $('boardToolbar').style.display = 'none';
    if (!b) { UI.empty(el, { title: '게시글을 찾을 수 없습니다.', btnText: '게시판으로', btnHref: 'Community.html#board' }); return; }
    var contentHtml = String(b.content || b.text || '');
    var extra = (b.images || []).filter(function (src) { return contentHtml.indexOf(src) < 0; });
    var bodyImages = extra.map(function (src) { return '<img src="' + UI.esc(src) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'; }).join('');
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="board">' + UI.IC.back + ' 게시판 목록</button>' +
      '<article class="detail"><div class="detail-head">' +
      '<div class="detail-title-line">' + catBadge(b.category) +
      '<h2 class="detail-title">' + UI.esc(b.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(b.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(b.date)) + '</span>' +
      '<span>·</span>' + viewsHTML(b.views) +
      (b.commentCount ? '<span>·</span><span>댓글 ' + b.commentCount + '</span>' : '') + '</div></div>' +
      '<div class="detail-body">' + UI.renderContent(b.content || b.text) + bodyImages + '</div>' +
      actionRow('board', b.docId, b.title) + '</article>' +
      commentSection() +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">게시판</h2>' +
      '<button class="box-go" type="button" data-back="board">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + boardListFiltered().slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: catBadge(x.category), title: x.title, author: x.author, date: x.date });
      }).join('') + '</ul></div></div>';
    bindDetail(el, b, 'board');
    bindView(el, 'board');
    el.querySelectorAll('[data-back]').forEach(function (x) { x.addEventListener('click', function () { location.hash = 'board'; }); });
    renderComments('board', b.docId);
    guardImages(el);
  }

  /* ================= 이벤트 ================= */
  var E = { cat: 'all', view: 'card', sort: 'new' };
  function eventListFiltered() {
    var list = E.cat === 'all' ? S.events : S.events.filter(function (e) { return e.status === E.cat; });
    return sortItems(list, E.sort);
  }
  function evPeriod(e) {
    if (e.startDate || e.endDate) return UI.esc(UI.fmtDate(e.startDate) + (e.endDate ? ' ~ ' + UI.fmtDate(e.endDate) : ''));
    return '';
  }
  function renderEventList() {
    var el = $('eventContent');
    var toolbar = $('eventToolbar');
    toolbar.style.display = '';
    /* 목록으로 돌아오거나 초기 로딩이 끝난 뒤에도 툴바 리빌을 보장한다. */
    UI.watchReveals(toolbar);
    var list = eventListFiltered();
    if (!list.length) {
      UI.empty(el, { title: E.cat === 'ing' ? '진행 중인 이벤트가 없습니다.' : E.cat === 'end' ? '종료된 이벤트가 없습니다.' : '이벤트가 없습니다.' });
      return;
    }
    if (E.view === 'card') {
      el.innerHTML = '<div class="cards cards--event">' + list.map(function (e) {
        return cardHTML({
          id: e.docId,
          badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>',
          title: e.title, author: e.author, date: e.date, image: e.image, likeCount: e.likeCount, commentCount: e.commentCount,
          period: evPeriod(e)
        });
      }).join('') + '</div>';
    } else {
      var pgE = pageOf(list, eventPage);
      eventPage = pgE.page;
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + pgE.items.map(function (e) {
        return listRow({ id: e.docId, badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: e.title, author: e.author, date: e.date, ts: e.ts });
      }).join('') + '</ul></div>' + paginationHTML(pgE.total, pgE.page);
      bindPager(el, function (v) { eventPage = resolvePage(v, pgE.total, eventPage); renderEventList(); });
    }
    bindView(el, 'event');
    UI.watchReveals(el);
  }
  function renderEventDetail(id) {
    var e = S.events.filter(function (x) { return x.docId === id; })[0];
    var el = $('eventContent');
    $('eventToolbar').style.display = 'none';
    if (!e) { UI.empty(el, { title: '이벤트를 찾을 수 없습니다.', btnText: '이벤트 목록으로', btnHref: 'Community.html#event' }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="event">' + UI.IC.back + ' 이벤트 목록</button>' +
      '<article class="detail"><div class="detail-head">' +
      '<div class="detail-title-line">' +
      (e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>') +
      '<h2 class="detail-title">' + UI.esc(e.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(e.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(e.date)) + '</span>' +
      '<span>·</span>' + viewsHTML(e.views) +
      (evPeriod(e) ? '<span>·</span><span class="ev-period"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/></svg>' + evPeriod(e) + '</span>' : '') +
      '</div></div>' +
      '<div class="detail-body">' + (e.image ? '<img src="' + UI.esc(e.image) + '" alt="" referrerpolicy="no-referrer" style="width:100%;border-radius:10px;margin-bottom:14px">' : '') +
      UI.renderContent(e.content) + '</div>' +
      actionRow('event', e.docId, e.title) + '</article>' +
      commentSection() +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">이벤트</h2>' +
      '<button class="box-go" type="button" data-back="event">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + eventListFiltered().slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: x.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: x.title, author: x.author, date: x.date });
      }).join('') + '</ul></div></div>';
    bindDetail(el, e, 'event');
    bindView(el, 'event');
    el.querySelectorAll('[data-back]').forEach(function (x) { x.addEventListener('click', function () { location.hash = 'event'; }); });
    renderComments('event', e.docId);
    guardImages(el);
  }

  /* ================= 글쓰기 (리치 에디터) ================= */
  var W = { cat: '자유', dirty: false };
  function execCmd(cmd, val) {
    var body = $('wpBody');
    if (body) body.focus();
    document.execCommand(cmd, false, val || null);
    refreshToolbarState();
  }
  function refreshToolbarState() {
    var cmds = { edBold: 'bold', edItalic: 'italic', edUnderline: 'underline', edStrike: 'strikeThrough' };
    Object.keys(cmds).forEach(function (id) {
      var b = $(id);
      if (!b) return;
      var on = false;
      try { on = document.queryCommandState(cmds[id]); } catch (e) { }
      b.classList.toggle('on', on);
    });
  }
  function saveSelection() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) W.savedRange = sel.getRangeAt(0).cloneRange();
  }
  function restoreSelection() {
    if (!W.savedRange) return;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(W.savedRange);
  }
  function applyFontSizePx(px) {
    var body = $('wpBody');
    if (!body) return;
    var sel = window.getSelection();
    var hasEditorSel = false;
    if (sel && sel.rangeCount > 0 && body.contains(sel.getRangeAt(0).commonAncestorContainer)) hasEditorSel = true;
    if (!hasEditorSel) { body.focus(); restoreSelection(); sel = window.getSelection(); }
    var r = null;
    if (sel && sel.rangeCount > 0) {
      var cand = sel.getRangeAt(0);
      if (body.contains(cand.commonAncestorContainer)) r = cand;
    }
    var span = document.createElement('span');
    span.style.fontSize = px;
    if (r && !r.collapsed) {
      span.appendChild(r.extractContents());
      r.insertNode(span);
    } else if (r) {
      span.appendChild(document.createTextNode('\u200B'));
      r.insertNode(span);
    } else {
      span.appendChild(document.createTextNode('\u200B'));
      body.appendChild(span);
    }
    var sel2 = window.getSelection();
    if (sel2) {
      var rng = document.createRange();
      var tn = span.firstChild;
      if (tn && tn.nodeType === 3) rng.setStart(tn, tn.data.length);
      else { rng.selectNodeContents(span); rng.collapse(false); }
      sel2.removeAllRanges();
      sel2.addRange(rng);
    }
    body.focus();
    refreshToolbarState();
  }
  function toYouTubeEmbed(url) {
    var m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    return m ? 'https://www.youtube.com/embed/' + m[1] : '';
  }
  function bindEditor() {
    var body = $('wpBody');
    if (!body) return;
    body.addEventListener('input', function () { W.dirty = true; });
    body.addEventListener('keyup', refreshToolbarState);
    body.addEventListener('mouseup', refreshToolbarState);

    var simple = { edBold: 'bold', edItalic: 'italic', edUnderline: 'underline', edStrike: 'strikeThrough' };
    Object.keys(simple).forEach(function (id) {
      var b = $(id);
      if (b) {
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () { execCmd(simple[id]); });
      }
    });
    var block = { edQuote: 'blockquote', edUl: 'insertUnorderedList', edOl: 'insertOrderedList', edClear: 'removeFormat' };
    Object.keys(block).forEach(function (id) {
      var b = $(id);
      if (b) {
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.addEventListener('click', function () {
          if (id === 'edQuote') { document.execCommand('formatBlock', false, 'blockquote'); }
          else execCmd(block[id]);
          refreshToolbarState();
        });
      }
    });

    /* 글씨 크기 — 커스텀 드롭다운 */
    var SIZES = ['11px', '13px', '15px', '16px', '19px', '24px', '28px', '30px', '34px', '38px'];
    var szBtn = $('edSizeBtn'), szList = $('edSizeList'), szLabel = $('edSizeLabel');
    function closeSizeList() {
      if (szList) szList.hidden = true;
      if (szBtn) szBtn.setAttribute('aria-expanded', 'false');
    }
    function markSize(px) {
      if (!szList) return;
      szList.querySelectorAll('.ed-size-item').forEach(function (it) {
        it.classList.toggle('is-on', it.getAttribute('data-px') === px);
      });
    }
    if (szList) {
      szList.innerHTML = SIZES.map(function (px) {
        var n = px.replace('px', '');
        var preview = Math.min(parseInt(n, 10), 21);
        return '<button class="ed-size-item' + (px === '15px' ? ' is-on' : '') + '" data-px="' + px + '" type="button" role="option">' +
          '<span style="font-size:' + preview + 'px;line-height:1">' + n + '</span></button>';
      }).join('');
    }
    if (szBtn) {
      szBtn.addEventListener('mousedown', function (e) { e.preventDefault(); saveSelection(); });
      szBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = szList.hidden;
        szList.hidden = !willOpen;
        szBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }
    if (szList) {
      szList.querySelectorAll('.ed-size-item').forEach(function (it) {
        it.addEventListener('mousedown', function (e) { e.preventDefault(); });
        it.addEventListener('click', function (e) {
          e.stopPropagation();
          var px = it.getAttribute('data-px');
          if (szLabel) szLabel.textContent = px.replace('px', '');
          markSize(px);
          applyFontSizePx(px);
          closeSizeList();
        });
      });
    }
    document.addEventListener('click', function (e) {
      if (szList && !szList.hidden && (!e.target.closest || !e.target.closest('#edSizeWrap'))) closeSizeList();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && szList && !szList.hidden) closeSizeList();
    });

    /* 글씨 색상 */
    var col = $('edColor');
    if (col) {
      col.addEventListener('mousedown', function () { saveSelection(); });
      col.addEventListener('input', function () {
        restoreSelection();
        execCmd('foreColor', col.value);
      });
    }
    /* 링크 */
    var linkBtn = $('edLink');
    if (linkBtn) {
      linkBtn.addEventListener('mousedown', function (e) { e.preventDefault(); saveSelection(); });
      linkBtn.addEventListener('click', function () {
        var m = UI.openModal({
          title: '링크 첨부',
          body: '<div class="fld"><span class="fld-lb">URL</span><input id="linkUrl" type="url" placeholder="https://example.com"></div>' +
            '<button class="btn btn--gold btn--block" id="linkOk" type="button">링크 삽입</button>'
        });
        m.body.querySelector('#linkOk').addEventListener('click', function () {
          var v = m.body.querySelector('#linkUrl').value.trim();
          if (!v) { UI.toast('URL을 입력해 주세요.', 'err'); return; }
          if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
          m.close();
          $('wpBody').focus();
          restoreSelection();
          document.execCommand('createLink', false, v);
          refreshToolbarState();
        });
      });
    }
    /* 이미지 */
    var imgBtn = $('edImage');
    if (imgBtn) {
      imgBtn.addEventListener('mousedown', function (e) { e.preventDefault(); saveSelection(); });
      imgBtn.addEventListener('click', function () {
        var m = UI.openModal({
          title: '이미지 첨부',
          body: '<div class="fld"><span class="fld-lb">이미지 URL</span><input id="imgUrl" type="url" placeholder="https://.../image.jpg"></div>' +
            '<button class="btn btn--gold btn--block" id="imgOk" type="button">이미지 삽입</button>'
        });
        m.body.querySelector('#imgOk').addEventListener('click', function () {
          var v = m.body.querySelector('#imgUrl').value.trim();
          if (!v) { UI.toast('이미지 URL을 입력해 주세요.', 'err'); return; }
          m.close();
          $('wpBody').focus();
          restoreSelection();
          document.execCommand('insertHTML', false, '<img src="' + UI.esc(v) + '" alt="" referrerpolicy="no-referrer" style="max-width:100%">');
        });
      });
    }
    /* 동영상 */
    var vidBtn = $('edVideo');
    if (vidBtn) {
      vidBtn.addEventListener('mousedown', function (e) { e.preventDefault(); saveSelection(); });
      vidBtn.addEventListener('click', function () {
        var m = UI.openModal({
          title: '동영상 첨부',
          body: '<p>YouTube 링크를 붙여넣으면 본문에 영상이 삽입됩니다.</p>' +
            '<div class="fld"><span class="fld-lb">YouTube URL</span><input id="vidUrl" type="url" placeholder="https://www.youtube.com/watch?v=..."></div>' +
            '<button class="btn btn--gold btn--block" id="vidOk" type="button">동영상 삽입</button>'
        });
        m.body.querySelector('#vidOk').addEventListener('click', function () {
          var v = m.body.querySelector('#vidUrl').value.trim();
          var embed = toYouTubeEmbed(v);
          if (!embed) { UI.toast('YouTube 링크를 확인해 주세요.', 'err'); return; }
          m.close();
          $('wpBody').focus();
          restoreSelection();
          document.execCommand('insertHTML', false,
            '<iframe width="100%" height="280" src="' + embed + '" frameborder="0" allowfullscreen loading="lazy" referrerpolicy="no-referrer"></iframe>');
        });
      });
    }
  }
  function resetWriteForm() {
    W.cat = '자유';
    W.dirty = false;
    var ti = $('wpTitle'); if (ti) ti.value = '';
    var url = $('wpUrl'); if (url) url.value = '';
    var body = $('wpBody'); if (body) body.innerHTML = '';
    var szLabel = $('edSizeLabel'); if (szLabel) szLabel.textContent = '15';
    var sz = $('edSizeList'); if (sz) sz.querySelectorAll('.ed-size-item').forEach(function (it) { it.classList.toggle('is-on', it.getAttribute('data-px') === '15px'); });
    document.querySelectorAll('.write-cat').forEach(function (c) { c.classList.toggle('is-on', c.getAttribute('data-cat') === '자유'); });
  }
  function openWrite() {
    UI.setActiveNav('board');
    var writeCard = document.querySelector('#view-write .write-card');
    if (writeCard) UI.watchReveals(writeCard);
    resetWriteForm();
    document.querySelectorAll('.write-cat').forEach(function (c) {
      c.addEventListener('click', function () {
        W.cat = c.getAttribute('data-cat');
        document.querySelectorAll('.write-cat').forEach(function (x) { x.classList.toggle('is-on', x === c); });
      });
    });
    var back = $('wpBack');
    if (back) back.addEventListener('click', goBackFromWrite);
    var cancel = $('wpCancel');
    if (cancel) cancel.addEventListener('click', goBackFromWrite);
    var submit = $('wpSubmit');
    if (submit) submit.addEventListener('click', submitWrite);
  }
  function goBackFromWrite() {
    if (W.dirty) {
      var m = UI.openModal({
        title: '작성 중인 글',
        body: '<p style="font-size:14px;line-height:1.7">작성 중인 내용을 버리고 나가시겠습니까?</p>' +
          '<div style="display:flex;gap:8px;margin-top:16px">' +
          '<button class="btn btn--ghost btn--block" id="stayBtn" type="button">계속 작성</button>' +
          '<button class="btn btn--danger btn--block" id="leaveBtn" type="button">나가기</button></div>'
      });
      m.body.querySelector('#stayBtn').addEventListener('click', m.close);
      m.body.querySelector('#leaveBtn').addEventListener('click', function () { m.close(); W.dirty = false; location.hash = 'board'; });
    } else {
      location.hash = 'board';
    }
  }
  function submitWrite() {
    var u = UI.currentUser();
    if (!u) {
      UI.toast('로그인 후 작성할 수 있습니다.');
      setTimeout(function () { location.href = 'Login.html'; }, 700);
      return;
    }
    var title = ($('wpTitle').value || '').trim();
    var body = $('wpBody');
    var html = body ? body.innerHTML.trim() : '';
    var text = body ? body.innerText.trim() : '';
    if (!title) { UI.toast('제목을 입력해 주세요.', 'err'); $('wpTitle').focus(); return; }
    if (!text) { UI.toast('내용을 입력해 주세요.', 'err'); body && body.focus(); return; }
    var url = ($('wpUrl').value || '').trim();
    var images = [];
    if (url) images.push(url);
    var ud = UI.userDoc() || {};
    var now = new Date();
    var dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var btn = $('wpSubmit');
    btn.disabled = true; btn.textContent = '등록 중…';

    var payload = {
      title: title, text: html, prefix: W.cat,
      uid: u.uid, author: ud.nickname || u.displayName || '선원',
      images: images, likedBy: [], likeCount: 0, commentCount: 0,
      date: dateStr, createdAt: window.firebase && window.firebase.firestore ? window.firebase.firestore.FieldValue.serverTimestamp() : null
    };

    var done = function (local) {
      if (local) {
        var arr = readDemoBoards();
        arr.unshift({ docId: 'local_' + Date.now(), title: title, content: html, category: W.cat, author: payload.author, date: dateStr, ts: now.getTime(), images: images, likedBy: [], likeCount: 0, commentCount: 0 });
        try { localStorage.setItem(DEMO_BOARDS_KEY, JSON.stringify(arr)); } catch (e) { }
      }
      FB.bumpUserPostCount(u.uid, 1);
      W.dirty = false;
      UI.toast('게시글이 등록되었습니다.', 'ok');
      location.hash = 'board';
    };

    if (u.demo) { done(true); btn.disabled = false; btn.textContent = '등록하기'; return; }
    FB.addBoard(payload).then(function () { done(false); })
      .catch(function (e) {
        btn.disabled = false; btn.textContent = '등록하기';
        UI.toast(FB.errMsg(e) + ' — 등록에 실패했습니다.', 'err');
      });
  }

  /* ================= 라우팅 ================= */
  var PAGE_VIEWS = { home: 'view-comhome', patch: 'view-patch', board: 'view-board', event: 'view-event', write: 'view-write' };
  function showPage(name) {
    Object.keys(PAGE_VIEWS).forEach(function (k) { $(PAGE_VIEWS[k]).hidden = k !== name; });
  }
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || 'home';
    var parts = h.split('/');
    return { page: parts[0], mode: parts[1] || 'list', id: parts[2] || null };
  }
  function route() {
    var r = parseHash();
    /* 게시판 글쓰기 해시(board/write)는 글쓰기 뷰로 전환 */
    if (r.page === 'board' && r.mode === 'write') r.page = 'write';
    if (!PAGE_VIEWS[r.page]) r.page = 'home';
    showPage(r.page);
    UI.setActiveNav(r.page === 'home' ? 'comhome' : r.page);
    window.scrollTo({ top: 0 });
    if (r.page === 'write') { openWrite(); return; }
    if (!S.loaded) return;
    if (r.page === 'home') renderComHome();
    if (r.page === 'patch') {
      if (r.mode === 'view' && r.id) renderPatchDetail(r.id);
      else { renderMonthFilter(); renderPatchList(); }
    }
    if (r.page === 'board') {
      if (r.mode === 'view' && r.id) renderBoardDetail(r.id);
      else renderBoardList();
    }
    if (r.page === 'event') {
      if (r.mode === 'view' && r.id) renderEventDetail(r.id);
      else renderEventList();
    }
  }

  /* ================= 툴바 ================= */
  function bindToolbars() {
    document.querySelectorAll('#boardCats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        B.cat = c.getAttribute('data-cat');
        boardPage = 1;
        document.querySelectorAll('#boardCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        B.view = c.getAttribute('data-view');
        boardPage = 1;
        document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    $('boardSort').addEventListener('change', function (e) { B.sort = e.target.value; boardPage = 1; renderBoardList(); });

    document.querySelectorAll('#eventCats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        E.cat = c.getAttribute('data-cat');
        eventPage = 1;
        document.querySelectorAll('#eventCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        E.view = c.getAttribute('data-view');
        eventPage = 1;
        document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    $('eventSort').addEventListener('change', function (e) { E.sort = e.target.value; eventPage = 1; renderEventList(); });

    var wb = $('writeBtn');
    if (wb) wb.addEventListener('click', function () { location.hash = 'board/write'; });
  }

  /* ================= 부팅 ================= */
  function start() {
    bindToolbars();
    bindEditor();
    bindMonthDd();
    UI.skelRows($('comPatchList'), 4);
    UI.skelRows($('comBoardList'), 4);
    UI.skelRows($('comEventList'), 3);
    UI.skelRows($('patchContent'), 5);
    UI.skelRows($('boardContent'), 5);
    UI.skelCards($('eventContent'), 3);

    route();
    loadAll().then(function () {
      try {
        UI.fillPageBanner($('commBannerMedia'), 'community', S.banners);
        UI.fillPageBanner($('patchBannerMedia'), 'patch', S.banners);
        UI.fillPageBanner($('boardBannerMedia'), 'board', S.banners);
        UI.fillPageBanner($('eventBannerMedia'), 'event', S.banners);
        UI.fillPageBanner($('writeBannerMedia'), 'board', S.banners);
        route();
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
        UI.toast('화면을 그리는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'err');
      }
    }).catch(function (e) {
      console.error('[FPP] 데이터 로드 실패:', e);
      UI.toast(FB.errMsg(e) + ' — 데이터를 불러오지 못했습니다.', 'err');
      ['comPatchList', 'comBoardList', 'comEventList', 'patchContent', 'boardContent', 'eventContent'].forEach(function (id) {
        UI.empty($(id), { title: '데이터를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
      });
    });
    window.addEventListener('hashchange', route);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
