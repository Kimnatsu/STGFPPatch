/* ============================================================
   FPP v2 — Firebase.js
   기존 Firebase 프로젝트(fighting-path-patch) 데이터 접근 레이어.
   읽기 위주 + Firestore 규칙이 허용하는 쓰기만 수행한다.
   ============================================================ */
window.FB = (function () {
  'use strict';

  var CONFIG = {
    apiKey: 'AIzaSyDnSa2A1pJz2OuY9vQ2Xh8mBcDeFgHiJkL',
    authDomain: 'fighting-path-patch.firebaseapp.com',
    projectId: 'fighting-path-patch',
    storageBucket: 'fighting-path-patch.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000'
  };

  var ready = false;
  var _auth = null, db = null;
  var _readyCbs = [];

  function onReady(cb) {
    if (ready) { if (cb) cb(); return; }
    if (cb) _readyCbs.push(cb);
  }

  function init() {
    if (typeof window.firebase === 'undefined' || !window.firebase.apps) return false;
    try {
      window.firebase.initializeApp(CONFIG);
      _auth = window.firebase.auth();
      db = window.firebase.firestore();
      ready = true;
      _readyCbs.forEach(function (cb) { try { cb(); } catch (e) { } });
      _readyCbs = [];
      return true;
    } catch (e) {
      console.error('[FPP] Firebase 초기화 실패:', e);
      return false;
    }
  }

  if (!init()) {
    window.addEventListener('fpp:sdk-ready', function () { init(); });
    setTimeout(function () { if (!ready) init(); }, 0);
  }

  function auth() { return _auth; }
  function database() { return db; }

  function errMsg(e) {
    if (!e) return '알 수 없는 오류';
    var c = e.code || '';
    if (c === 'permission-denied') return '접근 권한이 없습니다.';
    if (c === 'unavailable') return '네트워크 연결을 확인해 주세요.';
    if (c === 'auth/user-not-found') return '가입되지 않은 이메일입니다.';
    if (c === 'auth/wrong-password') return '비밀번호가 올바르지 않습니다.';
    if (c === 'auth/email-already-in-use') return '이미 사용 중인 이메일입니다.';
    if (c === 'auth/weak-password') return '비밀번호가 너무 약합니다. 6자 이상 입력해 주세요.';
    if (c === 'auth/invalid-email') return '이메일 형식이 올바르지 않습니다.';
    if (c === 'auth/popup-closed-by-user') return '로그인 창이 닫혔습니다.';
    return e.message || '오류가 발생했습니다.';
  }

  function dateKey(d) {
    if (!d) return '';
    try {
      var dt = d.toDate ? d.toDate() : new Date(d);
      return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    } catch (e) { return String(d); }
  }
  function tsKey(d) {
    if (!d) return 0;
    try {
      var dt = d.toDate ? d.toDate() : new Date(d);
      return dt.getTime();
    } catch (e) { return 0; }
  }
  function normDateField(v) {
    if (!v) return '';
    if (v.toDate) return dateKey(v);
    return String(v);
  }

  /* ---------- 이미지 필드 탐지 ---------- */
  var IMG_FIELDS = ['image', 'imageUrl', 'imageURL', 'thumbnailUrl', 'thumbnail', 'thumb', 'img', 'src', 'banner', 'bannerUrl', 'cover', 'coverImage', 'mainImage', 'photo', 'picture', 'poster', 'icon', 'file', 'url', 'path'];
  var REPO_BASE = 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/';
  function pickImage(d) {
    for (var i = 0; i < IMG_FIELDS.length; i++) {
      var k = IMG_FIELDS[i];
      var v = d[k];
      if (typeof v === 'string' && v.trim()) return fixPath(v.trim());
      if (v && typeof v === 'object') {
        /* 배열 형태 (images: [url]) 지원 */
        var arr = Array.isArray(v) ? v : (v.images || v.list || []);
        for (var j = 0; j < arr.length; j++) {
          var item = arr[j];
          if (typeof item === 'string' && item.trim()) return fixPath(item.trim());
          if (item && typeof item === 'object') {
            for (var f = 0; f < IMG_FIELDS.length; f++) {
              var iv = item[IMG_FIELDS[f]];
              if (typeof iv === 'string' && iv.trim()) return fixPath(iv.trim());
            }
          }
        }
      }
    }
    return '';
  }
  function fixPath(p) {
    if (/^(https?:||blob:)/i.test(p)) return p;
    return REPO_BASE + p.replace(/^\.\//, '').replace(/^\//, '');
  }

  /* ---------- 속성/타입 정규화 ---------- */
  function normAttr(v) {
    var s = String(v || '').toLowerCase();
    if (s === 'force' || s === '힘' || s === '力') return 'force';
    if (s === 'ki' || s === '기' || s === '技') return 'ki';
    if (s === 'sim' || s === '심' || s === '心') return 'sim';
    return s;
  }
  function normType(v) {
    var s = String(v || '');
    if (/버프|상향|buff/i.test(s)) return 'buff';
    if (/너프|하향|nerf/i.test(s)) return 'nerf';
    return 'fix';
  }
  function normBattleType(v) {
    var s = String(v || '');
    if (/원소|element/i.test(s)) return '원소';
    if (/검사|sword/i.test(s)) return '검사';
    if (/격투|fighter/i.test(s)) return '격투';
    if (/특수|special/i.test(s)) return '특수';
    return s;
  }
  /* ---------- 캐릭터 팁 추출 ----------
     다양한 필드명/객체 형태로 저장된 팁을 포괄해 {text, author, icon, date}로 통일한다. */
  function tipTextOf(t) {
    if (typeof t === 'string') return t;
    if (!t || typeof t !== 'object') return '';
    return String(t.text || t.content || t.tip || t.desc || t.description || t.message || t.body || '');
  }
  function tipsOf(d) {
    var arr = d.tips || d.tip || d.userTips || d.charTips || d.tipList || d.gameTips || d.userTip || [];
    if (!Array.isArray(arr)) arr = [arr];
    var out = [];
    arr.forEach(function (t) {
      var text = tipTextOf(t);
      if (!text) return;
      var author = '운영팀', icon = null, date = '';
      if (t && typeof t === 'object') {
        author = t.author || t.authorName || t.nickname || t.writer || '운영팀';
        icon = t.authorIcon != null ? t.authorIcon : (t.icon != null ? t.icon : null);
        date = t.date ? String(t.date) : (t.createdAt ? dateKey(t.createdAt) : '');
      }
      out.push({ text: text, author: author, icon: icon, date: date });
    });
    return out;
  }
  function charOf(doc) {
    var d = doc.data() || {};
    var id = d.id != null ? d.id : d.charId != null ? d.charId : doc.id;
    var rawType = String(d.type || '');
    var typeIsAttr = /^(force|ki|sim|힘|기|심|力|技|心)$/i.test(rawType);
    return {
      id: id,
      docId: doc.id,
      name: d.name || d.characterName || '',
      image: pickImage(d) || '',
      grade: d.grade || '',
      attr: normAttr(d.attribute || d.attr || (typeIsAttr ? d.type : '') || ''),
      type: d.type || '',
      battleType: normBattleType(d.battleType || d.battle || d.category || (!typeIsAttr ? rawType : '') || ''),
      skills: d.skills || d.skill || [],
      supportSkills: d.supportSkills || d.supportSkill || [],
      tips: tipsOf(d),
      recentPatches: d.recentPatches || []
    };
  }

  /* ---------- 조회 ---------- */
  function getAll(col) {
    return db.collection(col).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) { out.push(doc); });
      return out;
    });
  }
  function getCharacters() {
    return getAll('characters').then(function (docs) {
      return docs.map(charOf).sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
    });
  }
  function getSupportCharacters() {
    return getAll('supportCharacters').then(function (docs) {
      return docs.map(charOf).sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
    });
  }
  function getPvpPatches() {
    return getAll('pvpPatch').then(function (docs) {
      var groups = [];
      docs.forEach(function (doc) {
        var d = doc.data() || {};
        var charId = d.charId != null ? d.charId : d.characterId;
        var date = normDateField(d.patchDate || d.date || d.displayStart || '');
        var base = { docId: doc.id, charId: charId, date: String(date), name: d.name || d.characterName || '', image: pickImage(d) };
        var patches = d.patches || [];
        if (patches.length && patches.every(function (p) { return p && typeof p === 'object'; })) {
          var buckets = {};
          patches.forEach(function (p) {
            var t = normType(p.type || d.type);
            var cid = p.charId != null ? p.charId : charId;
            var key = t + '|' + cid + '|' + date;
            if (!buckets[key]) buckets[key] = { docId: doc.id, type: t, charId: cid, date: String(date), name: p.charName || base.name, image: base.image, items: [] };
            var text = p.text || p.content || p.desc || p.patch || p.detail || '';
            if (Array.isArray(text)) text = text.join(' ');
            buckets[key].items.push({ text: String(text) });
          });
          Object.keys(buckets).forEach(function (k) { groups.push(buckets[k]); });
        } else {
          var t2 = normType(d.type);
          var items = (Array.isArray(patches) ? patches : []).map(function (p) { return { text: String(p) }; });
          groups.push({ docId: doc.id, type: t2, charId: charId, date: String(date), name: base.name, image: base.image, items: items });
        }
      });
      groups.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return groups;
    });
  }
  function getPatchNotes() {
    return getAll('patchNotes').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.content || d.text || '',
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }

  /* 조회수 추출 — 저장 필드명이 다양해도 대응 */
  function viewCountOf(d) {
    var candidates = [d.views, d.viewCount, d.view, d.hit, d.hits, d.cnt, d.readCount];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] != null && candidates[i] !== '') {
        var n = Number(candidates[i]);
        if (!isNaN(n) && n >= 0) return n;
      }
    }
    return 0;
  }

  /* 이벤트 진행 상태 판별 — 여러 저장 형태 대응 */
  function eventStatusOf(d) {
    var s = String(d.status || d.state || d.eventStatus || d.ing || '').trim().toLowerCase();
    if (s) {
      if (['ing', 'ongoing', 'active', 'live', 'open', 'y', 'yes', 'true', '1', '진행중', '진행 중', '진행'].indexOf(s) > -1) return 'ing';
      if (['end', 'ended', 'close', 'closed', 'n', 'no', 'false', '0', '종료', '종료됨'].indexOf(s) > -1) return 'end';
    }
    var flags = [d.isActive, d.active, d.isOngoing, d.ongoing, d.on];
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (f === true || f === 1 || f === '1') return 'ing';
      if (f === false || f === 0 || f === '0') return 'end';
    }
    var end = d.endDate || d.end || d.endAt || d.finishDate || d.closeDate;
    if (end) {
      var t = end.toDate ? end.toDate().getTime() : new Date(String(end).replace(/-/g, '/')).getTime();
      if (!isNaN(t)) return t + 86400000 > Date.now() ? 'ing' : 'end';
    }
    var start = d.startDate || d.start || d.startAt;
    if (start) {
      var st = start.toDate ? start.toDate().getTime() : new Date(String(start).replace(/-/g, '/')).getTime();
      if (!isNaN(st)) return st <= Date.now() ? 'ing' : 'end';
    }
    return 'ing';
  }
  function getEvents() {
    return getAll('events').then(function (docs) {
      var visibleDocs = docs.filter(function (doc) { return (doc.data() || {}).visible !== false; });
      var out = visibleDocs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.content || d.text || '',
          image: pickImage(d),
          status: eventStatusOf(d),
          startDate: normDateField(d.startDate || d.start || ''),
          endDate: normDateField(d.endDate || d.end || ''),
          likeCount: d.likeCount || 0,
          commentCount: d.commentCount || 0,
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }
  function getBoards() {
    return getAll('boards').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || d.nickname || '선원',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.text || d.content || '',
          category: d.prefix || d.category || '자유',
          images: d.images || [],
          likedBy: d.likedBy || [],
          likeCount: d.likeCount || 0,
          commentCount: d.commentCount || 0,
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }
  function getBanners() {
    return getAll('banners').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return { docId: doc.id, image: pickImage(d), title: d.title || '', tag: d.tag || '', link: d.link || '', page: d.page || '', order: d.order || 0 };
      });
      return out.filter(function (b) { return b.image || b.title; }).sort(function (a, b) { return a.order - b.order; });
    });
  }
  function getNotices() {
    return getAll('notices').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          content: d.content || d.text || '',
          category: d.category || ''
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }

  /* ---------- 고객센터 정보 (공지사항과 분리된 전용 컬렉션) ----------
     공지사항(notices)과 혼동되지 않도록 'customerService' 컬렉션을 읽는다.
     컬렉션이 비어 있거나 읽기 권한이 없으면 빈 배열을 반환해 고객센터만 조용히 비운다. */
  function getCustomerService() {
    return getAll('customerService').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || d.question || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          content: d.content || d.answer || d.text || '',
          category: d.category || ''
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    }).catch(function () { return []; });
  }

  /* ---------- 게시글 작성 ---------- */
  function addBoard(data) {
    return db.collection('boards').add(data);
  }

  /* ---------- 좋아요 ---------- */
  function getLikeDoc(type, id) {
    return db.collection('likes').doc(type + '_' + id).get().then(function (s) {
      return s.exists ? s.data() : null;
    }).catch(function () { return null; });
  }
  function toggleGenericLike(type, id, uid) {
    var ref = db.collection('likes').doc(type + '_' + id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.exists ? snap.data() : { likedBy: [], likeCount: 0 };
        var arr = d.likedBy || [];
        var idx = arr.indexOf(uid);
        var nowLiked;
        if (idx > -1) { arr.splice(idx, 1); nowLiked = false; }
        else { arr.push(uid); nowLiked = true; }
        tx.set(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) });
        return nowLiked;
      });
    });
  }
  function toggleBoardLike(boardId, uid, currentlyLiked) {
    var ref = db.collection('boards').doc(boardId);
    return ref.get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      var arr = (d.likedBy || []).slice();
      var idx = arr.indexOf(uid);
      var nowLiked;
      if (idx > -1) { arr.splice(idx, 1); nowLiked = false; }
      else { arr.push(uid); nowLiked = true; }
      return ref.update({ likedBy: arr, likeCount: Math.max(0, arr.length) }).then(function () { return nowLiked; });
    });
  }

  /* ---------- 사용자 ---------- */
  function getUserDoc(uid) {
    return db.collection('users').doc(uid).get().then(function (s) { return s.exists ? s.data() : null; }).catch(function () { return null; });
  }
  function ensureUserDoc(user, extra) {
    var ref = db.collection('users').doc(user.uid);
    return ref.get().then(function (s) {
      if (s.exists) return s.data();
      var data = {
        uid: user.uid,
        nickname: (extra && extra.nickname) || user.displayName || (user.email ? user.email.split('@')[0] : '선원'),
        profileIcon: 0,
        email: user.email || '',
        settings: { patch: true, fav: true, event: true, comment: true },
        favChars: [], favSupports: [],
        counts: { posts: 0, comments: 0, likes: 0 },
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      return ref.set(data).then(function () { return data; });
    }).catch(function (e) { console.error('[FPP] 사용자 문서 실패:', e); return null; });
  }
  function updateUserDoc(uid, patch) {
    return db.collection('users').doc(uid).set(patch, { merge: true });
  }
  function getFavs(uid) {
    return getUserDoc(uid).then(function (d) {
      return { chars: (d && d.favChars) || [], supports: (d && d.favSupports) || [] };
    });
  }
  function bumpUserLikeCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.likes = Math.max(0, (c.likes || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }
  function bumpUserCommentCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.comments = Math.max(0, (c.comments || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }
  function bumpUserPostCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.posts = Math.max(0, (c.posts || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }

  /* ---------- 댓글 ---------- */
  function colForComment(type) { return type === 'event' ? 'eventComments' : 'boardComments'; }
  function getComments(type, id) {
    return db.collection(colForComment(type)).where('targetId', '==', id).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        out.push({
          docId: doc.id,
          text: d.text || d.content || '',
          authorName: d.authorName || d.nickname || '선원',
          authorIcon: d.authorIcon != null ? d.authorIcon : 0,
          uid: d.uid || '',
          createdAt: d.createdAt
        });
      });
      out.sort(function (a, b) { return tsKey(a.createdAt) - tsKey(b.createdAt); });
      return out;
    });
  }
  function addComment(type, id, text, user, ud) {
    return db.collection(colForComment(type)).add({
      targetId: id,
      text: text,
      uid: user.uid,
      authorName: (ud && ud.nickname) || user.displayName || '선원',
      authorIcon: (ud && ud.profileIcon != null) ? ud.profileIcon : 0,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  function deleteComment(type, docId) {
    return db.collection(colForComment(type)).doc(docId).delete();
  }

  /* ---------- 문의 ---------- */
  function addInquiry(item, user) {
    var data = {
      title: item.title, content: item.content, contact: item.contact,
      uid: user ? user.uid : '',
      status: '접수완료',
      date: new Date().toISOString().slice(0, 10),
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    return db.collection('inquiries').add(data).then(function () { return { remote: true }; })
      .catch(function () {
        var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
        local.unshift(data);
        localStorage.setItem('fpp_inquiries', JSON.stringify(local));
        return { remote: false };
      });
  }
  function getMyInquiries(user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    if (!user) return Promise.resolve(local);
    return db.collection('inquiries').where('uid', '==', user.uid).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) { var d = doc.data() || {}; d.docId = doc.id; out.push(d); });
      out.sort(function (a, b) { return tsKey(b.createdAt) - tsKey(a.createdAt); });
      return out.concat(local);
    }).catch(function () { return local; });
  }

  /* ---------- 캐릭터 꿀팁 (유저 작성) — 원본 'userTips' 컬렉션 ----------
     원본 필드: charId, text, authorUid, authorName, authorPhoto, createdAt, likedBy, dislikedBy */
  function _queryUserTips(val) {
    return db.collection('userTips').where('charId', '==', val).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) {
        var t = doc.data() || {};
        var text = tipTextOf(t.text != null ? t.text : t);
        if (!text) return;
        out.push({
          docId: doc.id, text: text,
          authorUid: t.authorUid || t.uid || '',
          author: t.authorName || t.author || '선원',
          photo: t.authorPhoto || '',
          likedBy: t.likedBy || [],
          dislikedBy: t.dislikedBy || [],
          createdAt: t.createdAt || null
        });
      });
      return out;
    });
  }
  function getCharTips(charId) {
    var cid = charId;
    var num = Number(cid);
    var isNum = !isNaN(num) && String(num) === String(cid);
    var tries = [];
    if (isNum) tries.push(_queryUserTips(num));
    tries.push(_queryUserTips(String(cid)));
    return Promise.all(tries.map(function (p) { return p.catch(function () { return []; }); }))
      .then(function (results) {
        var seen = {}, out = [];
        results.forEach(function (arr) {
          arr.forEach(function (t) { if (!seen[t.docId]) { seen[t.docId] = 1; out.push(t); } });
        });
        /* 좋아요순 → 최신순 정렬 (원본과 동일) */
        out.sort(function (a, b) {
          var la = (a.likedBy || []).length, lb = (b.likedBy || []).length;
          if (lb !== la) return lb - la;
          return tsKey(b.createdAt) - tsKey(a.createdAt);
        });
        /* 로컬에 저장된 팁 병합 */
        var local = JSON.parse(localStorage.getItem('fpp_char_tips') || '[]')
          .filter(function (t) { return String(t.charId) === String(cid); })
          .map(function (t) {
            return { docId: t.docId, text: t.text, authorUid: t.uid || '', author: t.authorName || '선원',
              photo: '', likedBy: [], dislikedBy: [], createdAt: null, local: true };
          });
        return out.concat(local);
      })
      .catch(function () { return []; });
  }
  function addCharTip(charId, text, user, ud) {
    var remote = {
      charId: charId, text: text,
      authorUid: user ? user.uid : '',
      authorName: (ud && ud.nickname) || (user && user.displayName) || '선원',
      authorPhoto: '',
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      likedBy: [], dislikedBy: []
    };
    return db.collection('userTips').add(remote).then(function () { return { remote: true }; })
      .catch(function () {
        var local = JSON.parse(localStorage.getItem('fpp_char_tips') || '[]');
        local.unshift({ docId: 'local_' + Date.now(), charId: charId, text: text,
          uid: user ? user.uid : '', authorName: (ud && ud.nickname) || '선원' });
        localStorage.setItem('fpp_char_tips', JSON.stringify(local));
        return { remote: false };
      });
  }
  function _localTips() { return JSON.parse(localStorage.getItem('fpp_char_tips') || '[]'); }
  function _saveLocalTips(arr) { localStorage.setItem('fpp_char_tips', JSON.stringify(arr)); }
  function updateCharTip(docId, text) {
    if (String(docId).indexOf('local_') === 0) {
      var arr = _localTips().map(function (t) { return t.docId === docId ? Object.assign({}, t, { text: text }) : t; });
      _saveLocalTips(arr);
      return Promise.resolve();
    }
    return db.collection('userTips').doc(docId).update({ text: text });
  }
  function deleteCharTip(docId) {
    if (String(docId).indexOf('local_') === 0) {
      _saveLocalTips(_localTips().filter(function (t) { return t.docId !== docId; }));
      return Promise.resolve();
    }
    return db.collection('userTips').doc(docId).delete();
  }
  function toggleTipVote(docId, uid, type) {
    var ref = db.collection('userTips').doc(docId);
    var union = window.firebase.firestore.FieldValue.arrayUnion(uid);
    var remove = window.firebase.firestore.FieldValue.arrayRemove(uid);
    return ref.get().then(function (snap) {
      if (!snap.exists) return;
      var d = snap.data() || {};
      var liked = (d.likedBy || []).indexOf(uid) > -1;
      var disliked = (d.dislikedBy || []).indexOf(uid) > -1;
      if (type === 'like') {
        return liked
          ? ref.update({ likedBy: remove })
          : ref.update({ likedBy: union, dislikedBy: remove });
      }
      return disliked
        ? ref.update({ dislikedBy: remove })
        : ref.update({ dislikedBy: union, likedBy: remove });
    });
  }

  return {
    get ready() { return ready; },
    auth: auth, db: database,
    onReady: onReady,
    __reinit: function () { if (!ready) init(); },
    errMsg: errMsg, dateKey: dateKey, tsKey: tsKey, normDateField: normDateField, pickImage: pickImage,
    getCharacters: getCharacters, getSupportCharacters: getSupportCharacters,
    getPvpPatches: getPvpPatches, getPatchNotes: getPatchNotes,
    getEvents: getEvents, getBoards: getBoards, getBanners: getBanners, getNotices: getNotices, getCustomerService: getCustomerService,
    addBoard: addBoard,
    getLikeDoc: getLikeDoc, toggleGenericLike: toggleGenericLike, toggleBoardLike: toggleBoardLike,
    getUserDoc: getUserDoc, ensureUserDoc: ensureUserDoc, updateUserDoc: updateUserDoc, getFavs: getFavs,
    bumpUserLikeCount: bumpUserLikeCount, bumpUserCommentCount: bumpUserCommentCount, bumpUserPostCount: bumpUserPostCount,
    getComments: getComments, addComment: addComment, deleteComment: deleteComment,
    addInquiry: addInquiry, getMyInquiries: getMyInquiries,
    getCharTips: getCharTips, addCharTip: addCharTip,
    updateCharTip: updateCharTip, deleteCharTip: deleteCharTip, toggleTipVote: toggleTipVote
  };
})();


