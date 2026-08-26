/* ============================================================
   FPP v2 — CustomerService.js
   고객센터: 검색 / 목록 / 상세 / 1:1 문의 / 나의 문의 (좋아요·공유 없음)
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = { faqs: [], loaded: false, q: '' };

  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    /* 공지사항(notices)이 아닌 고객센터 전용 데이터만 불러온다 */
    return FB.getCustomerService().then(function (list) { S.faqs = list; S.loaded = true; });
  }

  function filtered() {
    var q = S.q.toLowerCase();
    if (!q) return S.faqs;
    return S.faqs.filter(function (f) {
      return (f.title || '').toLowerCase().indexOf(q) > -1 ||
        (f.content || '').toLowerCase().indexOf(q) > -1 ||
        (f.author || '').toLowerCase().indexOf(q) > -1;
    });
  }

  function renderList() {
    $('csListSection').hidden = false;
    $('csDetail').hidden = true;
    var el = $('csGrid');
    var list = filtered();
    if (!list.length) {
      UI.empty(el, { title: S.q ? '\'' + S.q + '\' 검색 결과가 없습니다.' : '등록된 고객센터 정보가 없습니다.', desc: S.q ? '다른 키워드로 검색해 보세요.' : '' });
      return;
    }
    el.innerHTML = '<ul class="cs-rows">' + list.map(function (f) {
      return '<li class="cs-row" data-id="' + UI.esc(f.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(f.title) + '">' +
        '<span class="cs-q-ic" aria-hidden="true">Q</span>' +
        '<div class="cs-row-tx"><b>' + UI.esc(f.title) + '</b>' +
        '<small>' + (f.category ? '<em class="badge badge--patch">' + UI.esc(f.category) + '</em> ' : '') + UI.esc(f.author) + ' · ' + UI.esc(UI.fmtDate(f.date)) + '</small></div>' +
        '<span class="cs-arrow" aria-hidden="true">›</span></li>';
    }).join('') + '</ul>';
    el.querySelectorAll('.cs-row').forEach(function (row) {
      var open = function () { renderDetail(row.getAttribute('data-id')); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    });
    UI.watchReveals(el);
  }

  function renderDetail(id) {
    var f = S.faqs.filter(function (x) { return x.docId === id; })[0];
    if (!f) return;
    $('csListSection').hidden = true;
    var detail = $('csDetail');
    detail.hidden = false;
    $('csTitle').innerHTML =
      (f.category ? '<span class="badge badge--patch">' + UI.esc(f.category) + '</span> ' : '') + UI.esc(f.title);
    $('csMeta').textContent = f.author + ' · ' + UI.fmtDate(f.date);
    $('csContent').innerHTML = UI.renderContent(f.content);
    $('csList').innerHTML = '<ul class="lst">' + filtered().slice(0, 6).map(function (x) {
      return '<li class="lst-row" data-id="' + UI.esc(x.docId) + '" tabindex="0" role="button">' +
        '<div class="lst-main"><div class="lst-l1"><span class="badge badge--patch">고객센터</span>' +
        '<span class="lst-title">' + UI.esc(x.title) + '</span></div>' +
        '<div class="lst-l2"><span>' + UI.esc(x.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(x.date)) + '</span></div></div></li>';
    }).join('') + '</ul>';
    document.querySelectorAll('#csList .lst-row').forEach(function (row) {
      var go = function () { renderDetail(row.getAttribute('data-id')); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
    window.scrollTo({ top: 0 });
    UI.watchReveals(detail);
  }

  function askModal() {
    var u = UI.currentUser();
    var m = UI.openModal({
      title: '1:1 문의',
      body: '<div class="fld"><span class="fld-lb">제목</span><input id="askTitle" type="text" maxlength="60" placeholder="문의 제목"></div>' +
        '<div class="fld"><span class="fld-lb">내용</span><textarea id="askContent" rows="6" maxlength="1000" placeholder="문의 내용을 자세히 적어주세요."></textarea></div>' +
        '<div class="fld"><span class="fld-lb">회신 받을 이메일</span><input id="askContact" type="email" value="' + UI.esc(u ? (u.email || '') : '') + '" placeholder="email@example.com"></div>' +
        (u ? '' : '<p class="pick-note">비로그인 상태에서도 접수할 수 있습니다.</p>') +
        '<button class="btn btn--gold btn--block" id="askSubmit" type="button" style="margin-top:14px">문의 접수하기</button>'
    });
    m.body.querySelector('#askSubmit').addEventListener('click', function () {
      var title = m.body.querySelector('#askTitle').value.trim();
      var content = m.body.querySelector('#askContent').value.trim();
      var contact = m.body.querySelector('#askContact').value.trim();
      if (!title || !content) { UI.toast('제목과 내용을 모두 입력해 주세요.', 'err'); return; }
      var btn = m.body.querySelector('#askSubmit');
      btn.disabled = true; btn.textContent = '접수 중…';
      FB.addInquiry({ title: title, content: content, contact: contact }, u).then(function (item) {
        m.close();
        UI.toast(item.remote ? '문의가 접수되었습니다. 나의 문의에서 확인할 수 있습니다.' : '이 기기에 문의가 저장되었습니다. (서버 접수 불가)', 'ok');
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = '문의 접수하기';
        UI.toast(FB.errMsg(e), 'err');
      });
    });
  }

  function myModal() {
    var u = UI.currentUser();
    var m = UI.openModal({ title: '나의 문의 보기', body: '<div id="myBox"><div class="skel-row"><div class="skel" style="height:14px;width:70%"></div></div><div class="skel-row"><div class="skel" style="height:14px;width:55%"></div></div></div>' });
    FB.getMyInquiries(u).then(function (list) {
      var box = m.body.querySelector('#myBox');
      if (!list.length) { box.innerHTML = '<div class="empty"><p>접수한 문의가 없습니다.</p><small>1:1 문의로 궁금한 점을 남겨보세요.</small></div>'; return; }
      box.innerHTML = list.map(function (q) {
        return '<div class="my-q"><div class="my-q-top"><b>' + UI.esc(q.title) + '</b><span class="badge badge--ing">' + UI.esc(q.status || '접수완료') + '</span></div>' +
          '<p>' + UI.esc(q.content) + '</p><time>' + UI.esc(UI.fmtDate(q.date)) + '</time></div>';
      }).join('');
    }).catch(function (e) { m.body.querySelector('#myBox').innerHTML = '<div class="empty"><p>' + UI.esc(FB.errMsg(e)) + '</p></div>'; });
  }

  function start() {
    UI.skelRows($('csGrid'), 5);

    var search = $('csSearch');
    var tm = null;
    search.addEventListener('input', function () {
      clearTimeout(tm);
      tm = setTimeout(function () {
        S.q = search.value.trim();
        if (S.loaded) renderList();
      }, 220);
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { S.q = search.value.trim(); if (S.loaded) renderList(); }
    });
    $('csAsk').addEventListener('click', askModal);
    $('csMyBtn').addEventListener('click', myModal);
    $('goCsList').addEventListener('click', function () { renderList(); });

    loadAll().then(function () {
      return FB.getBanners().then(function (bs) {
        UI.fillPageBanner($('csBannerMedia'), 'cs', bs);
      });
    }).then(function () {
      renderList();
    }).catch(function (e) {
      UI.toast(FB.errMsg(e) + ' — 고객센터 데이터를 불러오지 못했습니다.', 'err');
      UI.empty($('csGrid'), { title: '고객센터 정보를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();


+++ public/js/CustomerService.js (修改后)
/* ============================================================
   FPP v2 — CustomerService.js
   고객센터: 검색 / 목록 / 상세 / 1:1 문의 / 나의 문의 (좋아요·공유 없음)
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = { faqs: [], loaded: false, q: '' };

  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    /* 공지사항(notices)이 아닌 고객센터 전용 데이터만 불러온다 */
    return FB.getCustomerService().then(function (list) { S.faqs = list; S.loaded = true; });
  }

  function filtered() {
    var q = S.q.toLowerCase();
    if (!q) return S.faqs;
    return S.faqs.filter(function (f) {
      return (f.title || '').toLowerCase().indexOf(q) > -1 ||
        (f.content || '').toLowerCase().indexOf(q) > -1 ||
        (f.author || '').toLowerCase().indexOf(q) > -1;
    });
  }

  function renderList() {
    $('csListSection').hidden = false;
    $('csDetail').hidden = true;
    var el = $('csGrid');
    var list = filtered();
    if (!list.length) {
      UI.empty(el, { title: S.q ? '\'' + S.q + '\' 검색 결과가 없습니다.' : '등록된 고객센터 정보가 없습니다.', desc: S.q ? '다른 키워드로 검색해 보세요.' : '' });
      return;
    }
    el.innerHTML = '<ul class="cs-rows">' + list.map(function (f) {
      return '<li class="cs-row" data-id="' + UI.esc(f.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(f.title) + '">' +
        '<span class="cs-q-ic" aria-hidden="true">Q</span>' +
        '<div class="cs-row-tx"><b>' + UI.esc(f.title) + '</b>' +
        '<small>' + (f.category ? '<em class="badge badge--patch">' + UI.esc(f.category) + '</em> ' : '') + UI.esc(f.author) + ' · ' + UI.esc(UI.fmtDate(f.date)) + '</small></div>' +
        '<span class="cs-arrow" aria-hidden="true">›</span></li>';
    }).join('') + '</ul>';
    el.querySelectorAll('.cs-row').forEach(function (row) {
      var open = function () { renderDetail(row.getAttribute('data-id')); };
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    });
    UI.watchReveals(el);
  }

  function renderDetail(id) {
    var f = S.faqs.filter(function (x) { return x.docId === id; })[0];
    if (!f) return;
    $('csListSection').hidden = true;
    var detail = $('csDetail');
    detail.hidden = false;
    var csBadge = $('csBadge');
    if (f.category) { csBadge.textContent = f.category; csBadge.hidden = false; }
    else csBadge.hidden = true;
    $('csTitle').textContent = f.title;
    $('csMeta').textContent = f.author + ' · ' + UI.fmtDate(f.date);
    $('csContent').innerHTML = UI.renderContent(f.content);
    $('csList').innerHTML = '<ul class="lst">' + filtered().slice(0, 6).map(function (x) {
      return '<li class="lst-row" data-id="' + UI.esc(x.docId) + '" tabindex="0" role="button">' +
        '<div class="lst-main"><div class="lst-l1"><span class="badge badge--patch">고객센터</span>' +
        '<span class="lst-title">' + UI.esc(x.title) + '</span></div>' +
        '<div class="lst-l2"><span>' + UI.esc(x.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(x.date)) + '</span></div></div></li>';
    }).join('') + '</ul>';
    document.querySelectorAll('#csList .lst-row').forEach(function (row) {
      var go = function () { renderDetail(row.getAttribute('data-id')); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
    window.scrollTo({ top: 0 });
    UI.watchReveals(detail);
  }

  function askModal() {
    var u = UI.currentUser();
    var m = UI.openModal({
      title: '1:1 문의',
      body: '<div class="fld"><span class="fld-lb">제목</span><input id="askTitle" type="text" maxlength="60" placeholder="문의 제목"></div>' +
        '<div class="fld"><span class="fld-lb">내용</span><textarea id="askContent" rows="6" maxlength="1000" placeholder="문의 내용을 자세히 적어주세요."></textarea></div>' +
        '<div class="fld"><span class="fld-lb">회신 받을 이메일</span><input id="askContact" type="email" value="' + UI.esc(u ? (u.email || '') : '') + '" placeholder="email@example.com"></div>' +
        (u ? '' : '<p class="pick-note">비로그인 상태에서도 접수할 수 있습니다.</p>') +
        '<button class="btn btn--gold btn--block" id="askSubmit" type="button" style="margin-top:14px">문의 접수하기</button>'
    });
    m.body.querySelector('#askSubmit').addEventListener('click', function () {
      var title = m.body.querySelector('#askTitle').value.trim();
      var content = m.body.querySelector('#askContent').value.trim();
      var contact = m.body.querySelector('#askContact').value.trim();
      if (!title || !content) { UI.toast('제목과 내용을 모두 입력해 주세요.', 'err'); return; }
      var btn = m.body.querySelector('#askSubmit');
      btn.disabled = true; btn.textContent = '접수 중…';
      FB.addInquiry({ title: title, content: content, contact: contact }, u).then(function (item) {
        m.close();
        UI.toast(item.remote ? '문의가 접수되었습니다. 나의 문의에서 확인할 수 있습니다.' : '이 기기에 문의가 저장되었습니다. (서버 접수 불가)', 'ok');
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = '문의 접수하기';
        UI.toast(FB.errMsg(e), 'err');
      });
    });
  }

  function myModal() {
    var u = UI.currentUser();
    var m = UI.openModal({ title: '나의 문의 보기', body: '<div id="myBox"><div class="skel-row"><div class="skel" style="height:14px;width:70%"></div></div><div class="skel-row"><div class="skel" style="height:14px;width:55%"></div></div></div>' });
    FB.getMyInquiries(u).then(function (list) {
      var box = m.body.querySelector('#myBox');
      if (!list.length) { box.innerHTML = '<div class="empty"><p>접수한 문의가 없습니다.</p><small>1:1 문의로 궁금한 점을 남겨보세요.</small></div>'; return; }
      box.innerHTML = list.map(function (q) {
        return '<div class="my-q"><div class="my-q-top"><b>' + UI.esc(q.title) + '</b><span class="badge badge--ing">' + UI.esc(q.status || '접수완료') + '</span></div>' +
          '<p>' + UI.esc(q.content) + '</p><time>' + UI.esc(UI.fmtDate(q.date)) + '</time></div>';
      }).join('');
    }).catch(function (e) { m.body.querySelector('#myBox').innerHTML = '<div class="empty"><p>' + UI.esc(FB.errMsg(e)) + '</p></div>'; });
  }

  function start() {
    UI.skelRows($('csGrid'), 5);

    var search = $('csSearch');
    var tm = null;
    search.addEventListener('input', function () {
      clearTimeout(tm);
      tm = setTimeout(function () {
        S.q = search.value.trim();
        if (S.loaded) renderList();
      }, 220);
    });
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { S.q = search.value.trim(); if (S.loaded) renderList(); }
    });
    $('csAsk').addEventListener('click', askModal);
    $('csMyBtn').addEventListener('click', myModal);
    $('goCsList').addEventListener('click', function () { renderList(); });

    loadAll().then(function () {
      return FB.getBanners().then(function (bs) {
        UI.fillPageBanner($('csBannerMedia'), 'cs', bs);
      });
    }).then(function () {
      renderList();
    }).catch(function (e) {
      UI.toast(FB.errMsg(e) + ' — 고객센터 데이터를 불러오지 못했습니다.', 'err');
      UI.empty($('csGrid'), { title: '고객센터 정보를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
