// apps/client/src/services/auth.service.js
import angular from 'angular';

angular.module('taskforge').factory('AuthService', function (ApiService, TokenStore, SocketService) {
  'ngInject';

  function applyTokens({ accessToken, refreshToken }) {
    if (accessToken) {
      TokenStore.set(accessToken);
      if (typeof SocketService.updateAuth === 'function') {
        SocketService.updateAuth(accessToken);
      }
    } else {
      TokenStore.clear();
      if (typeof SocketService.updateAuth === 'function') {
        SocketService.updateAuth('');
      }
    }

    if (refreshToken) {
      TokenStore.setRefresh(refreshToken);
    } else {
      TokenStore.setRefresh(null);
    }
  }

  function setTokensFromResponse(res) {
    const data = res?.data || {};
    const accessToken =
      data.accessToken || data.token || data.access_token || '';
    const refreshToken =
      data.refreshToken || data.refresh_token || '';

    applyTokens({ accessToken, refreshToken });
    return accessToken;
  }

  return {
    async login(email, password) {
      const res = await ApiService.post('/auth/login', { email, password }, { withCredentials: true });
      setTokensFromResponse(res);
      return res.data?.user;
    },

    async register(username, email, password) {
      const res = await ApiService.post('/auth/register', { username, email, password }, { withCredentials: true });
      setTokensFromResponse(res);
      return res.data?.user;
    },

    async tryRefresh() {
      // Even if we don't store refresh client-side, the httpOnly cookie may exist
      try {
        const res = await ApiService.post('/auth/refresh', null, { withCredentials: true });
        const token = setTokensFromResponse(res);
        if (!token) throw new Error('No access token in refresh response');
        return token;
      } catch (err) {
        applyTokens({ accessToken: '', refreshToken: '' });
        throw err;
      }
    },

    async logout() {
      try {
        await ApiService.post('/auth/logout', null, { withCredentials: true });
      } finally {
        applyTokens({ accessToken: '', refreshToken: '' });
      }
    },

    isAuthenticated() {
      return !!TokenStore.get();
    }
  };
});