+++ public/js/Firebase.js (修改后)
/* ============================================================
   FPP v2 — Firebase.js
   기존 Firebase 프로젝트(fighting-path-patch) 데이터 접근 레이어.
   읽기 위주 + Firestore 규칙이 허용하는 쓰기만 수행한다.
   ============================================================ */
window.FB = (function () {
  'use strict';

  var CONFIG = {
    apiKey: 'AIzaSyDnSa2A1pJz2OuY9vQ2Xh8mBcDeFgHiJkL',
    authDomain: 'fighting-path-patch.firebaseapp.com',
    projectId: 'fighting-path-patch',
    storageBucket: 'fighting-path-patch.appspot.com',
    messagingSenderId: '000000000000',
    appId: '1:000000000000:web:0000000000000000000000'
  };

  var ready = false;
  var _auth = null, db = null;
  var _readyCbs = [];

  function onReady(cb) {
    if (ready) { if (cb) cb(); return; }
    if (cb) _readyCbs.push(cb);
  }

  function init() {
    if (typeof window.firebase === 'undefined' || !window.firebase.apps) return false;
    try {
      window.firebase.initializeApp(CONFIG);
      _auth = window.firebase.auth();
      db = window.firebase.firestore();
      ready = true;
      _readyCbs.forEach(function (cb) { try { cb(); } catch (e) { } });
      _readyCbs = [];
      return true;
    } catch (e) {
      console.error('[FPP] Firebase 초기화 실패:', e);
      return false;
    }
  }

  if (!init()) {
    window.addEventListener('fpp:sdk-ready', function () { init(); });
    setTimeout(function () { if (!ready) init(); }, 0);
  }

  function auth() { return _auth; }
  function database() { return db; }

  function errMsg(e) {
    if (!e) return '알 수 없는 오류';
    var c = e.code || '';
    if (c === 'permission-denied') return '접근 권한이 없습니다.';
    if (c === 'unavailable') return '네트워크 연결을 확인해 주세요.';
    if (c === 'auth/user-not-found') return '가입되지 않은 이메일입니다.';
    if (c === 'auth/wrong-password') return '비밀번호가 올바르지 않습니다.';
    if (c === 'auth/email-already-in-use') return '이미 사용 중인 이메일입니다.';
    if (c === 'auth/weak-password') return '비밀번호가 너무 약합니다. 6자 이상 입력해 주세요.';
    if (c === 'auth/invalid-email') return '이메일 형식이 올바르지 않습니다.';
    if (c === 'auth/popup-closed-by-user') return '로그인 창이 닫혔습니다.';
    return e.message || '오류가 발생했습니다.';
  }

  function dateKey(d) {
    if (!d) return '';
    try {
      var dt = d.toDate ? d.toDate() : new Date(d);
      return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    } catch (e) { return String(d); }
  }
  function tsKey(d) {
    if (!d) return 0;
    try {
      var dt = d.toDate ? d.toDate() : new Date(d);
      return dt.getTime();
    } catch (e) { return 0; }
  }
  function normDateField(v) {
    if (!v) return '';
    if (v.toDate) return dateKey(v);
    return String(v);
  }

  /* ---------- 이미지 필드 탐지 ---------- */
  var IMG_FIELDS = ['image', 'imageUrl', 'imageURL', 'thumbnailUrl', 'thumbnail', 'thumb', 'img', 'src', 'banner', 'bannerUrl', 'cover', 'coverImage', 'mainImage', 'photo', 'picture', 'poster', 'icon', 'file', 'url', 'path'];
  var REPO_BASE = 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/';
  function pickImage(d) {
    for (var i = 0; i < IMG_FIELDS.length; i++) {
      var k = IMG_FIELDS[i];
      var v = d[k];
      if (typeof v === 'string' && v.trim()) return fixPath(v.trim());
      if (v && typeof v === 'object') {
        /* 배열 형태 (images: [url]) 지원 */
        var arr = Array.isArray(v) ? v : (v.images || v.list || []);
        for (var j = 0; j < arr.length; j++) {
          var item = arr[j];
          if (typeof item === 'string' && item.trim()) return fixPath(item.trim());
          if (item && typeof item === 'object') {
            for (var f = 0; f < IMG_FIELDS.length; f++) {
              var iv = item[IMG_FIELDS[f]];
              if (typeof iv === 'string' && iv.trim()) return fixPath(iv.trim());
            }
          }
        }
      }
    }
    return '';
  }
  function fixPath(p) {
    if (/^(https?:||blob:)/i.test(p)) return p;
    return REPO_BASE + p.replace(/^\.\//, '').replace(/^\//, '');
  }

  /* ---------- 속성/타입 정규화 ---------- */
  function normAttr(v) {
    var s = String(v || '').toLowerCase();
    if (s === 'force' || s === '힘' || s === '力') return 'force';
    if (s === 'ki' || s === '기' || s === '技') return 'ki';
    if (s === 'sim' || s === '심' || s === '心') return 'sim';
    return s;
  }
  function normType(v) {
    var s = String(v || '');
    if (/버프|상향|buff/i.test(s)) return 'buff';
    if (/너프|하향|nerf/i.test(s)) return 'nerf';
    return 'fix';
  }
  function normBattleType(v) {
    var s = String(v || '');
    if (/원소|element/i.test(s)) return '원소';
    if (/검사|sword/i.test(s)) return '검사';
    if (/격투|fighter/i.test(s)) return '격투';
    if (/특수|special/i.test(s)) return '특수';
    return s;
  }
  /* ---------- 캐릭터 팁 추출 ----------
     다양한 필드명/객체 형태로 저장된 팁을 포괄해 {text, author, icon, date}로 통일한다. */
  function tipTextOf(t) {
    if (typeof t === 'string') return t;
    if (!t || typeof t !== 'object') return '';
    return String(t.text || t.content || t.tip || t.desc || t.description || t.message || t.body || '');
  }
  function tipsOf(d) {
    var arr = d.tips || d.tip || d.userTips || d.charTips || d.tipList || d.gameTips || d.userTip || [];
    if (!Array.isArray(arr)) arr = [arr];
    var out = [];
    arr.forEach(function (t) {
      var text = tipTextOf(t);
      if (!text) return;
      var author = '운영팀', icon = null, date = '';
      if (t && typeof t === 'object') {
        author = t.author || t.authorName || t.nickname || t.writer || '운영팀';
        icon = t.authorIcon != null ? t.authorIcon : (t.icon != null ? t.icon : null);
        date = t.date ? String(t.date) : (t.createdAt ? dateKey(t.createdAt) : '');
      }
      out.push({ text: text, author: author, icon: icon, date: date });
    });
    return out;
  }
  function charOf(doc) {
    var d = doc.data() || {};
    var id = d.id != null ? d.id : d.charId != null ? d.charId : doc.id;
    var rawType = String(d.type || '');
    var typeIsAttr = /^(force|ki|sim|힘|기|심|力|技|心)$/i.test(rawType);
    return {
      id: id,
      docId: doc.id,
      name: d.name || d.characterName || '',
      image: pickImage(d) || '',
      grade: d.grade || '',
      attr: normAttr(d.attribute || d.attr || (typeIsAttr ? d.type : '') || ''),
      type: d.type || '',
      battleType: normBattleType(d.battleType || d.battle || d.category || (!typeIsAttr ? rawType : '') || ''),
      skills: d.skills || d.skill || [],
      supportSkills: d.supportSkills || d.supportSkill || [],
      tips: tipsOf(d),
      recentPatches: d.recentPatches || []
    };
  }

  /* ---------- 조회 ---------- */
  function getAll(col) {
    return db.collection(col).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) { out.push(doc); });
      return out;
    });
  }
  function getCharacters() {
    return getAll('characters').then(function (docs) {
      return docs.map(charOf).sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
    });
  }
  function getSupportCharacters() {
    return getAll('supportCharacters').then(function (docs) {
      return docs.map(charOf).sort(function (a, b) { return (Number(a.id) || 0) - (Number(b.id) || 0); });
    });
  }
  function getPvpPatches() {
    return getAll('pvpPatch').then(function (docs) {
      var groups = [];
      docs.forEach(function (doc) {
        var d = doc.data() || {};
        var charId = d.charId != null ? d.charId : d.characterId;
        var date = normDateField(d.patchDate || d.date || d.displayStart || '');
        var base = { docId: doc.id, charId: charId, date: String(date), name: d.name || d.characterName || '', image: pickImage(d) };
        var patches = d.patches || [];
        if (patches.length && patches.every(function (p) { return p && typeof p === 'object'; })) {
          var buckets = {};
          patches.forEach(function (p) {
            var t = normType(p.type || d.type);
            var cid = p.charId != null ? p.charId : charId;
            var key = t + '|' + cid + '|' + date;
            if (!buckets[key]) buckets[key] = { docId: doc.id, type: t, charId: cid, date: String(date), name: p.charName || base.name, image: base.image, items: [] };
            var text = p.text || p.content || p.desc || p.patch || p.detail || '';
            if (Array.isArray(text)) text = text.join(' ');
            buckets[key].items.push({ text: String(text) });
          });
          Object.keys(buckets).forEach(function (k) { groups.push(buckets[k]); });
        } else {
          var t2 = normType(d.type);
          var items = (Array.isArray(patches) ? patches : []).map(function (p) { return { text: String(p) }; });
          groups.push({ docId: doc.id, type: t2, charId: charId, date: String(date), name: base.name, image: base.image, items: items });
        }
      });
      groups.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return groups;
    });
  }
  function getPatchNotes() {
    return getAll('patchNotes').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.content || d.text || '',
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }

  /* 조회수 추출 — 저장 필드명이 다양해도 대응 */
  function viewCountOf(d) {
    var candidates = [d.views, d.viewCount, d.view, d.hit, d.hits, d.cnt, d.readCount];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] != null && candidates[i] !== '') {
        var n = Number(candidates[i]);
        if (!isNaN(n) && n >= 0) return n;
      }
    }
    return 0;
  }

  /* 이벤트 진행 상태 판별 — 여러 저장 형태 대응 */
  function eventStatusOf(d) {
    var s = String(d.status || d.state || d.eventStatus || d.ing || '').trim().toLowerCase();
    if (s) {
      if (['ing', 'ongoing', 'active', 'live', 'open', 'y', 'yes', 'true', '1', '진행중', '진행 중', '진행'].indexOf(s) > -1) return 'ing';
      if (['end', 'ended', 'close', 'closed', 'n', 'no', 'false', '0', '종료', '종료됨'].indexOf(s) > -1) return 'end';
    }
    var flags = [d.isActive, d.active, d.isOngoing, d.ongoing, d.on];
    for (var i = 0; i < flags.length; i++) {
      var f = flags[i];
      if (f === true || f === 1 || f === '1') return 'ing';
      if (f === false || f === 0 || f === '0') return 'end';
    }
    var end = d.endDate || d.end || d.endAt || d.finishDate || d.closeDate;
    if (end) {
      var t = end.toDate ? end.toDate().getTime() : new Date(String(end).replace(/-/g, '/')).getTime();
      if (!isNaN(t)) return t + 86400000 > Date.now() ? 'ing' : 'end';
    }
    var start = d.startDate || d.start || d.startAt;
    if (start) {
      var st = start.toDate ? start.toDate().getTime() : new Date(String(start).replace(/-/g, '/')).getTime();
      if (!isNaN(st)) return st <= Date.now() ? 'ing' : 'end';
    }
    return 'ing';
  }
  function getEvents() {
    return getAll('events').then(function (docs) {
      var visibleDocs = docs.filter(function (doc) { return (doc.data() || {}).visible !== false; });
      var out = visibleDocs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.content || d.text || '',
          image: pickImage(d),
          status: eventStatusOf(d),
          startDate: normDateField(d.startDate || d.start || ''),
          endDate: normDateField(d.endDate || d.end || ''),
          likeCount: d.likeCount || 0,
          commentCount: d.commentCount || 0,
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }
  function getBoards() {
    return getAll('boards').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || d.nickname || '선원',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          ts: tsKey(d.createdAt),
          content: d.text || d.content || '',
          category: d.prefix || d.category || '자유',
          images: d.images || [],
          likedBy: d.likedBy || [],
          likeCount: d.likeCount || 0,
          commentCount: d.commentCount || 0,
          views: viewCountOf(d)
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }
  function getBanners() {
    return getAll('banners').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return { docId: doc.id, image: pickImage(d), title: d.title || '', tag: d.tag || '', link: d.link || '', page: d.page || '', order: d.order || 0 };
      });
      return out.filter(function (b) { return b.image || b.title; }).sort(function (a, b) { return a.order - b.order; });
    });
  }
  function getNotices() {
    return getAll('notices').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          content: d.content || d.text || '',
          category: d.category || ''
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    });
  }

  /* ---------- 고객센터 정보 (공지사항과 분리된 전용 컬렉션) ----------
     공지사항(notices)과 혼동되지 않도록 'customerService' 컬렉션을 읽는다.
     컬렉션이 비어 있거나 읽기 권한이 없으면 빈 배열을 반환해 고객센터만 조용히 비운다. */
  function getCustomerService() {
    return getAll('customerService').then(function (docs) {
      var out = docs.map(function (doc) {
        var d = doc.data() || {};
        return {
          docId: doc.id,
          title: d.title || d.question || '',
          author: d.author || '운영팀',
          date: String(normDateField(d.date) || dateKey(d.createdAt) || ''),
          content: d.content || d.answer || d.text || '',
          category: d.category || ''
        };
      });
      out.sort(function (a, b) { return b.date.localeCompare(a.date); });
      return out;
    }).catch(function () { return []; });
  }

  /* ---------- 게시글 작성 ---------- */
  function addBoard(data) {
    return db.collection('boards').add(data);
  }

  /* ---------- 좋아요 ---------- */
  function getLikeDoc(type, id) {
    return db.collection('likes').doc(type + '_' + id).get().then(function (s) {
      return s.exists ? s.data() : null;
    }).catch(function () { return null; });
  }
  function toggleGenericLike(type, id, uid) {
    var ref = db.collection('likes').doc(type + '_' + id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var d = snap.exists ? snap.data() : { likedBy: [], likeCount: 0 };
        var arr = d.likedBy || [];
        var idx = arr.indexOf(uid);
        var nowLiked;
        if (idx > -1) { arr.splice(idx, 1); nowLiked = false; }
        else { arr.push(uid); nowLiked = true; }
        tx.set(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) });
        return nowLiked;
      });
    });
  }
  function toggleBoardLike(boardId, uid, currentlyLiked) {
    var ref = db.collection('boards').doc(boardId);
    return ref.get().then(function (snap) {
      var d = snap.exists ? snap.data() : {};
      var arr = (d.likedBy || []).slice();
      var idx = arr.indexOf(uid);
      var nowLiked;
      if (idx > -1) { arr.splice(idx, 1); nowLiked = false; }
      else { arr.push(uid); nowLiked = true; }
      return ref.update({ likedBy: arr, likeCount: Math.max(0, arr.length) }).then(function () { return nowLiked; });
    });
  }

  /* ---------- 사용자 ---------- */
  function getUserDoc(uid) {
    return db.collection('users').doc(uid).get().then(function (s) { return s.exists ? s.data() : null; }).catch(function () { return null; });
  }
  function ensureUserDoc(user, extra) {
    var ref = db.collection('users').doc(user.uid);
    return ref.get().then(function (s) {
      if (s.exists) return s.data();
      var data = {
        uid: user.uid,
        nickname: (extra && extra.nickname) || user.displayName || (user.email ? user.email.split('@')[0] : '선원'),
        profileIcon: 0,
        email: user.email || '',
        settings: { patch: false, fav: false, event: false, comment: false }, /* 알림은 기본 Off */
        favChars: [], favSupports: [],
        counts: { posts: 0, comments: 0, likes: 0 },
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
      };
      return ref.set(data).then(function () { return data; });
    }).catch(function (e) { console.error('[FPP] 사용자 문서 실패:', e); return null; });
  }
  function updateUserDoc(uid, patch) {
    return db.collection('users').doc(uid).set(patch, { merge: true });
  }
  function getFavs(uid) {
    return getUserDoc(uid).then(function (d) {
      return { chars: (d && d.favChars) || [], supports: (d && d.favSupports) || [] };
    });
  }
  function bumpUserLikeCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.likes = Math.max(0, (c.likes || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }
  function bumpUserCommentCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.comments = Math.max(0, (c.comments || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }
  function bumpUserPostCount(uid, delta) {
    return getUserDoc(uid).then(function (d) {
      var c = (d && d.counts) || { posts: 0, comments: 0, likes: 0 };
      c.posts = Math.max(0, (c.posts || 0) + delta);
      return updateUserDoc(uid, { counts: c });
    }).catch(function () { });
  }

  /* ---------- 댓글 ---------- */
  function colForComment(type) { return type === 'event' ? 'eventComments' : 'boardComments'; }
  function getComments(type, id) {
    return db.collection(colForComment(type)).where('targetId', '==', id).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) {
        var d = doc.data() || {};
        out.push({
          docId: doc.id,
          text: d.text || d.content || '',
          authorName: d.authorName || d.nickname || '선원',
          authorIcon: d.authorIcon != null ? d.authorIcon : 0,
          uid: d.uid || '',
          createdAt: d.createdAt
        });
      });
      out.sort(function (a, b) { return tsKey(a.createdAt) - tsKey(b.createdAt); });
      return out;
    });
  }
  function addComment(type, id, text, user, ud) {
    return db.collection(colForComment(type)).add({
      targetId: id,
      text: text,
      uid: user.uid,
      authorName: (ud && ud.nickname) || user.displayName || '선원',
      authorIcon: (ud && ud.profileIcon != null) ? ud.profileIcon : 0,
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  function deleteComment(type, docId) {
    return db.collection(colForComment(type)).doc(docId).delete();
  }

  /* ---------- 문의 ---------- */
  function addInquiry(item, user) {
    var data = {
      title: item.title, content: item.content, contact: item.contact,
      uid: user ? user.uid : '',
      status: '접수완료',
      date: new Date().toISOString().slice(0, 10),
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };
    return db.collection('inquiries').add(data).then(function () { return { remote: true }; })
      .catch(function () {
        var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
        local.unshift(data);
        localStorage.setItem('fpp_inquiries', JSON.stringify(local));
        return { remote: false };
      });
  }
  function getMyInquiries(user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    if (!user) return Promise.resolve(local);
    return db.collection('inquiries').where('uid', '==', user.uid).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) { var d = doc.data() || {}; d.docId = doc.id; out.push(d); });
      out.sort(function (a, b) { return tsKey(b.createdAt) - tsKey(a.createdAt); });
      return out.concat(local);
    }).catch(function () { return local; });
  }

  /* ---------- 캐릭터 꿀팁 (유저 작성) — 원본 'userTips' 컬렉션 ----------
     원본 필드: charId, text, authorUid, authorName, authorPhoto, createdAt, likedBy, dislikedBy */
  function _queryUserTips(val) {
    return db.collection('userTips').where('charId', '==', val).get().then(function (snap) {
      var out = [];
      snap.forEach(function (doc) {
        var t = doc.data() || {};
        var text = tipTextOf(t.text != null ? t.text : t);
        if (!text) return;
        out.push({
          docId: doc.id, text: text,
          authorUid: t.authorUid || t.uid || '',
          author: t.authorName || t.author || '선원',
          photo: t.authorPhoto || '',
          likedBy: t.likedBy || [],
          dislikedBy: t.dislikedBy || [],
          createdAt: t.createdAt || null
        });
      });
      return out;
    });
  }
  function getCharTips(charId) {
    var cid = charId;
    var num = Number(cid);
    var isNum = !isNaN(num) && String(num) === String(cid);
    var tries = [];
    if (isNum) tries.push(_queryUserTips(num));
    tries.push(_queryUserTips(String(cid)));
    return Promise.all(tries.map(function (p) { return p.catch(function () { return []; }); }))
      .then(function (results) {
        var seen = {}, out = [];
        results.forEach(function (arr) {
          arr.forEach(function (t) { if (!seen[t.docId]) { seen[t.docId] = 1; out.push(t); } });
        });
        /* 좋아요순 → 최신순 정렬 (원본과 동일) */
        out.sort(function (a, b) {
          var la = (a.likedBy || []).length, lb = (b.likedBy || []).length;
          if (lb !== la) return lb - la;
          return tsKey(b.createdAt) - tsKey(a.createdAt);
        });
        /* 로컬에 저장된 팁 병합 */
        var local = JSON.parse(localStorage.getItem('fpp_char_tips') || '[]')
          .filter(function (t) { return String(t.charId) === String(cid); })
          .map(function (t) {
            return { docId: t.docId, text: t.text, authorUid: t.uid || '', author: t.authorName || '선원',
              photo: '', likedBy: [], dislikedBy: [], createdAt: null, local: true };
          });
        return out.concat(local);
      })
      .catch(function () { return []; });
  }
  function addCharTip(charId, text, user, ud) {
    var remote = {
      charId: charId, text: text,
      authorUid: user ? user.uid : '',
      authorName: (ud && ud.nickname) || (user && user.displayName) || '선원',
      authorPhoto: '',
      createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      likedBy: [], dislikedBy: []
    };
    return db.collection('userTips').add(remote).then(function () { return { remote: true }; })
      .catch(function () {
        var local = JSON.parse(localStorage.getItem('fpp_char_tips') || '[]');
        local.unshift({ docId: 'local_' + Date.now(), charId: charId, text: text,
          uid: user ? user.uid : '', authorName: (ud && ud.nickname) || '선원' });
        localStorage.setItem('fpp_char_tips', JSON.stringify(local));
        return { remote: false };
      });
  }
  function _localTips() { return JSON.parse(localStorage.getItem('fpp_char_tips') || '[]'); }
  function _saveLocalTips(arr) { localStorage.setItem('fpp_char_tips', JSON.stringify(arr)); }
  function updateCharTip(docId, text) {
    if (String(docId).indexOf('local_') === 0) {
      var arr = _localTips().map(function (t) { return t.docId === docId ? Object.assign({}, t, { text: text }) : t; });
      _saveLocalTips(arr);
      return Promise.resolve();
    }
    return db.collection('userTips').doc(docId).update({ text: text });
  }
  function deleteCharTip(docId) {
    if (String(docId).indexOf('local_') === 0) {
      _saveLocalTips(_localTips().filter(function (t) { return t.docId !== docId; }));
      return Promise.resolve();
    }
    return db.collection('userTips').doc(docId).delete();
  }
  function toggleTipVote(docId, uid, type) {
    var ref = db.collection('userTips').doc(docId);
    var union = window.firebase.firestore.FieldValue.arrayUnion(uid);
    var remove = window.firebase.firestore.FieldValue.arrayRemove(uid);
    return ref.get().then(function (snap) {
      if (!snap.exists) return;
      var d = snap.data() || {};
      var liked = (d.likedBy || []).indexOf(uid) > -1;
      var disliked = (d.dislikedBy || []).indexOf(uid) > -1;
      if (type === 'like') {
        return liked
          ? ref.update({ likedBy: remove })
          : ref.update({ likedBy: union, dislikedBy: remove });
      }
      return disliked
        ? ref.update({ dislikedBy: remove })
        : ref.update({ dislikedBy: union, likedBy: remove });
    });
  }

  return {
    get ready() { return ready; },
    auth: auth, db: database,
    onReady: onReady,
    __reinit: function () { if (!ready) init(); },
    errMsg: errMsg, dateKey: dateKey, tsKey: tsKey, normDateField: normDateField, pickImage: pickImage,
    getCharacters: getCharacters, getSupportCharacters: getSupportCharacters,
    getPvpPatches: getPvpPatches, getPatchNotes: getPatchNotes,
    getEvents: getEvents, getBoards: getBoards, getBanners: getBanners, getNotices: getNotices, getCustomerService: getCustomerService,
    addBoard: addBoard,
    getLikeDoc: getLikeDoc, toggleGenericLike: toggleGenericLike, toggleBoardLike: toggleBoardLike,
    getUserDoc: getUserDoc, ensureUserDoc: ensureUserDoc, updateUserDoc: updateUserDoc, getFavs: getFavs,
    bumpUserLikeCount: bumpUserLikeCount, bumpUserCommentCount: bumpUserCommentCount, bumpUserPostCount: bumpUserPostCount,
    getComments: getComments, addComment: addComment, deleteComment: deleteComment,
    addInquiry: addInquiry, getMyInquiries: getMyInquiries,
    getCharTips: getCharTips, addCharTip: addCharTip,
    updateCharTip: updateCharTip, deleteCharTip: deleteCharTip, toggleTipVote: toggleTipVote
  };
})();
