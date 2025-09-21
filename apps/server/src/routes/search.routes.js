const express = require('express');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Board = require('../models/Board');
const Card = require('../models/Card');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function escapeRegex(s) {
  // Escapes regex special chars: - / \ ^ $ * + ? . ( ) | [ ] { }
  return s.replace(/[-/\\^$*+?.()|[```{}]/g, '\\$&');
}

// GET /api/boards/:boardId/search?q=keyword
router.get('/boards/:boardId/search', async (req, res) => {
  const { boardId } = req.params;
  const q = (req.query.q || '').toString().trim();

  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }

  const board = await Board.findById(boardId).lean();
  if (!board) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  if (!Board.userIsMember(board, req.user.sub)) {
    return res.status(StatusCodes.FORBIDDEN).json({ error: { message: 'Forbidden' } });
  }

  if (!q) return res.status(StatusCodes.OK).json({ results: [] });

  const regex = new RegExp(escapeRegex(q), 'i');
  const results = await Card.find({
    boardId,
    $or: [{ title: regex }, { description: regex }],
  })
    .sort({ position: 1 })
    .limit(50)
    .lean();

  res.status(StatusCodes.OK).json({
    results: results.map((c) => ({
      id: String(c._id),
      listId: String(c.listId),
      title: c.title,
      description: c.description,
    })),
  });
});

module.exports = router;