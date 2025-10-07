// path: apps/server/src/routes/boards.routes.js
const express = require('express');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Board = require('../models/Board');

const router = express.Router();

// Helpers
function userIsMember(board, userId) {
  if (!board || !userId) return false;
  const uid = String(userId);
  if (String(board.ownerId) === uid) return true;
  if (Array.isArray(board.members)) {
    return board.members.some(m => String(m.userId) === uid);
  }
  return false;
}

async function loadBoard(req, res, next) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Invalid board id' } });
  }
  const board = await Board.findById(id);
  if (!board) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Board not found' } });
  }
  req.board = board;
  return next();
}

function ensureMember(req, res, next) {
  if (!userIsMember(req.board, req.user?.sub)) {
    return res.status(StatusCodes.FORBIDDEN).json({ error: { message: 'Not a member' } });
  }
  return next();
}

// GET /api/boards → list my boards (owner or member)
router.get('/', async (req, res) => {
  try {
    const uid = req.user.sub;
    const boards = await Board.find({
      $or: [{ ownerId: uid }, { 'members.userId': uid }]
    })
      .sort({ updatedAt: -1 })
      .lean({ getters: true, virtuals: true }); // lightweight

    return res.json(boards || []);
  } catch (err) {
    console.error('GET /boards failed:', err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: { message: 'Failed to fetch boards' } });
  }
});

// POST /api/boards → create board
router.post('/', async (req, res) => {
  try {
    const ownerId = req.user.sub;
    const title = String(req.body?.title || req.body?.name || '').trim();
    if (!title) {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Title is required' } });
    }

    const data = {
      title,
      ownerId,
      // Keep any optional fields you support:
      description: req.body?.description || '',
      members: Array.isArray(req.body?.members) ? req.body.members : []
    };

    const board = await Board.create(data);

    res
      .status(StatusCodes.CREATED)
      .set('Location', `/api/boards/${board._id}`)
      .json(board);
  } catch (err) {
    console.error('POST /boards failed:', err);
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: { message: err.message || 'Failed to create board' } });
  }
});

// GET /api/boards/:id
router.get('/:id', loadBoard, ensureMember, async (req, res) => {
  try {
    await req.board.populate('ownerId', 'username');
    return res.json(req.board);
  } catch (err) {
    console.error('GET /boards/:id failed:', err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: { message: 'Failed to load board' } });
  }
});

// PUT /api/boards/:id
router.put('/:id', loadBoard, ensureMember, async (req, res) => {
  try {
    const update = {};
    if (typeof req.body?.title === 'string') update.title = req.body.title.trim();
    if (!update.title && typeof req.body?.name === 'string') update.title = req.body.name.trim();
    if (typeof req.body?.description === 'string') update.description = req.body.description;

    const updated = await Board.findByIdAndUpdate(req.board._id, update, { new: true });
    return res.json(updated);
  } catch (err) {
    console.error('PUT /boards/:id failed:', err);
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: { message: err.message || 'Failed to update board' } });
  }
});

// DELETE /api/boards/:id
router.delete('/:id', loadBoard, ensureMember, async (req, res) => {
  try {
    if (String(req.board.ownerId) !== req.user.sub) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: { message: 'Only owner can delete' } });
    }
    await Board.findByIdAndDelete(req.board._id);
    return res.status(StatusCodes.NO_CONTENT).send();
  } catch (err) {
    console.error('DELETE /boards/:id failed:', err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: { message: 'Failed to delete board' } });
  }
});

module.exports = router;