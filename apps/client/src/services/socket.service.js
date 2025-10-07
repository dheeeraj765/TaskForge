import angular from 'angular';
import io from 'socket.io-client';

angular.module('taskforge').factory('SocketService', function (ApiService, TokenStore, $q, $injector) {
  'ngInject';

  let socket = null;
  let connected = false;

  function connect() {
    const token = TokenStore.get();
    if (!token) {
      console.warn('No access token — skipping WebSocket connection');
      return null;
    }
    if (socket && connected) {
      console.log('🔌 Socket already connected:', socket.id);
      return socket;
    }

    const serverUrl = ApiService.baseUrl(); // e.g. https://...-4000.app.github.dev
    console.log('🔌 Connecting WS to:', serverUrl, 'with auth:', token ? 'Present' : 'Missing');  // ✅ Debug token presence

    socket = io(serverUrl, {
      path: '/socket.io',
      transports: ['websocket'],  // Prefer WS for Codespaces (wss:// auto)
      withCredentials: true,
      secure: true,  // ✅ Explicit for HTTPS/Codespaces
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,  // ✅ Mild delay to reduce spam on fails
      auth: { token }
    });

    socket.on('connect', () => {
      connected = true;
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      connected = false;
      console.warn('🔌 Socket disconnected:', reason || 'Unknown');
    });

    socket.on('connect_error', async (err) => {
      console.error('🔌 WebSocket connect error:', err?.message || err, '(full:', err, ')');  // ✅ Full err log for trace
      
      // ✅ Enhanced: Check if refresh token exists before attempting
      if (err?.message === 'UNAUTHORIZED' && (TokenStore.hasRefresh?.() || true)) {  // Fallback if no hasRefresh
        try {
          const AuthService = $injector.get('AuthService');
          console.log('🔄 Socket UNAUTHORIZED—attempting refresh...');
          await AuthService.tryRefresh();
          const newToken = TokenStore.get();
          if (newToken) {
            console.log('✅ Socket refresh succeeded—reconnecting...');
            updateAuth(newToken);
          }
        } catch (refreshErr) {
          console.warn('❌ Socket token refresh failed:', refreshErr?.message || refreshErr, '— user must re-authenticate');
        }
      }
    });

    return socket;
  }

  function updateAuth(token) {
    console.log('🔄 Updating socket auth with new token');  // ✅ Log for trace
    const s = connect();
    if (!s) return;
    s.auth = { token: token || '' };
    if (connected) {
      s.disconnect();
      // ✅ Small delay before reconnect to avoid rapid fire
      setTimeout(() => s.connect(), 500);
    } else {
      s.connect();
    }
  }

  return {
    get() {
      return connect();
    },

    joinBoard(boardId) {
      const s = connect();
      const deferred = $q.defer();
      if (!s) {
        deferred.reject('No socket connection');
        return deferred.promise;
      }
      console.log('🏠 Joining board via socket:', boardId);  // ✅ Debug emit
      s.emit('board:join', boardId, (ack) => {
        if (ack?.ok) {
          console.log('✅ Board joined:', boardId);
          deferred.resolve(true);
        } else {
          console.error('❌ Failed to join board:', boardId, ack?.error || 'Unknown error');
          deferred.reject(ack?.error || 'Failed to join board');
        }
      });
      return deferred.promise;
    },

    leaveBoard(boardId) {
      const s = connect();
      if (s) {
        console.log('🏠 Leaving board via socket:', boardId);  // ✅ Debug
        s.emit('board:leave', boardId);
      }
    },

    on(event, handler) {
      const s = connect();
      if (!s) return () => {};
      s.on(event, handler);
      console.log('👂 Socket listening for:', event);  // ✅ Optional debug
      return () => s.off(event, handler);
    },

    updateAuth
  };
});