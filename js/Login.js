/* ============================================================
   FPP v2 — Login.js  (로그인 / 회원가입)
   Firebase Authentication: 이메일·비밀번호 + Google
   ============================================================ */
(function () {
  'use strict';

  var MODE = 'login';
  var pendingCode = null;
  var pendingUser = null;

  function el(id) { return document.getElementById(id); }
  function setLoading(btn, on) {
    if (on) { btn.dataset.tx = btn.innerHTML; btn.innerHTML = '<span class="spin"></span> 처리 중…'; btn.disabled = true; }
    else { if (btn.dataset.tx) btn.innerHTML = btn.dataset.tx; btn.disabled = false; }
  }

  function setMode(m) {
    MODE = m;
    el('formLogin').hidden = m !== 'login';
    el('formSignupIntro').hidden = m !== 'signup-intro';
    el('formSignup').hidden = m !== 'signup';
    el('loginTitle').textContent = m === 'login' ? '로그인' : '회원가입';
    el('loginSub').textContent = m === 'login'
      ? '그랜드 라인 항해 기록에 오신 것을 환영합니다'
      : 'FPP v2와 함께 항해를 시작하세요';
    if (m === 'login') history.replaceState(null, '', 'Login.html');
    else if (location.hash.indexOf('signup') < 0) history.replaceState(null, '', 'Login.html#signup');
  }

  function afterLogin(user) {
    UI.toast((user.displayName || user.email || '선원') + '님, 환영합니다!', 'ok');
    setTimeout(function () { location.href = 'Main.html#home'; }, 650);
  }

  function googleLogin(btn) {
    if (!FB.ready) { UI.toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err'); return; }
    setLoading(btn, true);
    var provider = new firebase.auth.GoogleAuthProvider();
    FB.auth().signInWithPopup(provider).then(function (res) {
      return FB.ensureUserDoc(res.user).then(function () { afterLogin(res.user); });
    }).catch(function (e) {
      setLoading(btn, false);
      UI.toast(FB.errMsg(e), 'err');
    });
  }

  function doLogin() {
    var btn = el('btnLogin');
    var email = el('liEmail').value.trim();
    var pw = el('liPw').value;
    if (!email || !pw) { UI.toast('아이디와 비밀번호를 입력해 주세요.', 'err'); return; }
    if (!FB.ready) { UI.toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err'); return; }
    setLoading(btn, true);
    FB.auth().signInWithEmailAndPassword(email, pw).then(function (res) {
      afterLogin(res.user);
    }).catch(function (e) {
      setLoading(btn, false);
      UI.toast(FB.errMsg(e), 'err');
    });
  }

  function openFindModal() {
    var m = UI.openModal({
      title: '로그인 정보 찾기',
      body: '<p style="font-size:13.5px;color:var(--text-2);margin-bottom:14px">가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>' +
        '<div class="fld"><span class="fld-lb">이메일</span><input id="findEmail" type="email" placeholder="email@example.com"></div>' +
        '<button class="btn btn--gold btn--block" id="findSend" type="button">재설정 링크 보내기</button>'
    });
    m.body.querySelector('#findSend').addEventListener('click', function () {
      var v = m.body.querySelector('#findEmail').value.trim();
      if (!v) { UI.toast('이메일을 입력해 주세요.', 'err'); return; }
      if (!FB.ready) { UI.toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err'); return; }
      var b = m.body.querySelector('#findSend');
      setLoading(b, true);
      FB.auth().sendPasswordResetEmail(v).then(function () {
        m.close();
        UI.toast('비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.', 'ok');
      }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); setLoading(b, false); });
    });
  }

  function sendCode() {
    var btn = el('btnSendCode');
    var email = el('suEmail').value.trim();
    var pw = el('suPw').value;
    var hint = el('codeHint');
    if (!email || !pw) { UI.toast('아이디(이메일)와 비밀번호를 먼저 입력해 주세요.', 'err'); return; }
    if (pw.length < 6) { UI.toast('비밀번호는 6자 이상이어야 합니다.', 'err'); return; }
    if (!FB.ready) { UI.toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err'); return; }
    setLoading(btn, true);

    var ensure;
    if (pendingUser) ensure = Promise.resolve(pendingUser);
    else ensure = FB.auth().createUserWithEmailAndPassword(email, pw).then(function (res) { pendingUser = res.user; return res.user; })
      .catch(function (e) {
        if (e.code === 'auth/email-already-in-use') {
          return FB.auth().signInWithEmailAndPassword(email, pw).then(function (r) { pendingUser = r.user; return r.user; });
        }
        throw e;
      });

    ensure.then(function (user) {
      if (user.emailVerified) {
        hint.textContent = '이미 인증된 이메일입니다. 가입하기를 눌러주세요.';
        hint.className = 'fld-hint code-ok';
        pendingCode = null;
        setLoading(btn, false);
        return;
      }
      return user.sendEmailVerification().then(function () {
        pendingCode = String(Math.floor(100000 + Math.random() * 900000));
        hint.innerHTML = '인증 메일을 <b>' + UI.esc(email) + '</b>로 보냈습니다.<br>' +
          '메일 확인이 어려우면 임시 인증번호 <b class="code-wait">' + pendingCode + '</b> 를 입력하세요.';
        hint.className = 'fld-hint code-wait';
        setLoading(btn, false);
      });
    }).catch(function (e) {
      setLoading(btn, false);
      UI.toast(FB.errMsg(e), 'err');
    });
  }

  function doSignup() {
    var btn = el('btnSignup');
    var email = el('suEmail').value.trim();
    var pw = el('suPw').value;
    var pw2 = el('suPw2').value;
    var nick = el('suNick').value.trim();
    var code = el('suCode').value.trim();
    var hint = el('codeHint');

    if (!email || !pw || !pw2) { UI.toast('모든 항목을 입력해 주세요.', 'err'); return; }
    if (pw !== pw2) { UI.toast('비밀번호가 일치하지 않습니다.', 'err'); el('suPw2').focus(); return; }
    if (pw.length < 6) { UI.toast('비밀번호는 6자 이상이어야 합니다.', 'err'); return; }
    if (!nick) { UI.toast('닉네임을 입력해 주세요.', 'err'); el('suNick').focus(); return; }
    if (!FB.ready) { UI.toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err'); return; }

    setLoading(btn, true);
    var base = pendingUser ? Promise.resolve(pendingUser)
      : FB.auth().createUserWithEmailAndPassword(email, pw).then(function (r) { pendingUser = r.user; return r.user; });

    base.then(function (user) {
      var finish = function () {
        return FB.ensureUserDoc(user, { nickname: nick }).then(function () {
          UI.toast('가입이 완료되었습니다! 환영합니다, ' + nick + '님', 'ok');
          setTimeout(function () { location.href = 'Main.html#home'; }, 800);
        });
      };
      if (user.emailVerified) return finish();
      if (pendingCode && code === pendingCode) return finish();
      return user.reload().then(function () {
        if (user.emailVerified) return finish();
        setLoading(btn, false);
        if (!pendingCode) sendCode();
        hint.textContent = '이메일 인증이 완료되지 않았습니다. 인증번호를 입력하거나 인증 전송을 다시 눌러주세요.';
        hint.className = 'fld-hint code-wait';
        UI.toast('이메일 인증 후 가입할 수 있습니다.', 'err');
        throw new Error('unverified');
      });
    }).catch(function (e) {
      setLoading(btn, false);
      if (e && e.message === 'unverified') return;
      UI.toast(FB.errMsg(e), 'err');
    });
  }

  function start() {
    FB.onReady().then(function () {
      if (FB.ready) {
        FB.auth().onAuthStateChanged(function (u) {
          if (!u || pendingUser) return;
          var isGoogle = u.providerData && u.providerData.some(function (p) { return p.providerId === 'google.com'; });
          if (u.emailVerified || isGoogle) afterLogin(u);
        });
      }
    });

    setMode(location.hash.indexOf('signup') > -1 ? 'signup-intro' : 'login');
    window.addEventListener('hashchange', function () {
      var wantSignup = location.hash.indexOf('signup') > -1;
      setMode(wantSignup ? (MODE === 'signup' ? 'signup' : 'signup-intro') : 'login');
    });

    el('btnLogin').addEventListener('click', doLogin);
    el('liPw').addEventListener('keydown', function (e) { if (e.key === 'Enter') doLogin(); });
    el('btnFind').addEventListener('click', openFindModal);
    el('btnToSignup').addEventListener('click', function () { setMode('signup-intro'); });
    el('btnToLogin').addEventListener('click', function () { setMode('login'); });
    el('btnEmailSignup').addEventListener('click', function () { setMode('signup'); });
    el('btnBackIntro').addEventListener('click', function () { setMode('signup-intro'); });
    el('btnGoogle1').addEventListener('click', function () { googleLogin(el('btnGoogle1')); });
    el('btnGoogle2').addEventListener('click', function () { googleLogin(el('btnGoogle2')); });
    el('btnSendCode').addEventListener('click', sendCode);
    el('btnSignup').addEventListener('click', doSignup);
    var demoBtn = el('btnDemoLogin');
    if (demoBtn) demoBtn.addEventListener('click', function () { UI.enterDemo(); location.href = 'Main.html#home'; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
