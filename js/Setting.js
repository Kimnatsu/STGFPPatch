/* ============================================================
   FPP v2 — Setting.js  (SM/XS 설정 전용 페이지)
   LG/MD의 설정 팝업과 동일한 기능을 페이지로 제공한다.
   ============================================================ */
(function () {
  'use strict';
  function start() {
    document.querySelectorAll('.set-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-set');
        var fn = UI.SET_ACTIONS[act];
        if (fn) fn();
        else UI.toast('준비 중인 기능입니다.');
      });
    });
    UI.watchReveals();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
