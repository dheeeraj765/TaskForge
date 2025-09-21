const express = require('express');
const { z } = require('zod');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Comment = require('../models/Comment');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

const createBoardSchema = z.object({
  title: z.string().min(1).max(140),
});

// GET /api/boards -> my boards
router.get('/', async (req, res) => {
  const userId = req.user.sub;

  const boards = await Board.find({
    $or: [{ ownerId: userId }, { 'members.userId': userId }],
    archived: { $ne: true },
  })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(StatusCodes.OK).json({
    boards: boards.map((b) => ({
      id: String(b._id),
      title: b.title,
      ownerId: String(b.ownerId),
      membersCount: (b.members || []).length + 1,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
  });
});

// POST /api/boards -> create board
router.post('/', async (req, res) => {
  try {
    const { title } = createBoardSchema.parse(req.body);
    const ownerId = req.user.sub;

    const board = await Board.create({
      title,
      ownerId,
      members: [{ userId: ownerId, role: 'owner' }],
    });

    res.status(StatusCodes.CREATED).json({
      board: {
        id: String(board._id),
        title: board.title,
        ownerId: String(board.ownerId),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      },
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: { message: 'Invalid input', details: err.flatten?.() } });
    }
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: { message: 'Failed to create board' } });
  }
});

// GET /api/boards/:boardId -> get single board (auth: member or owner)
router.get('/:boardId', async (req, res) => {
  const { boardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }

  const board = await Board.findById(boardId).lean();
  if (!board) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }
  if (!Board.userIsMember(board, req.user.sub)) {
    return res.status(StatusCodes.FORBIDDEN).json({ error: { message: 'Forbidden' } });
  }

  res.status(StatusCodes.OK).json({
    board: {
      id: String(board._id),
      title: board.title,
      ownerId: String(board.ownerId),
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    },
  });
});

// DELETE /api/boards/:boardId -> only owner; cascade delete lists/cards/comments
router.delete('/:boardId', async (req, res) => {
  const { boardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(boardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }

  const board = await Board.findById(boardId);
  if (!board) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }
  if (String(board.ownerId) !== String(req.user.sub)) {
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: { message: 'Only owner can delete board' } });
  }

  // Cascade delete
  const lists = await List.find({ boardId }).select('_id');
  const listIds = lists.map((l) => l._id);
  const cards = await Card.find({ boardId }).select('_id');
  const cardIds = cards.map((c) => c._id);

  await Comment.deleteMany({ boardId });
  await Card.deleteMany({ boardId });
  await List.deleteMany({ boardId });
  await Board.deleteOne({ _id: boardId });

  res.status(StatusCodes.OK).json({
    success: true,
    deleted: { lists: listIds.length, cards: cardIds.length },
  });
});

module.exports = router;