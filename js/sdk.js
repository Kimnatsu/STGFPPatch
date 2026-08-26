/* ============================================================
   FPP v2 — sdk.js
   Firebase SDK 다중 CDN 폴백 로더.
   gstatic 정적 태그가 먼저 로드되면 아무것도 하지 않고,
   차단·실패 시에만 jsDelivr → unpkg 순으로 재시도한다.
   ============================================================ */
(function () {
  'use strict';
  var VERSION = '10.12.2';
  var MODS = ['app', 'auth', 'firestore'];
  var CDNS = [
    'https://cdn.jsdelivr.net/npm/firebase@' + VERSION + '/',
    'https://unpkg.com/firebase@' + VERSION + '/'
  ];

  function has(mod) {
    return !!(window.firebase && window.firebase.apps !== undefined && window.firebase[mod]);
  }
  function allLoaded() {
    return MODS.every(has);
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load fail: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function loadMod(mod, cdnIdx) {
    if (cdnIdx >= CDNS.length) return Promise.reject(new Error(mod + ' 로드 실패'));
    var src = CDNS[cdnIdx] + 'firebase-' + mod + '-compat.js';
    return loadScript(src).then(function () {
      if (!has(mod)) throw new Error(mod + ' 미정의');
    }).catch(function () {
      return loadMod(mod, cdnIdx + 1);
    });
  }
  function loadAll(cdnIdx) {
    return MODS.reduce(function (chain, mod) {
      return chain.then(function () {
        if (has(mod)) return Promise.resolve();
        return loadMod(mod, 0);
      });
    }, Promise.resolve());
  }

  if (allLoaded()) return; /* gstatic 정적 태그가 이미 로드함 */
  loadAll(0).then(function () {
    try { document.dispatchEvent(new CustomEvent('fpp:sdk-ready')); } catch (e) { }
  }).catch(function (e) {
    console.error('[FPP] Firebase SDK 로드 실패:', e);
  });
})();
