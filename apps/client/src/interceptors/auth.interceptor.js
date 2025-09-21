import angular from 'angular';

angular.module('taskforge').factory('authInterceptor', function ($q, $injector, TokenStore) {
  'ngInject';

  let isRefreshing = false;
  let pendingQueue = [];

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

  async function refreshToken($http, ApiService) {
    try {
      const res = await $http.post(`${ApiService.baseUrl()}/api/auth/refresh`, null, {
        withCredentials: true
      });
      const newToken = res.data && res.data.accessToken;
      if (newToken) {
        TokenStore.set(newToken);
        return newToken;
      }
      throw new Error('No access token in refresh response');
    } catch (err) {
      TokenStore.clear();
      throw err;
    }
  }

  return {
    request(config) {
      // Attach Authorization only for our API domain
      try {
        const ApiService = $injector.get('ApiService');
        const base = ApiService.baseUrl();
        if (config.url && config.url.startsWith(base)) {
          const token = TokenStore.get();
          if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
          }
          // Always send cookies (refresh token) to API
          config.withCredentials = true;
        }
      } catch (_) {
        // ignore if ApiService not available yet
      }
      return config;
    },

    responseError(rejection) {
      const $http = $injector.get('$http');
      const $state = $injector.get('$state');
      const ApiService = $injector.get('ApiService');

      const { status, config } = rejection || {};
      const isApiCall = config && config.url && config.url.startsWith(ApiService.baseUrl());

      if (!isApiCall || status !== 401) {
        return $q.reject(rejection);
      }

      // Prevent infinite loops
      if (config.__isRetry) {
        TokenStore.clear();
        $state.go('login');
        return $q.reject(rejection);
      }

      const deferred = $q.defer();
      pendingQueue.push({
        resolve: (newConfig) => deferred.resolve($http(newConfig)),
        reject: (err) => deferred.reject(err),
        config: { ...config, __isRetry: true }
      });

      if (!isRefreshing) {
        isRefreshing = true;
        refreshToken($http, ApiService)
          .then((newToken) => {
            processQueue(null, newToken);
          })
          .catch((err) => {
            processQueue(err, null);
            $state.go('login');
          })
          .finally(() => {
            isRefreshing = false;
          });
      }

      return deferred.promise;
    }
  };
});
