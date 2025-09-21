import angular from 'angular';

angular.module('taskforge').factory('ApiService', function ($http, ENV) {
  'ngInject';

  const BASE = (ENV.API_URL || '').replace(/\/$/, '');

  function url(path) {
    return `${BASE}${path}`;
  }

  const withCreds = { withCredentials: true };

  return {
    get(path, config = {}) {
      return $http.get(url(path), { ...withCreds, ...config });
    },
    post(path, data, config = {}) {
      return $http.post(url(path), data, { ...withCreds, ...config });
    },
    patch(path, data, config = {}) {
      return $http.patch(url(path), data, { ...withCreds, ...config });
    },
    delete(path, config = {}) {
      return $http.delete(url(path), { ...withCreds, ...config });
    },
    baseUrl() {
      return BASE;
    }
  };
});