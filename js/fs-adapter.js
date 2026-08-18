// ══════════════════════════════════════════════
// FS-ADAPTER v3.1: Firestore berperilaku seperti RTDB
// Untuk halaman non-SIPENA (jadwal, jurnal, dll)
// ══════════════════════════════════════════════
(function () {
  if (typeof firebase === 'undefined') { console.error('FS-Adapter: firebase belum dimuat'); return; }
  const firestore = firebase.firestore();
  const BASE_COL = 'sipena2';

  function clean(obj) {
    const o = {};
    for (const k in obj) { if (obj[k] !== undefined) o[k] = obj[k]; }
    return o;
  }

  function makeSnap(key, value) {
    return {
      key: key,
      val: function () { return value === undefined ? null : value; },
      exists: function () { return value !== null && value !== undefined; },
      numChildren: function () { return (value && typeof value === 'object') ? Object.keys(value).length : 0; },
      child: function (p) {
        let v = value;
        const parts = String(p).split('/');
        for (let i = 0; i < parts.length; i++) v = (v && typeof v === 'object') ? v[parts[i]] : undefined;
        return makeSnap(String(p), v);
      },
      forEach: function (cb) {
        if (!value || typeof value !== 'object') return false;
        const keys = Object.keys(value);
        for (let i = 0; i < keys.length; i++) {
          if (cb(makeSnap(keys[i], value[keys[i]])) === true) return true;
        }
        return false;
      }
    };
  }

  function buildResult(snap) {
    const result = {};
    snap.forEach(function (d) {
      const data = d.data();
      if (data && data.__folder) {
        if (!result[data.__folder]) result[data.__folder] = {};
        const copy = Object.assign({}, data);
        delete copy.__folder;
        result[data.__folder][d.id] = copy;
      } else {
        result[d.id] = data;
      }
    });
    return result;
  }

  function navigate(tree, path) {
    if (!path) return tree || null;
    let v = tree;
    const parts = String(path).split('/');
    for (let i = 0; i < parts.length; i++) v = (v && typeof v === 'object') ? v[parts[i]] : undefined;
    return v === undefined ? null : v;
  }

  function normErr(err) {
    const code = (err && err.code) || '';
    if (code === 'permission-denied') return { code: 'PERMISSION_DENIED', message: err.message };
    return err;
  }

  function createRef(path) {
    return {
      _path: path || '',
      get key() { const p = this._path.split('/'); return p[p.length - 1] || BASE_COL; },
      child: function (s) { return createRef(this._path ? this._path + '/' + s : String(s)); },
      push: function () {
        const id = firestore.collection(BASE_COL).doc().id;
        return createRef(this._path ? this._path + '/' + id : id);
      },
      set: function (obj) {
        const parts = this._path.split('/');
        if (parts.length === 1) return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj));
        return firestore.collection(BASE_COL).doc(parts[1]).set(Object.assign({}, clean(obj), { __folder: parts[0] }));
      },
      update: function (obj) {
        const parts = this._path.split('/');
        if (parts.length === 1) return firestore.collection(BASE_COL).doc(parts[0]).set(clean(obj), { merge: true });
        return firestore.collection(BASE_COL).doc(parts[1]).set(Object.assign({}, clean(obj), { __folder: parts[0] }), { merge: true });
      },
      remove: function () {
        const parts = this._path.split('/');
        return firestore.collection(BASE_COL).doc(parts.length === 1 ? parts[0] : parts[1]).delete();
      },
      on: function (event, cb, errCb) {
        const self = this;
        this._unsub = firestore.collection(BASE_COL).onSnapshot(function (snap) {
          cb(makeSnap(self._path, navigate(buildResult(snap), self._path)));
        }, function (err) { if (errCb) errCb(normErr(err)); else console.error(err); });
      },
      off: function () { if (this._unsub) { this._unsub(); this._unsub = null; } },
      once: function (event, cb, errCb) {
        const self = this;
        return firestore.collection(BASE_COL).get().then(function (snap) {
          const s = makeSnap(self._path, navigate(buildResult(snap), self._path));
          if (cb) cb(s);
          return s;
        }).catch(function (err) {
          const e = normErr(err);
          if (errCb) errCb(e); else console.error(e);
          return null;
        });
      }
    };
  }

  window.FS_ROOT = createRef('');
  if (typeof window.ROOT === 'undefined') window.ROOT = window.FS_ROOT;
})();
