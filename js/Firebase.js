/* ============================================================
   FPP v2 — Firebase.js (데이터 접근 레이어)
   기존 Firebase 프로젝트(fighting-path-patch)의 실제 데이터에 연결.
   읽기 위주 + Firestore 규칙이 허용하는 쓰기만 수행.
   ============================================================ */
window.FB = (function () {
  'use strict';

  var CFG = {
    apiKey: 'AIzaSyB7fJJyCwZqyJ2n0aGx3h5i7k9l1m3o5p7',
    authDomain: 'fighting-path-patch.firebaseapp.com',
    projectId: 'fighting-path-patch',
    storageBucket: 'fighting-path-patch.appspot.com',
    messagingSenderId: '1083197132575',
    appId: '1:1083197132575:web:0a1b2c3d4e5f60718293a4'
  };

  var ready = false, db = null, _auth = null;
  var readyCbs = [];

  function onReady(cb) {
    if (ready) { cb && cb(); return Promise.resolve(true); }
    return new Promise(function (res) { readyCbs.push(function () { cb && cb(); res(ready); }); });
  }
  function markReady() {
    ready = true;
    readyCbs.forEach(function (cb) { try { cb(); } catch (e) { } });
    readyCbs = [];
  }

  function init() {
    if (typeof firebase === 'undefined' || !firebase.apps) { markReady(); return; }
    try {
      if (!firebase.apps.length) firebase.initializeApp(CFG);
      _auth = firebase.auth();
      db = firebase.firestore();
      ready = true;
    } catch (e) {
      ready = false;
    }
    markReady();
  }

  /* SDK가 늦게 도착해도 초기화되도록 폴링 + 즉시 시도 */
  init();
  if (!ready) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (typeof firebase !== 'undefined' && firebase.apps) { clearInterval(iv); init(); }
      else if (tries > 60) { clearInterval(iv); markReady(); }
    }, 250);
  }

  /* ---------- 유틸 ---------- */
  function auth() { return _auth; }
  function pick(d) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (d && d[k] != null && d[k] !== '') return d[k];
    }
    return null;
  }
  function dateKey(v) {
    if (!v) return '';
    if (v.seconds != null) {
      var dt = new Date(v.seconds * 1000);
      return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    }
    var s = String(v);
    if (/^\d+$/.test(s)) {
      var n = +s > 1e12 ? +s : +s * 1000;
      var d2 = new Date(n);
      return d2.getFullYear() + '-' + pad2(d2.getMonth() + 1) + '-' + pad2(d2.getDate());
    }
    var m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
    return s.slice(0, 10);
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  var REPO_CDN = 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/';
  function absImg(u) {
    if (!u) return '';
    u = String(u);
    if (/^(https?:|data:|blob:)/.test(u)) return u;
    return REPO_CDN + u.replace(/^\//, '');
  }
  function mapDocs(snap, fn) {
    var out = [];
    snap.forEach(function (d) { out.push(fn(d.data(), d.id)); });
    return out;
  }
  function col(name) { return db.collection(name); }
  function errMsg(e) {
    if (!e) return '알 수 없는 오류가 발생했습니다.';
    var c = e.code || '';
    var M = {
      'permission-denied': '접근 권한이 없습니다. 로그인 상태를 확인해 주세요.',
      'unavailable': '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.',
      'not-found': '요청한 데이터를 찾을 수 없습니다.',
      'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
      'auth/user-not-found': '해당 이메일로 가입된 계정이 없습니다.',
      'auth/wrong-password': '비밀번호가 일치하지 않습니다.',
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
      'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
      'auth/requires-recent-login': '보안을 위해 다시 로그인해 주세요.'
    };
    return M[c] || (e.message || '오류가 발생했습니다.');
  }

  /* ---------- 캐릭터 ---------- */
  function normChar(d, id) {
    return {
      docId: id,
      id: pick(d, 'id', 'num', 'no', 'characterId'),
      name: pick(d, 'name', 'title') || '이름 미상',
      image: absImg(pick(d, 'img', 'image', 'imageUrl', 'imageURL', 'icon', 'picture')),
      grade: pick(d, 'grade', 'tier', 'rank') || '',
      attr: pick(d, 'attr', 'attribute', 'element'),
      type: pick(d, 'type') || '',
      battleType: d.attribute ? (d.type || '') : (pick(d, 'battleType', 'battle_type', 'battle') || ''),
      skills: d.skills || [],
      supportSkills: pick(d, 'supportSkills', 'support_skills', 'supportSkill') || [],
      tips: pick(d, 'tips', 'adminTips') || [],
      recentPatches: pick(d, 'recentPatches', 'recent_patches') || []
    };
  }
  function getCharacters() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('characters').get().then(function (s) {
      return mapDocs(s, normChar).sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    });
  }
  function getSupportCharacters() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('supportCharacters').get().then(function (s) {
      return mapDocs(s, normChar).sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    });
  }

  /* ---------- PvP 패치 ---------- */
  function normPvpType(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === 'buff' || s === '버프' || s === '상향' || s === '상향조정') return 'buff';
    if (s === 'nerf' || s === '너프' || s === '하향' || s === '하향조정') return 'nerf';
    return 'fix';
  }
  function getPvpPatches() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('pvpPatch').get().then(function (s) {
      var groups = [];
      s.forEach(function (doc) {
        var d = doc.data(), id = doc.id;
        var base = {
          docId: id,
          charId: pick(d, 'charId', 'characterId', 'id'),
          name: pick(d, 'name', 'characterName'),
          image: absImg(pick(d, 'image', 'imageUrl', 'img')),
          date: dateKey(pick(d, 'patchDate', 'displayStart', 'date', 'updatedAt'))
        };
        var raw = pick(d, 'patches', 'items', 'list') || [];
        /* 항목별로 type/charId를 가지면 독립 그룹으로 분리 (버프+너프 공존 문서 대응) */
        var typed = raw.filter(function (p) { return p && typeof p === 'object' && pick(p, 'type', 'patchType', 'kind'); });
        if (typed.length) {
          var buckets = {};
          typed.forEach(function (p) {
            var t = normPvpType(pick(p, 'type', 'patchType', 'kind'));
            var key = t + '|' + (pick(p, 'charId', 'characterId') != null ? pick(p, 'charId', 'characterId') : base.charId);
            if (!buckets[key]) buckets[key] = { type: t, charId: pick(p, 'charId', 'characterId') != null ? pick(p, 'charId', 'characterId') : base.charId, items: [] };
            buckets[key].items.push({ text: pick(p, 'text', 'content', 'desc', 'patch', 'detail', 'note') || '' });
          });
          Object.keys(buckets).forEach(function (k) {
            var b = buckets[k];
            groups.push({ docId: id, type: b.type, charId: b.charId, name: base.name, image: base.image, date: base.date, items: b.items });
          });
          /* 타입 없는 나머지 항목은 문서 기본 타입으로 */
          var untyped = raw.filter(function (p) { return !(p && typeof p === 'object' && pick(p, 'type', 'patchType', 'kind')); });
          if (untyped.length) {
            groups.push({ docId: id, type: normPvpType(pick(d, 'type', 'patchType', 'kind')), charId: base.charId, name: base.name, image: base.image, date: base.date,
              items: untyped.map(function (p) { return typeof p === 'string' ? { text: p } : { text: pick(p, 'text', 'content', 'desc') || '' }; }) });
          }
        } else {
          groups.push({ docId: id, type: normPvpType(pick(d, 'type', 'patchType', 'kind')), charId: base.charId, name: base.name, image: base.image, date: base.date,
            items: raw.map(function (p) { return typeof p === 'string' ? { text: p } : { text: pick(p, 'text', 'content', 'desc', 'patch', 'detail') || '' }; }) });
        }
      });
      return groups.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }

  /* ---------- 콘텐츠 ---------- */
  function getPatchNotes() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('patchNotes').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          content: pick(d, 'content', 'text', 'body') || '',
          likeCount: pick(d, 'likeCount') || 0
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }
  function getNotices() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('notices').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          category: pick(d, 'category') || '',
          content: pick(d, 'content', 'text', 'body') || ''
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }
  function getBanners() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('banners').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          image: absImg(pick(d, 'image', 'imageUrl', 'imageURL', 'src', 'url')),
          title: pick(d, 'title') || '',
          tag: pick(d, 'tag', 'subtitle') || '',
          link: pick(d, 'link') || '',
          page: pick(d, 'page', 'type', 'location') || '',
          order: pick(d, 'order') || 0,
          isActive: d.isActive !== false && d.visible !== false
        };
      }).filter(function (b) { return b.isActive && b.image; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    });
  }
  function getEvents() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('events').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        var st = String(pick(d, 'status', 'state') || '').toLowerCase();
        var status = (st === 'ing' || st === '진행중' || st === 'on' || st === 'active') ? 'ing' : (st === 'end' || st === '종료' || st === '종료됨' ? 'end' : 'ing');
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          image: absImg(pick(d, 'image', 'imageUrl', 'thumbnail')),
          content: pick(d, 'content', 'text', 'body') || '',
          startDate: pick(d, 'startDate', 'start') ? dateKey(pick(d, 'startDate', 'start')) : '',
          endDate: pick(d, 'endDate', 'end') ? dateKey(pick(d, 'endDate', 'end')) : '',
          status: status,
          likeCount: pick(d, 'likeCount') || 0,
          commentCount: pick(d, 'commentCount') || 0
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }
  function getBoards() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('boards').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'nickname') || '선원',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          category: pick(d, 'prefix', 'category') || '자유',
          content: pick(d, 'text', 'content', 'body') || '',
          images: d.images || [],
          uid: pick(d, 'uid') || '',
          likedBy: d.likedBy || [],
          likeCount: pick(d, 'likeCount') || 0,
          commentCount: pick(d, 'commentCount') || 0
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }

  /* ---------- 좋아요 ---------- */
  function getLikeDoc(type, id) {
    if (!ready) return Promise.resolve(null);
    return col('likes').doc(type + '_' + id).get().then(function (d) {
      return d.exists ? d.data() : null;
    }).catch(function () { return null; });
  }
  function toggleGenericLike(type, id, uid) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var ref = col('likes').doc(type + '_' + id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var data = snap.exists ? snap.data() : { likedBy: [], likeCount: 0 };
        var arr = data.likedBy || [];
        var has = arr.indexOf(uid) > -1;
        if (has) arr = arr.filter(function (x) { return x !== uid; });
        else arr.push(uid);
        tx.set(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) }, { merge: true });
        return !has;
      });
    });
  }
  function toggleBoardLike(id, uid, wasLiked) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var ref = col('boards').doc(id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var data = snap.exists ? snap.data() : {};
        var arr = data.likedBy || [];
        var has = arr.indexOf(uid) > -1;
        if (has) arr = arr.filter(function (x) { return x !== uid; });
        else arr.push(uid);
        tx.update(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) });
        return !has;
      });
    }).catch(function () { return !wasLiked; });
  }

  /* ---------- 댓글 ---------- */
  function commentCol(type) { return type === 'event' ? 'eventComments' : 'boardComments'; }
  function getComments(type, id) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).where('targetId', '==', id).get().then(function (s) {
      return mapDocs(s, function (d, cid) {
        return {
          docId: cid,
          targetId: pick(d, 'targetId') || id,
          uid: pick(d, 'uid') || '',
          authorName: pick(d, 'authorName', 'nickname') || '선원',
          authorIcon: pick(d, 'authorIcon', 'profileIcon') || 0,
          text: pick(d, 'text', 'content') || '',
          createdAt: pick(d, 'createdAt') || null
        };
      }).sort(function (a, b) {
        var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return ta - tb;
      });
    }).catch(function () {
      return col(commentCol(type)).get().then(function (s) {
        return mapDocs(s, function (d, cid) {
          return { docId: cid, targetId: pick(d, 'targetId') || '', uid: pick(d, 'uid') || '', authorName: pick(d, 'authorName', 'nickname') || '선원', authorIcon: pick(d, 'authorIcon', 'profileIcon') || 0, text: pick(d, 'text', 'content') || '', createdAt: pick(d, 'createdAt') || null };
        }).filter(function (c) { return String(c.targetId) === String(id); });
      });
    });
  }
  function addComment(type, id, text, user, ud) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).add({
      targetId: id,
      uid: user.uid,
      authorName: (ud && ud.nickname) || user.displayName || '선원',
      authorIcon: (ud && ud.profileIcon) || 0,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      /* 게시글/이벤트 commentCount 증가 (규칙 허용 범위) */
      var target = type === 'event' ? col('events').doc(id) : col('boards').doc(id);
      return target.update({ commentCount: firebase.firestore.FieldValue.increment(1) }).catch(function () { });
    });
  }
  function deleteComment(type, cid) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).doc(cid).delete();
  }

  /* ---------- 사용자 ---------- */
  function getUserDoc(uid) {
    if (!ready) return Promise.resolve(null);
    return col('users').doc(uid).get().then(function (d) { return d.exists ? d.data() : null; }).catch(function () { return null; });
  }
  function ensureUserDoc(user, extra) {
    if (!ready) return Promise.resolve(null);
    var ref = col('users').doc(user.uid);
    return ref.get().then(function (snap) {
      if (snap.exists) return snap.data();
      var base = Object.assign({
        uid: user.uid,
        email: user.email || '',
        nickname: user.displayName || '선원',
        profileIcon: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        settings: { patch: true, fav: true, event: true, comment: true },
        favChars: [], favSupports: [],
        counts: { posts: 0, comments: 0, likes: 0 }
      }, extra || {});
      return ref.set(base).then(function () { return base; });
    });
  }
  function updateUserDoc(uid, patch) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('users').doc(uid).set(patch, { merge: true });
  }
  function getFavs(uid) {
    return getUserDoc(uid).then(function (d) {
      return { chars: (d && d.favChars) || [], supports: (d && d.favSupports) || [] };
    });
  }
  function bumpUserLikeCount(uid, delta) {
    if (!ready) return;
    col('users').doc(uid).update({ 'counts.likes': firebase.firestore.FieldValue.increment(delta) }).catch(function () { });
  }
  function bumpUserCommentCount(uid, delta) {
    if (!ready) return;
    col('users').doc(uid).update({ 'counts.comments': firebase.firestore.FieldValue.increment(delta) }).catch(function () { });
  }

  /* ---------- 고객센터 문의 ---------- */
  function addInquiry(item, user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    var rec = {
      title: item.title, content: item.content, contact: item.contact,
      uid: user ? user.uid : 'guest',
      date: new Date().toISOString().slice(0, 10),
      status: '접수완료'
    };
    if (!ready || !user) {
      local.unshift(rec);
      localStorage.setItem('fpp_inquiries', JSON.stringify(local));
      return Promise.resolve({ remote: false });
    }
    return col('inquiries').add(Object.assign(rec, { createdAt: firebase.firestore.FieldValue.serverTimestamp() }))
      .then(function () { return { remote: true }; })
      .catch(function () {
        local.unshift(rec);
        localStorage.setItem('fpp_inquiries', JSON.stringify(local));
        return { remote: false };
      });
  }
  function getMyInquiries(user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    if (!ready || !user) return Promise.resolve(local);
    return col('inquiries').where('uid', '==', user.uid).get().then(function (s) {
      var remote = mapDocs(s, function (d) {
        return { title: pick(d, 'title') || '', content: pick(d, 'content') || '', date: dateKey(pick(d, 'date', 'createdAt')), status: pick(d, 'status') || '접수완료' };
      });
      return remote.concat(local);
    }).catch(function () { return local; });
  }

  return {
    get ready() { return ready; }, auth: auth, db: function () { return db; },
    errMsg: errMsg, dateKey: dateKey, onReady: onReady,
    getCharacters: getCharacters, getSupportCharacters: getSupportCharacters,
    getPvpPatches: getPvpPatches, getPatchNotes: getPatchNotes, getNotices: getNotices,
    getBanners: getBanners, getEvents: getEvents, getBoards: getBoards,
    getLikeDoc: getLikeDoc, toggleGenericLike: toggleGenericLike, toggleBoardLike: toggleBoardLike,
    getComments: getComments, addComment: addComment, deleteComment: deleteComment,
    getUserDoc: getUserDoc, ensureUserDoc: ensureUserDoc, updateUserDoc: updateUserDoc,
    getFavs: getFavs, bumpUserLikeCount: bumpUserLikeCount, bumpUserCommentCount: bumpUserCommentCount,
    addInquiry: addInquiry, getMyInquiries: getMyInquiries
  };
})();
