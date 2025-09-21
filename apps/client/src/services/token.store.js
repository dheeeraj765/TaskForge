import angular from 'angular';

angular.module('taskforge').factory('TokenStore', function () {
  'ngInject';
  let accessToken = null;

  return {
    get() {
      return accessToken;
    },
    set(token) {
      accessToken = token || null;
    },
    clear() {
      accessToken = null;
    }
  };
});