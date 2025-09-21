// path: apps/server/src/routes/lists.routes.js
const express = require('express');
const { z } = require('zod');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Comment = require('../models/Comment');
const { authRequired } = require('../middleware/auth');
const { tailPosition } = require('../utils/position');
const { emitToBoard } = require('../realtime/socket');

const router = express.Router();
router.use(authRequired);

// Schemas
const titleSchema = z.object({ title: z.string().min(1).max(140) });
const updateListSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    position: z.number().finite().optional()
  })
  .refine((data) => data.title != null || data.position != null, {
    message: 'At least one field (title or position) must be provided'
  });

// Helpers
async function ensureBoardMember(boardId, userId) {
  const b = await Board.findById(boardId).lean();
  if (!b) return { status: StatusCodes.NOT_FOUND };
  const isMember =
    String(b.ownerId) === String(userId) ||
    (b.members || []).some((m) => String(m.userId) === String(userId));
  if (!isMember) return { status: StatusCodes.FORBIDDEN };
  return { status: StatusCodes.OK, board: b };
}

// GET lists for a board
router.get('/boards/:boardId/lists', async (req, res) => {
  const { boardId } = req.params;
  const chk = await ensureBoardMember(boardId, req.user.sub);
  if (chk.status !== StatusCodes.OK) {
    return res
      .status(chk.status)
      .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
  }

  const lists = await List.find({ boardId }).sort({ position: 1 }).lean();
  return res.status(StatusCodes.OK).json({
    lists: lists.map((l) => ({ id: String(l._id), title: l.title, position: l.position }))
  });
});

// CREATE list
router.post('/boards/:boardId/lists', async (req, res) => {
  try {
    const { boardId } = req.params;
    const chk = await ensureBoardMember(boardId, req.user.sub);
    if (chk.status !== StatusCodes.OK) {
      return res
        .status(chk.status)
        .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
    }

    const { title } = titleSchema.parse(req.body);

    const last = await List.find({ boardId }).sort({ position: -1 }).limit(1).lean();
    const position = last.length ? tailPosition(last[0].position) : tailPosition(undefined);

    const list = await List.create({ boardId, title, position });
    const payload = { id: String(list._id), title: list.title, position: list.position };

    // Realtime
    emitToBoard(boardId, 'list:created', { list: payload });

    return res.status(StatusCodes.CREATED).json({ list: payload });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: { message: 'Invalid input', details: err.flatten && err.flatten() } });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Failed to create list' } });
  }
});

// UPDATE list (rename/reorder)
router.patch('/lists/:listId', async (req, res) => {
  const { listId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(listId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'List not found' } });
  }
  try {
    const body = updateListSchema.parse(req.body);
    const list = await List.findById(listId);
    if (!list) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'List not found' } });

    const chk = await ensureBoardMember(list.boardId, req.user.sub);
    if (chk.status !== StatusCodes.OK) {
      return res
        .status(chk.status)
        .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
    }

    if (body.title != null) list.title = body.title;
    if (body.position != null) list.position = body.position;
    await list.save();

    const payload = { id: String(list._id), title: list.title, position: list.position };

    // Realtime
    emitToBoard(list.boardId, 'list:updated', { list: payload });

    return res.status(StatusCodes.OK).json({ list: payload });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: { message: 'Invalid input', details: err.flatten && err.flatten() } });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Failed to update list' } });
  }
});

// DELETE list (cascade its cards + comments)
router.delete('/lists/:listId', async (req, res) => {
  const { listId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(listId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'List not found' } });
  }

  const list = await List.findById(listId);
  if (!list) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'List not found' } });

  const chk = await ensureBoardMember(list.boardId, req.user.sub);
  if (chk.status !== StatusCodes.OK) {
    return res
      .status(chk.status)
      .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
  }

  const cards = await Card.find({ listId }).select('_id');
  const cardIds = cards.map((c) => c._id);
  await Comment.deleteMany({ cardId: { $in: cardIds } });
  await Card.deleteMany({ listId });
  await List.deleteOne({ _id: listId });

  // Realtime
  emitToBoard(list.boardId, 'list:deleted', { listId: String(listId) });

  return res.status(StatusCodes.OK).json({ success: true, deleted: { cards: cardIds.length } });
});

module.exports = router;