const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Board = require('../models/Board');

let io;

function setupSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, credentials: true },
    path: '/socket.io'
  });

  // Auth middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake?.auth?.token;
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, config.accessToken.secret);
      socket.user = payload; // { sub, email, username }
      next();
    } catch (err) {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    // Client asks to join a board room
    socket.on('board:join', async (boardId, cb) => {
      try {
        const board = await Board.findById(boardId).lean();
        if (!board) throw new Error('NOT_FOUND');
        const uid = socket.user?.sub;
        const isMember =
          String(board.ownerId) === String(uid) ||
          (board.members || []).some((m) => String(m.userId) === String(uid));
        if (!isMember) throw new Error('FORBIDDEN');
        socket.join(room(boardId));
        cb && cb({ ok: true });
      } catch (err) {
        cb && cb({ ok: false, error: err.message });
      }
    });

    socket.on('board:leave', (boardId) => {
      socket.leave(room(boardId));
    });
  });

  return io;
}

function room(boardId) {
  return `board:${boardId}`;
}

// Broadcast helpers
function emitToBoard(boardId, event, payload) {
  if (!io) return;
  io.to(room(boardId)).emit(event, payload);
}

function getIO() {
  return io;
}

module.exports = { setupSocket, emitToBoard, getIO };