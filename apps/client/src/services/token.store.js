// apps/client/src/services/token.store.js
import angular from 'angular';

angular.module('taskforge').factory('TokenStore', function () {
  'ngInject';

  // Keys we’ll support for maximum compatibility
  const ACCESS_KEYS = ['accessToken', 'access_token', 'jwt', 'token'];
  const REFRESH_KEYS = ['refreshToken', 'refresh_token'];

  const DEBUG = false; // flip to true if you want verbose logs

  function log(...args) {
    if (DEBUG) console.log('[TokenStore]', ...args);
  }

  function readFrom(storage, keys) {
    for (const k of keys) {
      const v = storage.getItem(k);
      if (v) return { key: k, value: v };
    }
    return null;
  }

  function removeFrom(storage, keys) {
    for (const k of keys) storage.removeItem(k);
  }

  function writeTo(storage, keys, value) {
    for (const k of keys) storage.setItem(k, value);
  }

  function normalizeToken(tok) {
    if (!tok) return tok;
    return tok.startsWith('Bearer ') ? tok.slice(7) : tok;
  }

  function getFromAll(keys) {
    // Prefer localStorage, then sessionStorage
    const local = readFrom(localStorage, keys);
    if (local) return local.value;
    const session = readFrom(sessionStorage, keys);
    return session ? session.value : null;
  }

  function setToAll(keys, value) {
    removeFrom(localStorage, keys);
    removeFrom(sessionStorage, keys);
    if (value) {
      writeTo(localStorage, keys, value);
    }
  }

  return {
    // Access token
    get() {
      const raw = getFromAll(ACCESS_KEYS);
      const tok = normalizeToken(raw);
      log('get access token:', tok ? 'present' : 'missing');
      return tok || null;
    },

    set(token) {
      const value = normalizeToken(token);
      if (value) {
        setToAll(ACCESS_KEYS, value);
        log('set access token');
      } else {
        this.clear();
      }
    },

    clear() {
      removeFrom(localStorage, ACCESS_KEYS);
      removeFrom(sessionStorage, ACCESS_KEYS);
      removeFrom(localStorage, REFRESH_KEYS);
      removeFrom(sessionStorage, REFRESH_KEYS);
      log('cleared all tokens');
    },

    hasToken() {
      return !!this.get();
    },

    // Aliases used by some code
    getAccessToken() { return this.get(); },
    setAccessToken(t) { return this.set(t); },

    // Refresh token (optional; many backends use httpOnly cookies instead)
    getRefresh() {
      const raw = getFromAll(REFRESH_KEYS);
      const tok = normalizeToken(raw);
      log('get refresh token:', tok ? 'present' : 'missing');
      return tok || null;
    },

    setRefresh(token) {
      const value = normalizeToken(token);
      if (value) {
        setToAll(REFRESH_KEYS, value);
        log('set refresh token');
      } else {
        removeFrom(localStorage, REFRESH_KEYS);
        removeFrom(sessionStorage, REFRESH_KEYS);
        log('cleared refresh token');
      }
    },

    hasRefresh() {
      return !!this.getRefresh();
    }
  };
});