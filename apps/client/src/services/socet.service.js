import angular from 'angular';
import io from 'socket.io-client';

angular.module('taskforge').factory('SocketService', function (ENV, TokenStore, AuthService, $q) {
  'ngInject';

  let socket = null;
  let connected = false;

  function connect() {
    if (socket && connected) return socket;

    socket = io(ENV.API_URL, {
      path: '/socket.io',
      transports: ['websocket'], // prefer WS in Codespaces
      withCredentials: true,
      auth: { token: TokenStore.get() || '' }
    });

    socket.on('connect', () => {
      connected = true;
      // eslint-disable-next-line no-console
      console.log('Socket connected', socket.id);
    });

    socket.on('disconnect', () => {
      connected = false;
      // eslint-disable-next-line no-console
      console.log('Socket disconnected');
    });

    socket.on('connect_error', async (err) => {
      // If token expired, try refresh then reconnect
      if (err?.message === 'UNAUTHORIZED') {
        try {
          await AuthService.tryRefresh();
          updateAuth(TokenStore.get() || '');
        } catch (_) {
          // guarded routes will handle redirect
        }
      }
    });

    return socket;
  }

  function updateAuth(token) {
    const s = connect();
    s.auth = { token: token || '' };
    // Reconnect to apply new auth
    if (connected) {
      s.disconnect();
    }
    s.connect();
  }

  return {
    get() {
      return connect();
    },
    joinBoard(boardId) {
      const s = connect();
      const d = $q.defer();
      s.emit('board:join', boardId, (ack) => {
        if (ack?.ok) d.resolve(true);
        else d.reject(ack?.error || 'join failed');
      });
      return d.promise;
    },
    leaveBoard(boardId) {
      const s = connect();
      s.emit('board:leave', boardId);
    },
    on(event, handler) {
      const s = connect();
      s.on(event, handler);
      return () => s.off(event, handler);
    },
    updateAuth
  };
});