// apps/client/src/interceptors/auth.interceptor.js
import angular from 'angular';

angular.module('taskforge')
  .factory('authInterceptor', function ($q, $rootScope, $injector, TokenStore) {
    'ngInject';

    let isRefreshing = false;
    let pendingQueue = [];

    function isApiRequest(url, base) {
      if (!url) return false;
      const normBase = (base || '').replace(/\/$/, '');
      return url.startsWith('/api/')
        || (normBase && url.startsWith(`${normBase}/api/`));
    }

    function isAuthEndpoint(url) {
      return ['/api/auth/login', '/api/auth/register', '/api/auth/refresh']
        .some(p => url.includes(p));
    }

    function processQueue(error, token = null) {
      pendingQueue.forEach(({ resolve, reject, config }) => {
        if (error) {
          reject(error);
        } else {
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
          resolve(config);
        }
      });
      pendingQueue = [];
    }

    async function refreshToken($http) {
      try {
        // Only the refresh call needs cookies
        const res = await $http.post('/api/auth/refresh', null, {
          withCredentials: true,
          headers: { Accept: 'application/json' }
        });
        const newToken = res?.data?.accessToken;
        if (!newToken) throw new Error('No access token in refresh response');

        // Store new token
        if (typeof TokenStore.set === 'function') {
          TokenStore.set(newToken);
        } else if (typeof TokenStore.setAccessToken === 'function') {
          TokenStore.setAccessToken(newToken);
        } else {
          localStorage.setItem('access_token', newToken);
        }
        return newToken;
      } catch (err) {
        // Clear token on refresh failure
        if (typeof TokenStore.clear === 'function') TokenStore.clear();
        localStorage.removeItem('access_token');
        throw err;
      }
    }

    return {
      request(config) {
        try {
          const ApiService = $injector.get('ApiService');
          const base = ApiService.baseUrl() || '';
          const url = config.url || '';

          if (isApiRequest(url, base)) {
            // Skip auth headers for public auth endpoints
            if (!isAuthEndpoint(url)) {
              const token =
                (typeof TokenStore.get === 'function' && TokenStore.get())
                || (typeof TokenStore.getAccessToken === 'function' && TokenStore.getAccessToken())
                || localStorage.getItem('access_token')
                || null;

              if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
              }
            }

            // Important: do NOT force cookies for normal API calls
            // We rely on Bearer tokens + dev proxy (same-origin)
            config.withCredentials = false;

            // Be explicit about JSON
            config.headers = config.headers || {};
            if (!config.headers.Accept) config.headers.Accept = 'application/json';
          }
        } catch {
          // If ApiService not available yet, just proceed
        }
        return config;
      },

      responseError(rejection) {
        const $http = $injector.get('$http');
        const $state = $injector.get('$state');
        const ApiService = $injector.get('ApiService');
        const AuthService = $injector.get('AuthService');

        const status = rejection?.status;
        const cfg = rejection?.config || {};
        const base = ApiService.baseUrl() || '';
        const url = cfg.url || '';

        // Not an API call or not unauthorized → bubble up
        if (!isApiRequest(url, base) || status !== 401) {
          try { $rootScope.$broadcast('$httpError', rejection); } catch {}
          return $q.reject(rejection);
        }

        // If user not authenticated, go to login
        if (!AuthService.isAuthenticated()) {
          if (typeof TokenStore.clear === 'function') TokenStore.clear();
          localStorage.removeItem('access_token');
          $state.go('login');
          return $q.reject(rejection);
        }

        // Avoid infinite loop
        if (cfg.__isRetry || isAuthEndpoint(url)) {
          if (typeof TokenStore.clear === 'function') TokenStore.clear();
          localStorage.removeItem('access_token');
          $state.go('login');
          return $q.reject(rejection);
        }

        const deferred = $q.defer();
        pendingQueue.push({
          resolve: (newConfig) => deferred.resolve($http(newConfig)),
          reject: (err) => deferred.reject(err),
          config: { ...cfg, __isRetry: true }
        });

        if (!isRefreshing) {
          isRefreshing = true;
          refreshToken($http)
            .then((newToken) => processQueue(null, newToken))
            .catch((err) => {
              processQueue(err, null);
              $state.go('login');
            })
            .finally(() => { isRefreshing = false; });
        }

        return deferred.promise;
      }
    };
  });

// Note: The interceptor is registered in main.js via $httpProvider.interceptors.push('authInterceptor')