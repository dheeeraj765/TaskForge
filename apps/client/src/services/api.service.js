// path: apps/web/src/services/api.service.js
import angular from 'angular';

angular.module('taskforge').factory('ApiService', function ($http, ENV) {
  'ngInject';

  // In dev, ENV.API_URL is '' (via webpack DefinePlugin) so requests are relative and proxied.
  const RAW_BASE = (ENV && ENV.API_URL) || '';
  const BASE = String(RAW_BASE).replace(/\/$/, ''); // trim trailing slash

  // Debug (remove when stable)
  console.log('🌐 ApiService base URL from ENV:', BASE || '(empty for dev proxy)');

  // Ensure paths are normalized and include /api once.
  function normalizePath(path) {
    let p = String(path || '');
    if (!p.startsWith('/')) p = '/' + p;
    if (!/^\/api(\/|$)/.test(p)) p = '/api' + p; // prefix /api if caller omitted it
    return p;
  }

  function url(path) {
    const full = `${BASE}${normalizePath(path)}`;
    console.log('🔗 Building API URL:', full);
    return full;
  }

  // We use Bearer tokens; do NOT send cookies cross-site.
  // Dev proxy is same-origin anyway, so credentials are unnecessary.
  const defaultCfg = { withCredentials: false };

  return {
    get(path, config = {}) {
      return $http.get(url(path), { ...defaultCfg, ...config });
    },
    post(path, data, config = {}) {
      return $http.post(url(path), data, { ...defaultCfg, ...config });
    },
    put(path, data, config = {}) {
      return $http.put(url(path), data, { ...defaultCfg, ...config });
    },
    patch(path, data, config = {}) {
      return $http.patch(url(path), data, { ...defaultCfg, ...config });
    },
    delete(path, config = {}) {
      return $http.delete(url(path), { ...defaultCfg, ...config });
    },
    baseUrl() {
      console.log('🌐 Resolved base URL for interceptors:', BASE || '(empty for dev proxy)');
      return BASE;
    }
  };
});