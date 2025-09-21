import angular from 'angular';

angular.module('taskforge').factory('AuthService', function (ApiService, TokenStore, SocketService) {
  'ngInject';

  function applyToken(token) {
    if (token) {
      TokenStore.set(token);
      SocketService.updateAuth(token);
    } else {
      TokenStore.clear();
      SocketService.updateAuth('');
    }
  }

  function setTokenFromResponse(res) {
    const token = res?.data?.accessToken;
    applyToken(token || '');
    return token;
  }

  return {
    async login(email, password) {
      const res = await ApiService.post('/api/auth/login', { email, password });
      setTokenFromResponse(res);
      return res.data?.user;
    },

    async register(username, email, password) {
      const res = await ApiService.post('/api/auth/register', { username, email, password });
      setTokenFromResponse(res);
      return res.data?.user;
    },

    // Try to refresh access token using HttpOnly cookie
    async tryRefresh() {
      try {
        const res = await ApiService.post('/api/auth/refresh');
        const token = res?.data?.accessToken;
        if (!token) throw new Error('No access token in refresh response');
        applyToken(token);
        return token;
      } catch (err) {
        applyToken('');
        throw err;
      }
    },

    async logout() {
      try {
        await ApiService.post('/api/auth/logout');
      } finally {
        applyToken('');
      }
    },

    isAuthenticated() {
      return !!TokenStore.get();
    }
  };
});