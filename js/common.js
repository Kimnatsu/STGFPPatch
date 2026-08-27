/* ============================================================
   FPP v2 — common.js
   공통 UI 레이어: 헤더/데스크톱 내비/탭/팝업/모달/테마/i18n/배너/토스트
   ============================================================ */
window.UI = (function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escBr(s) {
    return esc(s).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\n/g, '<br>');
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function fmtDate(d) {
    if (!d) return '';
    var s = String(d);
    if (/^\d+$/.test(s)) {
      var dt = new Date(+s > 1e12 ? +s : +s * 1000);
      s = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    }
    var m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '.' + pad2(m[2]) + '.' + pad2(m[3]);
    return s.slice(0, 10).replace(/-/g, '.');
  }
  function isNew(d) {
    if (!d) return false;
    var t = new Date(String(d).replace(/-/g, '/')).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t < 7 * 24 * 3600 * 1000;
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('fpp_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('fpp_' + k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- 아바타 ---------- */
  function avaSVG(hue) {
    return 'image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="16" fill="hsl(' + hue + ',45%,26%)"/>' +
      '<circle cx="32" cy="24" r="10" fill="hsl(' + hue + ',62%,74%)"/>' +
      '<path d="M12 58c2-13 11-19 20-19s18 6 20 19z" fill="hsl(' + hue + ',62%,74%)"/>' +
      '<path d="M20 15l6 4-6 3zM44 12l-5 5 6 2z" fill="hsl(' + hue + ',80%,60%)" opacity=".8"/></svg>');
  }
  var AVATARS = [210, 42, 4, 168, 262, 122, 196, 330].map(function (h) { return 'data:' + avaSVG(h); });
  var PLACEHOLDER_IMG = AVATARS[0];
  function avatarOf(icon) {
    var i = parseInt(icon, 10);
    return AVATARS[isNaN(i) ? 0 : Math.abs(i) % AVATARS.length];
  }

  /* ---------- i18n ---------- */
  var I18N = {
    ko: { home: '홈', characters: '캐릭터', pvp: 'PvP 패치', community: '커뮤니티', cs: '고객센터', login: '로그인', signup: '회원가입' },
    en: { home: 'Home', characters: 'Characters', pvp: 'PvP Patch', community: 'Community', cs: 'Support', login: 'Login', signup: 'Sign up' }
  };
  var LANG = store.get('lang', 'ko');
  function t(k) { return (I18N[LANG] && I18N[LANG][k]) || I18N.ko[k] || k; }
  function applyI18n() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
  }

  /* ---------- 아이콘 (인라인 SVG, 폰트 폴백) ---------- */
  var IC = {
    /* 설정 — 표준 톱니바퀴 */
    gear: '<span class="ficon ficon-gear" aria-hidden="true"><svg class="ficon-fb" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>',
    /* 즐겨찾기 — 북마크+별 (원본 gnb-font-icon \e98f 재현) */
    bookmark: '<span class="ficon ficon-bookmark" aria-hidden="true"><svg class="ficon-fb" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/><path fill="currentColor" stroke="none" d="M12 6.6l1.7 3.44 3.8.55-2.75 2.68.65 3.78L12 15.27l-3.4 1.78.65-3.78L6.5 10.6l3.8-.55z"/></svg></span>',
    heart: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20l-7-6.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 7 6.8z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5l-7 7 7 7"/></svg>',
    burger: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>'
  };

  /* ---------- 테마 ---------- */
  function applyTheme(th) {
    document.documentElement.setAttribute('data-theme', th === 'light' ? 'light' : 'dark');
    store.set('theme', th === 'light' ? 'light' : 'dark');
  }

  /* ---------- 데모 모드 ---------- */
  var DEMO_KEY = 'demo_user';
  function demoData() { return store.get(DEMO_KEY, null); }
  function isDemo() { return !!demoData(); }
  function enterDemo() {
    if (!demoData()) {
      store.set(DEMO_KEY, {
        uid: 'demo-user', email: 'demo@fpp.kr', nickname: '데모 선원', profileIcon: 1,
        settings: { patch: true, fav: true, event: true, comment: true },
        favChars: [1, 2, 3, 4, 5, 6], favSupports: [1, 2],
        counts: { posts: 3, comments: 12, likes: 27 }
      });
    }
    toast('데모 로그인으로 전환했습니다.', 'ok');
    loadUserDoc().then(notifyUser);
  }
  function exitDemo() {
    store.set(DEMO_KEY, null);
    toast('데모 로그아웃 되었습니다.');
    notifyUser();
  }

  /* ---------- 사용자 상태 ---------- */
  var _fbUser = null, _userDoc = null, _userCbs = [];
  function currentUser() {
    if (_fbUser) return _fbUser;
    var d = demoData();
    if (d) return { uid: d.uid, email: d.email, displayName: d.nickname, demo: true, providerData: [] };
    return null;
  }
  function userDoc() {
    if (_userDoc) return _userDoc;
    if (isDemo()) return demoData();
    return null;
  }
  function loadUserDoc() {
    var u = currentUser();
    if (!u) { _userDoc = null; return Promise.resolve(null); }
    if (u.demo) { _userDoc = demoData(); return Promise.resolve(_userDoc); }
    return FB.getUserDoc(u.uid).then(function (d) { _userDoc = d || { nickname: u.displayName || '선원' }; return _userDoc; });
  }
  function saveUserPatch(patch) {
    var u = currentUser();
    if (!u) return Promise.reject(new Error('로그인이 필요합니다.'));
    if (u.demo) {
      var d = demoData() || {};
      Object.keys(patch).forEach(function (k) { d[k] = patch[k]; });
      store.set(DEMO_KEY, d);
      _userDoc = d;
      return Promise.resolve(d);
    }
    return FB.updateUserDoc(u.uid, patch).then(function () {
      _userDoc = Object.assign(_userDoc || {}, patch);
      return _userDoc;
    });
  }
  function onUser(cb) { _userCbs.push(cb); }
  function notifyUser() {
    updateAuthArea();
    _userCbs.forEach(function (cb) { try { cb(currentUser(), userDoc()); } catch (e) { } });
  }

  /* ---------- 즐겨찾기 ---------- */
  var favCache = { chars: [], supports: [] };
  function loadFavs() {
    var u = currentUser();
    if (!u) { favCache = { chars: [], supports: [] }; return Promise.resolve(favCache); }
    if (u.demo) {
      var d = demoData() || {};
      favCache = { chars: d.favChars || [], supports: d.favSupports || [] };
      return Promise.resolve(favCache);
    }
    return FB.getFavs(u.uid).then(function (f) { favCache = f; return f; }).catch(function () { return favCache; });
  }
  function isFav(kind, id) {
    var arr = kind === 'support' ? favCache.supports : favCache.chars;
    return arr.indexOf(id) > -1 || arr.indexOf(String(id)) > -1;
  }
  function toggleFav(kind, id) {
    var u = currentUser();
    if (!u) { toast('로그인 후 이용할 수 있습니다.'); return Promise.resolve(false); }
    var key = kind === 'support' ? 'favSupports' : 'favChars';
    var doc = userDoc();
    var arr = (doc && doc[key]) ? doc[key].slice() : (kind === 'support' ? favCache.supports.slice() : favCache.chars.slice());
    var idx = arr.indexOf(id);
    if (idx < 0) idx = arr.indexOf(String(id));
    var nowOn;
    if (idx > -1) { arr.splice(idx, 1); nowOn = false; }
    else { arr.push(id); nowOn = true; }
    var patch = {}; patch[key] = arr;
    return saveUserPatch(patch).then(function () {
      favCache[key === 'favSupports' ? 'supports' : 'chars'] = arr;
      document.dispatchEvent(new CustomEvent('fpp:fav-changed'));
      return nowOn;
    });
  }

  /* ---------- 내비게이션 ---------- */
  var NAV = [
    { key: 'home', page: 'Main.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>' },
    { key: 'characters', page: 'Main.html', hash: '#characters', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.9-3.6 3.2-5.4 6.2-5.4s5.3 1.8 6.2 5.4" stroke-linecap="round"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.4c2.9-.4 5 1.2 5.8 4.3" stroke-linecap="round"/></svg>' },
    { key: 'pvp', page: 'Main.html', hash: '#pvp', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 19l4.5-4.5M14.5 4.5l-9 9 3 3 9-9zM13 6l5 5M17.5 3.5l3 3"/></svg>' },
    { key: 'community', page: 'Community.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5h16v12h-9l-4.5 3.5V17H4z"/><path d="M8 9.5h8M8 12.5h5" stroke-linecap="round"/></svg>' },
    { key: 'cs', page: 'CustomerService.html', hash: '', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12a7 7 0 0 1 14 0v3.5a2 2 0 0 1-2 2h-1.5V13H19" stroke-linejoin="round"/><path d="M5 12v5.5a2 2 0 0 0 2 2H8.5V13H5" stroke-linejoin="round"/><path d="M12 21c2 0 3.5-1 4-2.5" stroke-linecap="round"/></svg>' }
  ];
  /* 커뮤니티 전용 메뉴 (§27) */
  var COMM_NAV = [
    { key: 'comhome', page: 'Community.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5h16v11h-8l-4 3.5V16H4z"/><path d="M8.5 9h7M8.5 12h4.5" stroke-linecap="round"/></svg>', tabLabel: { ko: '홈', en: 'Home' } },
    { key: 'patch', page: 'Community.html', hash: '#patch', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9.5 12h6M9.5 15.5h4" stroke-linecap="round"/></svg>', tabLabel: { ko: '패치노트', en: 'Patches' } },
    { key: 'board', page: 'Community.html', hash: '#board', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>', tabLabel: { ko: '게시판', en: 'Board' } },
    { key: 'event', page: 'Community.html', hash: '#event', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="4" y="9.5" width="16" height="4"/><path d="M5.5 13.5v6.5h13v-6.5M12 9.5v10.5"/><path d="M12 9.5S7.8 9.7 6.8 7.5C6 5.8 7.2 4.4 8.8 4.6c2.1.3 3.2 4.9 3.2 4.9zM12 9.5s4.2.2 5.2-2c.8-1.7-.4-3.1-2-2.9-2.1.3-3.2 4.9-3.2 4.9z"/></svg>', tabLabel: { ko: '이벤트', en: 'Events' } },
    { key: 'mainhome', page: 'Main.html', hash: '#home', exit: true, icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5h4A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 16.5L5.5 12 10 7.5"/><path d="M5.5 12H15"/></svg>', tabLabel: { ko: '메인 홈', en: 'Main' } }
  ];
  function navForPage() {
    return (document.body && document.body.getAttribute('data-page') === 'community') ? COMM_NAV : NAV;
  }
  var activeNav = 'home';

  function buildHeader() {
    var hd = $('appHeader');
    if (!hd) return;
    hd.innerHTML =
      '<div class="hd-in">' +
      '<button class="hd-burger icon-btn" id="btnBurger" aria-label="전체 메뉴 열기">' + IC.burger + '</button>' +
      '<a class="logo" href="Main.html#home" aria-label="FPP 홈으로">' +
      '<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 64 64" width="30" height="30"><circle cx="32" cy="32" r="29" fill="none" stroke="currentColor" stroke-width="4"/><path d="M32 13c-8 0-14 6-14 13 0 5 3 9 7 11v6l4-2 3 3 3-3 4 2v-6c4-2 7-6 7-11 0-7-6-13-14-13z" fill="currentColor"/></svg></span>' +
      '<span class="logo-txt">FPP</span></a>' +
      '<div class="hd-right">' +
      '<button class="icon-btn" id="btnFav" aria-label="즐겨찾기">' + IC.bookmark + '</button>' +
      '<button class="icon-btn" id="btnSet" aria-label="설정">' + IC.gear + '</button>' +
      '<div class="hd-auth" id="hdAuth"></div>' +
      '</div></div>';
    $('btnBurger').addEventListener('click', toggleDrawer);
    $('btnFav').addEventListener('click', function (e) { e.stopPropagation(); openFavPopup($('btnFav')); });
    $('btnSet').addEventListener('click', function (e) { e.stopPropagation(); onSettingsClick($('btnSet')); });
  }

  function buildDeskNav() {
    var nv = $('desktopNav');
    if (!nv) return;
    var items = navForPage();
    nv.innerHTML = '<div class="wrap dnav-in">' + items.map(function (n) {
      return '<a class="dnav' + (n.exit ? ' dnav--exit' : '') + '" data-nav="' + n.key + '" href="' + n.page + n.hash + '">' + t(n.key === 'comhome' ? 'home' : (n.key === 'mainhome' ? 'home' : n.key)) + '</a>';
    }).join('') + '</div>';
    /* 데스크톱 내비 라벨 보정 (커뮤니티 전용 명칭) */
    var labels = { comhome: '커뮤니티 홈', patch: '패치노트', board: '게시판', event: '이벤트', mainhome: '메인 홈', home: t('home'), characters: t('characters'), pvp: t('pvp'), community: t('community'), cs: t('cs') };
    nv.querySelectorAll('.dnav').forEach(function (a) {
      var k = a.getAttribute('data-nav');
      if (labels[k]) a.textContent = labels[k];
    });
  }

  function updateAuthArea() {
    var box = $('hdAuth');
    if (!box) return;
    var u = currentUser();
    if (!u) {
      box.innerHTML =
        '<button class="btn btn--ghost btn--sm" data-auth="signup">' + t('signup') + '</button>' +
        '<button class="btn btn--gold btn--sm" data-auth="login">' + t('login') + '</button>' +
        '<button class="btn btn--ghost btn--sm hd-demo" id="btnDemo" title="데모 로그인 — Firebase에 저장되지 않습니다">데모</button>';
      box.querySelector('[data-auth="login"]').addEventListener('click', function () { location.href = 'Login.html'; });
      box.querySelector('[data-auth="signup"]').addEventListener('click', function () { location.href = 'Login.html#signup'; });
      box.querySelector('#btnDemo').addEventListener('click', function () { enterDemo(); });
      return;
    }
    var ud = userDoc() || {};
    box.innerHTML =
      (u.demo ? '<span class="demo-chip" title="데모 모드 — Firebase에 저장되지 않습니다">DEMO</span>' : '') +
      '<button class="hd-avatar" id="btnProfile" aria-label="프로필 메뉴"><img src="' + esc(avatarOf(ud.profileIcon)) + '" alt="내 프로필"></button>';
    box.querySelector('#btnProfile').addEventListener('click', function (e) { e.stopPropagation(); openProfilePopup(box.querySelector('#btnProfile')); });
  }

  function buildTabs() {
    var tabs = $('bottomTabs');
    if (!tabs) return;
    var items = navForPage();
    if (items === NAV) items = NAV.slice(0, 4);
    tabs.innerHTML = items.map(function (n) {
      var label = (n.tabLabel && n.tabLabel[LANG]) || t(n.key);
      return '<a class="btab' + (n.exit ? ' btab--exit' : '') + '" data-nav="' + n.key + '" href="' + n.page + n.hash + '" aria-label="' + t(n.key) + '">' + n.icon + '<span>' + label + '</span></a>';
    }).join('');
  }
  function buildDrawer() {
    var dw = $('navDrawer');
    if (!dw) return;
    dw.innerHTML =
      '<div class="drawer-head"><span class="logo-txt">FPP</span>' +
      '<button class="icon-btn" id="btnDrawerClose" aria-label="메뉴 닫기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<nav class="drawer-nav">' + NAV.map(function (n) {
        return '<a class="drawer-item" data-nav="' + n.key + '" href="' + n.page + n.hash + '">' + n.icon + '<span>' + t(n.key) + '</span></a>';
      }).join('') + '</nav>';
    $('btnDrawerClose').addEventListener('click', toggleDrawer);
    var bd = $('drawerBackdrop');
    if (bd) bd.addEventListener('click', toggleDrawer);
  }
  function toggleDrawer() {
    var dw = $('navDrawer'), bd = $('drawerBackdrop');
    var open = dw.classList.toggle('open');
    if (bd) bd.hidden = !open;
    dw.setAttribute('aria-hidden', String(!open));
  }
  function setActiveNav(key) {
    activeNav = key;
    var map = { comhome: 'community', patch: 'community', board: 'community', event: 'community' };
    var k = document.querySelector('[data-nav="' + key + '"]') ? key : (map[key] || key);
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-nav') === k);
    });
  }

  /* ---------- 팝업 ---------- */
  function closePopups() {
    var root = $('popupRoot');
    if (root) root.innerHTML = '';
    document.removeEventListener('click', onDocClickPop);
  }
  function onDocClickPop(e) {
    if (!e.target.closest || !e.target.closest('.pop')) closePopups();
  }
  function openPopup(anchor, html, width) {
    closePopups();
    var el = document.createElement('div');
    el.className = 'pop';
    if (width) el.style.width = width;
    el.innerHTML = html;
    $('popupRoot').appendChild(el);
    var r = anchor.getBoundingClientRect();
    var pw = width ? parseInt(width, 10) : 300;
    var left = Math.min(Math.max(8, r.right - pw), window.innerWidth - pw - 8);
    el.style.left = left + 'px';
    el.style.top = (r.bottom + 10) + 'px';
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { document.addEventListener('click', onDocClickPop); }, 0);
    return { el: el, close: closePopups };
  }

  function openFavPopup(anchor) {
    var u = currentUser();
    var pop = openPopup(anchor,
      '<div class="pop-head"><b>즐겨찾기</b>' + (u && u.demo ? ' <span class="demo-chip demo-chip--sm">DEMO</span>' : '') + '</div>' +
      '<div class="pop-tabs"><button class="pop-tab is-on" data-ft="char" type="button">캐릭터</button>' +
      '<button class="pop-tab" data-ft="support" type="button">현질 서폿 캐릭터</button></div>' +
      '<div class="pop-body" id="favBody"></div>', '320px');
    var kind = 'char';
    function paint() {
      var body = pop.el.querySelector('#favBody');
      var arr = kind === 'char' ? favCache.chars : favCache.supports;
      var pageTab = kind === 'char' ? '' : '?tab=support';
      if (!arr.length) {
        body.innerHTML = '<div class="empty fav-empty"><p>즐겨찾기한 캐릭터 없음</p><small>추가해보세요</small>' +
          '<a class="btn btn--gold btn--sm" href="Main.html#characters' + pageTab + '">캐릭터 페이지로</a></div>';
        return;
      }
      body.innerHTML = '<div class="fav-grid">' + arr.slice(0, 16).map(function (id) {
        var c = window.__FPP_CHARS ? window.__FPP_CHARS(id, kind) : null;
        var img = c ? (c.image || PLACEHOLDER_IMG) : PLACEHOLDER_IMG;
        var nm = c ? c.name : ('No.' + id);
        return '<button class="fav-cell" type="button" data-fid="' + esc(id) + '" aria-label="' + esc(nm) + '">' +
          '<span class="fav-ava"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>' +
          '<span class="fav-nm">' + esc(nm) + '</span></button>';
      }).join('') + '</div>';
      body.querySelectorAll('.fav-cell').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-fid');
          location.href = 'Main.html#characters' + pageTab + (pageTab ? '&' : '?') + 'fav=1&char=' + encodeURIComponent(id);
        });
      });
    }
    pop.el.querySelectorAll('.pop-tab').forEach(function (tb) {
      tb.addEventListener('click', function () {
        kind = tb.getAttribute('data-ft');
        pop.el.querySelectorAll('.pop-tab').forEach(function (x) { x.classList.toggle('is-on', x === tb); });
        paint();
      });
    });
    loadFavs().then(paint);
  }

  function onSettingsClick(anchor) {
    if (window.matchMedia('(max-width:767px)').matches) { location.href = 'Setting.html'; return; }
    var items = [
      ['notice', '공지사항', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h5" stroke-linejoin="round" stroke-linecap="round"/></svg>'],
      ['notify', '알림 설정', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zM10 19a2 2 0 0 0 4 0" stroke-linejoin="round"/></svg>'],
      ['theme', '테마 변경', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5z" stroke-linejoin="round"/></svg>'],
      ['appIcon', '앱 아이콘 변경', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 13.5l2.2 2.2L15.5 11" stroke-linecap="round" stroke-linejoin="round"/></svg>'],
      ['lang', '언어 변경', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.7 2.6 4 5.7 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.7-4-9s1.3-6.4 4-9z"/></svg>']
    ];
    var pop = openPopup(anchor,
      '<div class="pop-head"><b>설정</b></div>' +
      '<div class="pop-body">' + items.map(function (it) {
        return '<button class="pop-item" data-act="' + it[0] + '" type="button">' + it[2] + '<span>' + it[1] + '</span></button>';
      }).join('') + '</div>', '260px');
    pop.el.querySelectorAll('.pop-item').forEach(function (b) {
      b.addEventListener('click', function () {
        closePopups();
        var fn = SET_ACTIONS[b.getAttribute('data-act')];
        if (fn) fn();
      });
    });
  }

  function openProfilePopup(anchor) {
    var u = currentUser();
    if (!u) return;
    var ud = userDoc() || {};
    var c = ud.counts || {};
    var pop = openPopup(anchor,
      '<div class="profile-card">' +
      (u.demo ? '<div class="demo-banner">데모 모드 — 변경 사항은 이 브라우저에만 저장됩니다.</div>' : '') +
      '<div class="prof-top"><span class="prof-ava"><img src="' + esc(avatarOf(ud.profileIcon)) + '" alt="프로필 이미지"></span>' +
      '<b class="prof-nick">' + esc(ud.nickname || u.displayName || '선원') + '</b></div>' +
      '<div class="prof-stats">' +
      '<div><b>' + (c.posts || 0) + '</b><small>게시글</small></div>' +
      '<div><b>' + (c.comments || 0) + '</b><small>댓글</small></div>' +
      '<div><b>' + (c.likes || 0) + '</b><small>좋아요</small></div></div>' +
      '</div>' +
      '<div class="pop-body">' +
      '<button class="pop-item" id="pfMy" type="button">' + IC.user + '<span>내 정보</span></button>' +
      '<button class="pop-item" id="pfOut" type="button"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h-8v16h8M10 12h11M18 8.5L21.5 12 18 15.5"/></svg><span>로그아웃</span></button>' +
      '</div>', '300px');
    pop.el.querySelector('#pfMy').addEventListener('click', function () { closePopups(); openMyInfo(); });
    pop.el.querySelector('#pfOut').addEventListener('click', function () {
      closePopups();
      if (u.demo) { exitDemo(); return; }
      if (FB.ready) FB.auth().signOut().then(function () { toast('로그아웃 되었습니다.'); });
    });
  }

  /* ---------- 바디 스크롤 잠금 (패널·모дал 오픈 시 뒷배경 고정) ---------- */
  var lockCount = 0, lockY = 0;
  function lockBody() {
    if (lockCount === 0) {
      lockY = window.scrollY || document.documentElement.scrollTop || 0;
      var sw = window.innerWidth - document.documentElement.clientWidth; /* 스크롤바 폭 보정 */
      document.body.classList.add('body-lock');
      document.body.style.top = -lockY + 'px';
      if (sw > 0) document.body.style.paddingRight = sw + 'px';
    }
    lockCount++;
  }
  function unlockBody() {
    if (lockCount === 0) return;
    lockCount--;
    if (lockCount === 0) {
      document.body.classList.remove('body-lock');
      document.body.style.top = '';
      document.body.style.paddingRight = '';
      window.scrollTo(0, lockY);
    }
  }

  /* ---------- 모달 ---------- */
  function openModal(opts) {
    var back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = '<div class="modal ' + (opts.cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="modal-head"><h3>' + esc(opts.title) + '</h3>' +
      '<button class="modal-x" type="button" aria-label="닫기"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal-body">' + opts.body + '</div></div>';
    $('popupRoot').appendChild(back);
    requestAnimationFrame(function () { back.classList.add('show'); });
    lockBody(); /* 뒷배경 스크롤 잠금 */
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      back.classList.remove('show');
      unlockBody();
      setTimeout(function () { back.remove(); }, 260);
    }
    back.querySelector('.modal-x').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function h(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', h); } });
    return { el: back, body: back.querySelector('.modal-body'), close: close };
  }

  /* ---------- 설정 액션 ---------- */
  var SET_ACTIONS = {
    notice: function () {
      var m = openModal({ title: '공지사항', body: '<div class="skel-row"><div class="skel" style="height:14px;width:70%"></div></div><div class="skel-row"><div class="skel" style="height:14px;width:55%"></div></div>' });
      FB.getNotices().then(function (list) {
        if (!list.length) { m.body.innerHTML = '<div class="empty"><p>등록된 공지사항이 없습니다.</p></div>'; return; }
        m.body.innerHTML = list.map(function (n) {
          return '<div class="ntc-row" data-nid="' + esc(n.docId) + '" role="button" tabindex="0"><div class="ntc-t"><span class="badge badge--patch">공지</span>' + esc(n.title) + '</div>' +
            '<div class="ntc-m">' + esc(n.author) + ' · ' + esc(fmtDate(n.date)) + '</div></div>';
        }).join('');
        m.body.querySelectorAll('.ntc-row').forEach(function (r) {
          r.addEventListener('click', function () {
            var n = list.filter(function (x) { return x.docId === r.getAttribute('data-nid'); })[0];
            if (n) {
              m.body.innerHTML = '<button class="btn btn--ghost btn--sm" id="ntcBack" type="button">← 목록</button>' +
                '<h4 style="margin:14px 0 6px;font-size:16px">' + esc(n.title) + '</h4>' +
                '<p style="font-size:12px;color:var(--text-3);margin-bottom:12px">' + esc(n.author) + ' · ' + esc(fmtDate(n.date)) + '</p>' +
                '<div class="rich">' + renderContent(n.content) + '</div>';
              m.body.querySelector('#ntcBack').addEventListener('click', function () { m.close(); SET_ACTIONS.notice(); });
            }
          });
        });
      }).catch(function (e) { m.body.innerHTML = '<div class="empty"><p>' + esc(FB.errMsg(e)) + '</p></div>'; });
    },
    notify: function () {
      var s = (userDoc() && userDoc().settings) || {};
      var rows = [['patch', '패치노트'], ['fav', '즐겨찾기'], ['event', '이벤트'], ['comment', '댓글']];
      var m = openModal({
        title: '알림 설정',
        body: rows.map(function (r) {
          var on = s[r[0]] !== false;
          return '<div class="tgl-row"><span>' + r[1] + ' 알림</span>' +
            '<button class="tgl' + (on ? ' on' : '') + '" data-k="' + r[0] + '" role="switch" aria-checked="' + on + '" aria-label="' + r[1] + ' 알림" type="button"><i></i></button></div>';
        }).join('')
      });
      m.body.querySelectorAll('.tgl').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-k');
          var on = !b.classList.contains('on');
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
          var st = (userDoc() && userDoc().settings) || {};
          st[k] = on;
          saveUserPatch({ settings: st }).catch(function () { });
          var label = rows.filter(function (r) { return r[0] === k; })[0][1];
          toast(label + ' 알림이 ' + (on ? '켜졌습니다.' : '꺼졌습니다.'), 'ok');
        });
      });
    },
    theme: function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var m = openModal({
        title: '테마 변경',
        body: '<div class="pick-grid">' +
          '<button class="pick' + (cur === 'dark' ? ' is-on' : '') + '" data-th="dark" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5z" stroke-linejoin="round"/></svg>다크</button>' +
          '<button class="pick' + (cur === 'light' ? ' is-on' : '') + '" data-th="light" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" stroke-linecap="round"/></svg>라이트</button>' +
          '</div>'
      });
      m.body.querySelectorAll('.pick').forEach(function (b) {
        b.addEventListener('click', function () {
          applyTheme(b.getAttribute('data-th'));
          m.body.querySelectorAll('.pick').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          toast('테마가 적용되었습니다.', 'ok');
        });
      });
    },
    appIcon: function () {
      var cur = (userDoc() && userDoc().settings && userDoc().settings.appIcon) || 'navy';
      var icons = [['navy', '네이비'], ['gold', '골드'], ['red', '크림슨'], ['teal', '틸']];
      var m = openModal({
        title: '앱 아이콘 변경',
        body: '<div class="pick-grid">' + icons.map(function (ic) {
          return '<button class="pick pick--icon' + (cur === ic[0] ? ' is-on' : '') + '" data-ic="' + ic[0] + '" type="button">' +
            '<span class="icon-prev icon-' + ic[0] + '"><svg viewBox="0 0 64 64" width="30" height="30"><path d="M32 10c-9 0-16 7-16 15 0 6 3 10 8 12v7l5-2 3 3 3-3 5 2v-7c5-2 8-6 8-12 0-8-7-15-16-15z" fill="currentColor"/></svg></span>' + ic[1] + '</button>';
        }).join('') + '</div>' +
        '<p class="pick-note">선택한 앱 아이콘은 바탕화면 바로가기 생성 시 적용됩니다.</p>' +
        '<button class="btn btn--gold btn--block" id="mkShortcut" type="button" style="margin-top:12px">바탕화면 바로가기 만들기</button>'
      });
      m.body.querySelectorAll('.pick').forEach(function (b) {
        b.addEventListener('click', function () {
          cur = b.getAttribute('data-ic');
          m.body.querySelectorAll('.pick').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          var s = (userDoc() && userDoc().settings) || {};
          s.appIcon = cur;
          saveUserPatch({ settings: s }).catch(function () { });
        });
      });
      var deferred = null;
      window.addEventListener('beforeinstallprompt', function (e) { deferred = e; });
      m.body.querySelector('#mkShortcut').addEventListener('click', function () {
        if (deferred) {
          deferred.prompt();
          deferred.userChoice.then(function (ch) {
            toast(ch.outcome === 'accepted' ? '바로가기가 생성되었습니다.' : '바로가기 생성이 취소되었습니다.');
            deferred = null;
          });
        } else {
          toast('이 브라우저는 바로가기 생성을 지원하지 않습니다. 브라우저 메뉴의 "홈 화면에 추가"를 이용해 주세요.');
        }
      });
    },
    lang: function () {
      var m = openModal({
        title: '언어 변경',
        body: '<div class="pick-grid">' +
          '<button class="pick' + (LANG === 'ko' ? ' is-on' : '') + '" data-lg="ko" type="button">한국어</button>' +
          '<button class="pick' + (LANG === 'en' ? ' is-on' : '') + '" data-lg="en" type="button">English</button></div>'
      });
      m.body.querySelectorAll('.pick').forEach(function (b) {
        b.addEventListener('click', function () {
          LANG = b.getAttribute('data-lg');
          store.set('lang', LANG);
          applyI18n(); buildDeskNav(); buildTabs(); setActiveNav(activeNav);
          m.body.querySelectorAll('.pick').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          toast(LANG === 'ko' ? '한국어로 변경되었습니다.' : 'Language set to English.', 'ok');
        });
      });
    }
  };

  /* ---------- 내 정보 ---------- */
  function openMyInfo() {
    var u = currentUser();
    if (!u) return;
    var ud = userDoc() || {};
    var m = openModal({
      title: '내 정보',
      body:
      '<div class="mi-sec"><span class="mi-lb">프로필 아이콘</span>' +
      '<div class="ava-grid">' + AVATARS.map(function (a, i) {
        return '<button class="ava-pick' + (Number(ud.profileIcon || 0) === i ? ' is-on' : '') + '" data-av="' + i + '" type="button" aria-label="프로필 아이콘 ' + (i + 1) + '"><img src="' + a + '" alt=""></button>';
      }).join('') + '</div></div>' +
      '<div class="mi-sec"><span class="mi-lb">닉네임</span>' +
      '<div class="mi-row"><b id="miNick">' + esc(ud.nickname || u.displayName || '선원') + '</b>' +
      '<button class="btn btn--ghost btn--sm" id="miNickBtn" type="button">변경</button></div></div>' +
      '<div class="mi-sec"><span class="mi-lb">로그인 이메일</span>' +
      '<div class="mi-row mi-mail">' + esc(u.email || '이메일 없음') + '</div></div>' +
      '<button class="btn btn--danger btn--block" id="miDel" type="button" style="margin-top:8px">탈퇴하기</button>'
    });
    m.body.querySelectorAll('.ava-pick').forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.getAttribute('data-av'));
        saveUserPatch({ profileIcon: i }).then(function () {
          m.body.querySelectorAll('.ava-pick').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          notifyUser();
          toast('프로필 아이콘이 변경되었습니다.', 'ok');
        }).catch(function (e) { toast(FB.errMsg(e), 'err'); });
      });
    });
    m.body.querySelector('#miNickBtn').addEventListener('click', function () {
      var cur = m.body.querySelector('#miNick');
      if (cur.querySelector('input')) return;
      var old = cur.textContent;
      cur.innerHTML = '<input id="miNickIn" maxlength="16" value="' + esc(old) + '" style="max-width:160px">';
      var save = function () {
        var inp = m.body.querySelector('#miNickIn');
        if (!inp) return;
        var v = inp.value.trim();
        if (!v) { cur.textContent = old; return; }
        saveUserPatch({ nickname: v }).then(function () {
          cur.textContent = v;
          notifyUser();
          toast('닉네임이 변경되었습니다.', 'ok');
        }).catch(function (e) { cur.textContent = old; toast(FB.errMsg(e), 'err'); });
      };
      var inp = m.body.querySelector('#miNickIn');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') save(); });
      inp.addEventListener('blur', save);
      inp.focus();
    });
    m.body.querySelector('#miDel').addEventListener('click', function () {
      if (u.demo) {
        toast('데모 계정은 탈퇴 대신 로그아웃됩니다.');
        m.close(); exitDemo();
        return;
      }
      var cf = openModal({
        title: '탈퇴 확인',
        body: '<p style="font-size:14px;line-height:1.7">정말 탈퇴하시겠습니까?<br><b style="color:var(--red)">계정과 Firebase 사용자 데이터가 삭제되며 복구할 수 없습니다.</b></p>' +
          '<div style="display:flex;gap:8px;margin-top:16px">' +
          '<button class="btn btn--ghost btn--block" id="delNo" type="button">취소</button>' +
          '<button class="btn btn--danger btn--block" id="delYes" type="button">탈퇴하기</button></div>'
      });
      cf.body.querySelector('#delNo').addEventListener('click', cf.close);
      cf.body.querySelector('#delYes').addEventListener('click', function () {
        var user = FB.auth().currentUser;
        if (!user) { cf.close(); m.close(); return; }
        user.delete().then(function () {
          cf.close(); m.close();
          toast('탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
        }).catch(function (e) {
          cf.close();
          toast(FB.errMsg(e) + ' — 보안 정책상 최근 로그인 후 다시 시도해 주세요.', 'err');
        });
      });
    });
  }

  /* ---------- 배너 ---------- */
  var PAGE_BANNERS = {
    characters: { image: 'https://image.qwenlm.ai/generated-images/987f7614-9aa7-4d15-8615-e46b88e3b65b/_result.png', title: '캐릭터', tag: 'CHARACTER ARCHIVE' },
    pvp: { image: 'https://image.qwenlm.ai/generated-images/f6395166-19bd-4970-8d7b-b86ac14dc624/_result.png', title: 'PvP 패치', tag: 'BALANCE UPDATE' },
    community: { image: 'https://image.qwenlm.ai/generated-images/6675fceb-63e6-4e40-830f-3de5669b163a/_result.png', title: '커뮤니티', tag: 'CREW BOARD' },
    patch: { image: 'https://image.qwenlm.ai/generated-images/dde0cd4a-dbb2-4686-bd7e-6e4493d52f77/_result.png', title: '패치노트', tag: 'PATCH LOG' },
    board: { image: 'https://image.qwenlm.ai/generated-images/f81f7d7e-65e0-41f7-902f-7a0309e951fd/_result.png', title: '게시판', tag: 'MESSAGE BOARD' },
    event: { image: 'https://image.qwenlm.ai/generated-images/5e736e5b-ebea-4077-9479-ff5ee9aeae09/_result.png', title: '이벤트', tag: 'FESTIVAL' },
    cs: { image: 'https://image.qwenlm.ai/generated-images/1f2f41ad-4373-4c23-a185-5a2b8a6bd506/_result.png', title: '고객센터', tag: 'HELP CENTER' }
  };
  function fillBanner(mediaEl, fallbackTitle, items) {
    if (!mediaEl) return;
    var parent = mediaEl.parentElement;
    var oldTag = parent.querySelector('.banner-tag');
    if (oldTag) oldTag.remove();
    var oldDots = parent.querySelector('.banner-dots');
    if (oldDots) oldDots.remove();
    var list = (items || []).filter(function (b) {
      return b && (b.image || b.imageUrl || b.imageURL || b.src || b.url || b.title || fallbackTitle);
    });
    if (!list.length) {
      mediaEl.innerHTML = '';
      if (fallbackTitle) {
        var tg = document.createElement('div');
        tg.className = 'banner-tag';
        tg.innerHTML = '<span class="banner-tag-txt">' + escBr(fallbackTitle) + '</span>';
        parent.appendChild(tg);
      }
      return;
    }
    mediaEl.innerHTML = list.map(function (b, i) {
      var img = b.image || b.imageUrl || b.imageURL || b.src || b.url || '';
      var plain = String(b.title || '').replace(/<[^>]*>/g, ' ');
      return '<div class="bimg' + (i === 0 ? ' on' : '') + '" data-t="' + esc(b.title || '') + '" data-s="' + esc(b.tag || '') + '" data-link="' + esc(b.link || '') + '">' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(plain) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'noimg\')">' : '') + '</div>';
    }).join('');
    var slides = mediaEl.querySelectorAll('.bimg');
    var tag = document.createElement('div');
    tag.className = 'banner-tag';
    parent.appendChild(tag);
    function paint(slide) {
      var tt = slide.getAttribute('data-t');
      var ss = slide.getAttribute('data-s');
      if (!tt) { tag.style.display = 'none'; return; }
      tag.style.display = '';
      tag.classList.remove('swap');
      void tag.offsetWidth;
      tag.innerHTML = '<span class="banner-tag-txt">' + escBr(tt) + '</span>' + (ss ? '<small class="banner-tag-sub">' + escBr(ss) + '</small>' : '');
      tag.classList.add('swap');
    }
    paint(slides[0]);
    if (slides.length > 1) {
      var idx = 0, timer = null;
      var dots = document.createElement('div');
      dots.className = 'banner-dots';
      dots.innerHTML = list.map(function (_, i) { return '<button class="bdot' + (i === 0 ? ' on' : '') + '" type="button" aria-label="배너 ' + (i + 1) + '"></button>'; }).join('');
      parent.appendChild(dots);
      function show(i) {
        idx = (i + slides.length) % slides.length;
        slides.forEach(function (s, j) { s.classList.toggle('on', j === idx); });
        dots.querySelectorAll('.bdot').forEach(function (d, j) { d.classList.toggle('on', j === idx); });
        paint(slides[idx]);
      }
      function restart() { clearInterval(timer); timer = setInterval(function () { show(idx + 1); }, 4600); }
      restart();
      dots.querySelectorAll('.bdot').forEach(function (d, i) {
        d.addEventListener('click', function () { show(i); restart(); });
      });
      parent.addEventListener('mouseenter', function () { clearInterval(timer); });
      parent.addEventListener('mouseleave', function () { restart(); });
    }
    slides.forEach(function (s) {
      s.addEventListener('click', function () {
        var lk = s.getAttribute('data-link');
        if (lk) location.href = lk;
      });
    });
  }
  function fillPageBanner(mediaEl, key, fbBanners) {
    if (!mediaEl) return;
    var def = PAGE_BANNERS[key];
    var local = fbBanners || [];
    var found = local.filter(function (b) {
      var p = String(b.page || b.type || b.location || '').toLowerCase();
      return p && p.indexOf(key === 'characters' ? 'char' : key) > -1;
    });
    fillBanner(mediaEl, null, found.length ? found : [def]);
  }

  /* ---------- 티커 ---------- */
  function ticker(el, items) {
    if (!el) return;
    var arr = (items || []);
    if (!arr.length) { el.hidden = true; return; }
    el.hidden = false;
    var html = arr.map(function (x) {
      var cls = String(x).indexOf('📋') === 0 ? 'tick-item tick-note' : 'tick-item';
      return '<span class="' + cls + '">' + esc(x) + '</span>';
    }).join('<span class="tick-sep">•</span>');
    el.innerHTML = '<div class="tick-track">' + html + '<span class="tick-sep">•</span>' + html + '<span class="tick-sep">•</span></div>';
    /* 속도 규칙 — 5개 이하 20초 / 6~9개 40초 / 10개 이상 60초 */
    var dur = arr.length <= 5 ? 20 : (arr.length <= 9 ? 40 : 60);
    var track = el.querySelector('.tick-track');
    if (track) track.style.animationDuration = dur + 's';
  }

  /* ---------- 공유 ---------- */
  function share(title, url) {
    var u = url || location.href;
    if (navigator.share) {
      navigator.share({ title: title || 'FPP v2', url: u }).catch(function () { });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(u).then(function () { toast('링크가 복사되었습니다.', 'ok'); })
        .catch(function () { toast('링크 복사에 실패했습니다.', 'err'); });
    } else { toast('공유를 지원하지 않는 환경입니다.'); }
  }

  /* ---------- 토스트 ---------- */
  function toast(msg, type) {
    var root = $('toastRoot');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 320);
    }, 2800);
  }

  /* ---------- 스켈레톤 / 빈 상태 ---------- */
  function skelRows(el, n) {
    if (!el) return;
    var h = '';
    for (var i = 0; i < (n || 4); i++) h += '<div class="skel-row"><div class="skel" style="height:13px;width:' + (86 - i * 7) + '%"></div><div class="skel" style="height:10px;width:' + (48 - i * 4) + '%"></div></div>';
    el.innerHTML = h;
  }
  function skelCards(el, n) {
    if (!el) return;
    var h = '<div class="skel-cards">';
    for (var i = 0; i < (n || 3); i++) h += '<div class="skel-card"><div class="skel" style="height:110px"></div><div class="skel" style="height:13px;width:80%"></div><div class="skel" style="height:10px;width:50%"></div></div>';
    el.innerHTML = h + '</div>';
  }
  function skelGrid(el, n) {
    if (!el) return;
    var h = '';
    for (var i = 0; i < (n || 8); i++) h += '<div class="skel" style="aspect-ratio:3/4;border-radius:10px"></div>';
    el.innerHTML = h;
  }
  function empty(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.innerHTML = '<div class="empty"><p>' + esc(opts.title || '데이터가 없습니다.') + '</p>' +
      (opts.desc ? '<small>' + esc(opts.desc) + '</small>' : '') +
      (opts.btnText ? '<a class="btn btn--ghost btn--sm" href="' + esc(opts.btnHref || '#') + '">' + esc(opts.btnText) + '</a>' : '') + '</div>';
  }

  /* ---------- 본문 렌더 ---------- */
  function renderContent(raw) {
    if (raw == null || raw === '') return '<p style="color:var(--text-3)">내용이 없습니다.</p>';
    var s = String(raw);
    if (/<[a-z][\s\S]*>/i.test(s)) return s;
    return '<div class="rich">' + esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+\.(?:png|jpe?g|gif|webp))/gi, '<img src="$1" alt="" loading="lazy">')
      .replace(/\n/g, '<br>') + '</div>';
  }

  /* ---------- 스크롤 리빌 ---------- */
  function watchReveals(root) {
    var scope = root || document;
    var els = [];
    /* root 자신이 .rv인 경우 querySelectorAll에는 포함되지 않는다. */
    if (scope.nodeType === 1 && scope.classList &&
        scope.classList.contains('rv') && !scope.classList.contains('on')) {
      els.push(scope);
    }
    Array.prototype.forEach.call(scope.querySelectorAll('.rv:not(.on)'), function (el) {
      els.push(el);
    });
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight + 140) el.classList.add('on');
      else if (io) io.observe(el);
      else el.classList.add('on');
    });
    setTimeout(function () {
      scope.querySelectorAll('.rv:not(.on)').forEach(function (el) { el.classList.add('on'); });
    }, 900);
  }

  /* ---------- 부팅 ---------- */
  function boot() {
    applyTheme(store.get('theme', 'dark'));
    buildHeader();
    buildDeskNav();
    buildTabs();
    buildDrawer();
    applyI18n();
    updateAuthArea();
    /*
     * Firebase.onReady는 콜백 방식의 준비 대기 API다.
     * Promise처럼 .then()을 호출하면 이 지점에서 공통 부팅이 중단되어
     * 이후 리빌 처리도 실행되지 않고, .rv 툴바가 계속 투명 상태로 남는다.
     */
    FB.onReady(function () {
      if (FB.ready) {
        FB.auth().onAuthStateChanged(function (u) {
          _fbUser = u;
          if (u) {
            FB.ensureUserDoc(u).then(function () { return loadUserDoc(); }).then(function () {
              loadFavs();
              notifyUser();
            }).catch(function () { notifyUser(); });
          } else if (!isDemo()) {
            _userDoc = null;
            favCache = { chars: [], supports: [] };
            notifyUser();
          } else {
            notifyUser();
          }
        });
      } else if (isDemo()) {
        loadUserDoc();
        notifyUser();
      }
    });
    watchReveals();
    window.addEventListener('load', function () { watchReveals(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    esc: esc, escBr: escBr, fmtDate: fmtDate, isNew: isNew,
    AVATARS: AVATARS, PLACEHOLDER_IMG: PLACEHOLDER_IMG, avatarOf: avatarOf,
    IC: IC, t: t, applyI18n: applyI18n,
    currentUser: currentUser, userDoc: userDoc, saveUserPatch: saveUserPatch, onUser: onUser,
    isDemo: isDemo, enterDemo: enterDemo, exitDemo: exitDemo,
    loadFavs: loadFavs, isFav: isFav, toggleFav: toggleFav,
    setActiveNav: setActiveNav,
    openModal: openModal, openPopup: openPopup, closePopups: closePopups,
    lockBody: lockBody, unlockBody: unlockBody,
    SET_ACTIONS: SET_ACTIONS,
    PAGE_BANNERS: PAGE_BANNERS, fillBanner: fillBanner, fillPageBanner: fillPageBanner,
    ticker: ticker, share: share, toast: toast,
    skelRows: skelRows, skelCards: skelCards, skelGrid: skelGrid, empty: empty,
    renderContent: renderContent, watchReveals: watchReveals
  };
})();
