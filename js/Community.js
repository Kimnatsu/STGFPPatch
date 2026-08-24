/* ============================================================
   FPP v2 — Community.js
   커뮤니티 홈 / 패치노트 / 게시판 / 이벤트 (+ 상세) — 단일 페이지
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = { patches: [], events: [], boards: [], banners: [], loaded: false };
  var likedCache = {};

  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    return Promise.all([FB.getPatchNotes(), FB.getEvents(), FB.getBoards(), FB.getBanners()])
      .then(function (r) { S.patches = r[0]; S.events = r[1]; S.boards = r[2]; S.banners = r[3]; S.loaded = true; });
  }

  var CAT_CLS = { '자유': 'badge--free', '정보': 'badge--info', '질문': 'badge--q', '자랑': 'badge--brag' };
  function catBadge(c) { return '<span class="badge ' + (CAT_CLS[c] || 'badge--free') + '">' + UI.esc(c || '자유') + '</span>'; }

  function listRow(o) {
    return '<li class="lst-row" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="lst-main"><div class="lst-l1">' + o.badgeHTML +
      '<span class="lst-title">' + UI.esc(o.title) + '</span></div>' +
      '<div class="lst-l2"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span></div></div>' +
      (UI.isNew(o.date || o.ts) ? '<span class="lst-new">NEW</span>' : '') + '</li>';
  }
  function cardHTML(o) {
    var img = o.image ? '<img src="' + UI.esc(o.image) + '" alt="" loading="lazy" onerror="this.parentElement.classList.add(\'no-img\')">' : '';
    return '<article class="card" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="card-img">' + o.badgeHTML + img + '</div>' +
      '<div class="card-body"><h3 class="card-title">' + UI.esc(o.title) + '</h3>' +
      '<div class="card-meta"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span></div>' +
      '<div class="card-foot"><span>' + UI.IC.heart + ' ' + (o.likeCount || 0) + '</span>' +
      (o.commentCount != null ? '<span>' + UI.IC.chat + ' ' + o.commentCount + '</span>' : '') +
      (o.period ? '<span class="ev-period" style="margin-left:auto">' + o.period + '</span>' : '') + '</div></div></article>';
  }
  function bindView(root, prefix) {
    root.querySelectorAll('[data-view]').forEach(function (el) {
      var go = function () { location.hash = prefix + '/view/' + el.getAttribute('data-view'); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
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
        renderMonthFilter();
        renderPatchList();
      });
    });
  }
  function renderPatchList() {
    var el = $('patchContent');
    var list = patchMonth === 'all' ? S.patches : S.patches.filter(function (p) { return String(p.date || '').slice(0, 7) === patchMonth; });
    $('monthFilter').style.display = '';
    if (!list.length) { UI.empty(el, { title: '등록된 패치노트가 없습니다.' }); return; }
    el.innerHTML = '<div class="pn-list">' + list.map(function (p) {
      var d = String(p.date || '').split('-');
      return '<div class="pn-row" data-view="' + UI.esc(p.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(p.title) + '">' +
        '<div class="pn-date"><b>' + UI.esc(d[2] || '') + '</b><small>' + UI.esc((d[0] || '').slice(2) + '.' + (d[1] || '')) + '</small></div>' +
        '<div class="pn-main"><div class="pn-title">' + UI.esc(p.title) + '</div>' +
        '<div class="pn-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span>' +
        (UI.isNew(p.date) ? '<span class="lst-new">NEW</span>' : '') + '</div></div>' +
        '<span class="pn-arrow">›</span></div>';
    }).join('') + '</div>';
    bindView(el, 'patch');
    UI.watchReveals(el);
  }
  function renderPatchDetail(id) {
    var p = S.patches.find(function (x) { return x.docId === id; });
    var el = $('patchContent');
    $('monthFilter').style.display = 'none';
    if (!p) { UI.empty(el, { title: '패치노트를 찾을 수 없습니다.', btnText: '목록으로', btnHref: 'Community.html#patch' }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="patch">' + UI.IC.back + ' 패치노트 목록</button>' +
      '<article class="detail"><div class="detail-head">' +
      '<span class="badge badge--patch">패치노트</span>' +
      '<h2 class="detail-title">' + UI.esc(p.title) + '</h2>' +
      '<div class="detail-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span></div></div>' +
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
      var b = S.boards.find(function (x) { return x.docId === id; });
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
    $('boardToolbar').style.display = '';
    var list = boardListFiltered();
    if (!list.length) { UI.empty(el, { title: '게시글이 없습니다.', desc: B.cat === 'all' ? '첫 게시글의 주인공이 되어보세요.' : '\'' + B.cat + '\' 카테고리에 글이 없습니다.' }); return; }
    if (B.view === 'card') {
      el.innerHTML = '<div class="cards cards--board">' + list.map(function (b) {
        return cardHTML({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, image: b.images && b.images[0], likeCount: b.likeCount, commentCount: b.commentCount });
      }).join('') + '</div>';
    } else {
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + list.map(function (b) {
        return listRow({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, ts: b.ts });
      }).join('') + '</ul></div>';
    }
    bindView(el, 'board');
    UI.watchReveals(el);
  }
  function renderBoardDetail(id) {
    var b = S.boards.find(function (x) { return x.docId === id; });
    var el = $('boardContent');
    $('boardToolbar').style.display = 'none';
    if (!b) { UI.empty(el, { title: '게시글을 찾을 수 없습니다.', btnText: '게시판으로', btnHref: 'Community.html#board' }); return; }
    var bodyImages = (b.images || []).map(function (src) { return '<img src="' + UI.esc(src) + '" alt="" loading="lazy">'; }).join('');
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="board">' + UI.IC.back + ' 게시판 목록</button>' +
      '<article class="detail"><div class="detail-head">' + catBadge(b.category) +
      '<h2 class="detail-title">' + UI.esc(b.title) + '</h2>' +
      '<div class="detail-meta"><span>' + UI.esc(b.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(b.date)) + '</span>' +
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
    $('eventToolbar').style.display = '';
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
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + list.map(function (e) {
        return listRow({ id: e.docId, badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: e.title, author: e.author, date: e.date, ts: e.ts });
      }).join('') + '</ul></div>';
    }
    bindView(el, 'event');
    UI.watchReveals(el);
  }
  function renderEventDetail(id) {
    var e = S.events.find(function (x) { return x.docId === id; });
    var el = $('eventContent');
    $('eventToolbar').style.display = 'none';
    if (!e) { UI.empty(el, { title: '이벤트를 찾을 수 없습니다.', btnText: '이벤트 목록으로', btnHref: 'Community.html#event' }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="event">' + UI.IC.back + ' 이벤트 목록</button>' +
      '<article class="detail"><div class="detail-head">' +
      (e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>') +
      '<h2 class="detail-title">' + UI.esc(e.title) + '</h2>' +
      '<div class="detail-meta"><span>' + UI.esc(e.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(e.date)) + '</span>' +
      (evPeriod(e) ? '<span>·</span><span class="ev-period"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/></svg>' + evPeriod(e) + '</span>' : '') +
      '</div></div>' +
      '<div class="detail-body">' + (e.image ? '<img src="' + UI.esc(e.image) + '" alt="" style="width:100%;border-radius:10px;margin-bottom:14px">' : '') +
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

  /* ================= 라우팅 ================= */
  var PAGE_VIEWS = { home: 'view-comhome', patch: 'view-patch', board: 'view-board', event: 'view-event' };
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
    if (!PAGE_VIEWS[r.page]) r.page = 'home';
    showPage(r.page);
    UI.setActiveNav(r.page === 'home' ? 'comhome' : r.page);
    window.scrollTo({ top: 0 });
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
        document.querySelectorAll('#boardCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        B.view = c.getAttribute('data-view');
        document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    $('boardSort').addEventListener('change', function (e) { B.sort = e.target.value; renderBoardList(); });

    document.querySelectorAll('#eventCats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        E.cat = c.getAttribute('data-cat');
        document.querySelectorAll('#eventCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        E.view = c.getAttribute('data-view');
        document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    $('eventSort').addEventListener('change', function (e) { E.sort = e.target.value; renderEventList(); });
  }

  /* ================= 부팅 ================= */
  function start() {
    bindToolbars();
    UI.skelRows($('comPatchList'), 4);
    UI.skelRows($('comBoardList'), 4);
    UI.skelRows($('comEventList'), 3);
    UI.skelRows($('patchContent'), 5);
    UI.skelRows($('boardContent'), 5);
    UI.skelCards($('eventContent'), 3);

    route();
    loadAll().then(function () {
      try {
        /* 페이지 전용 배너 — 패치노트/게시판/이벤트 각각 고유 배너 */
        UI.fillPageBanner($('commBannerMedia'), 'community', S.banners);
        UI.fillPageBanner($('patchBannerMedia'), 'patch', S.banners);
        UI.fillPageBanner($('boardBannerMedia'), 'board', S.banners);
        UI.fillPageBanner($('eventBannerMedia'), 'event', S.banners);
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
