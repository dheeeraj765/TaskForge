// path: apps/server/src/routes/cards.routes.js
const express = require('express');
const { z } = require('zod');
const { StatusCodes } = require('http-status-codes');
const mongoose = require('mongoose');
const Board = require('../models/Board');
const List = require('../models/List');
const Card = require('../models/Card');
const Comment = require('../models/Comment');
const { authRequired } = require('../middleware/auth');
const { tailPosition, between } = require('../utils/position');
const { emitToBoard } = require('../realtime/socket');

const router = express.Router();
router.use(authRequired);

// Schemas
const createCardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().optional()
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  assigneeId: z.string().nullable().optional()
});

const moveCardSchema = z.object({
  toListId: z.string().optional(),
  prevCardId: z.string().optional(),
  nextCardId: z.string().optional()
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

// List all cards for a board
router.get('/boards/:boardId/cards', async (req, res) => {
  const { boardId } = req.params;
  const chk = await ensureBoardMember(boardId, req.user.sub);
  if (chk.status !== StatusCodes.OK) {
    return res
      .status(chk.status)
      .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
  }

  const cards = await Card.find({ boardId }).sort({ listId: 1, position: 1 }).lean();
  return res.status(StatusCodes.OK).json({
    cards: cards.map((c) => ({
      id: String(c._id),
      listId: String(c.listId),
      title: c.title,
      description: c.description,
      assigneeId: c.assigneeId ? String(c.assigneeId) : null,
      position: c.position
    }))
  });
});

// Create a new card in a list
router.post('/lists/:listId/cards', async (req, res) => {
  try {
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

    const { title, description, assigneeId } = createCardSchema.parse(req.body);

    const last = await Card.find({ listId }).sort({ position: -1 }).limit(1).lean();
    const position = last.length ? tailPosition(last[0].position) : tailPosition(undefined);

    const card = await Card.create({
      boardId: list.boardId,
      listId,
      title,
      description: description || '',
      assigneeId: assigneeId || undefined,
      position
    });

    const payload = {
      id: String(card._id),
      listId: String(card.listId),
      title: card.title,
      description: card.description,
      assigneeId: card.assigneeId ? String(card.assigneeId) : null,
      position: card.position
    };

    emitToBoard(card.boardId, 'card:created', { card: payload });

    return res.status(StatusCodes.CREATED).json({ card: payload });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Invalid input' } });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Failed to create card' } });
  }
});

// Get a card by id
router.get('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });
  }

  const card = await Card.findById(cardId);
  if (!card) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });

  const chk = await ensureBoardMember(card.boardId, req.user.sub);
  if (chk.status !== StatusCodes.OK) {
    return res
      .status(chk.status)
      .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
  }

  return res.status(StatusCodes.OK).json({
    card: {
      id: String(card._id),
      listId: String(card.listId),
      title: card.title,
      description: card.description,
      assigneeId: card.assigneeId ? String(card.assigneeId) : null,
      position: card.position
    }
  });
});

// Update a card (fields)
router.patch('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });
  }
  try {
    const body = updateCardSchema.parse(req.body);
    const card = await Card.findById(cardId);
    if (!card) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });

    const chk = await ensureBoardMember(card.boardId, req.user.sub);
    if (chk.status !== StatusCodes.OK) {
      return res
        .status(chk.status)
        .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
    }

    if (body.title != null) card.title = body.title;
    if (body.description != null) card.description = body.description;
    if (body.assigneeId !== undefined) card.assigneeId = body.assigneeId || undefined;

    await card.save();

    const payload = {
      id: String(card._id),
      listId: String(card.listId),
      title: card.title,
      description: card.description,
      assigneeId: card.assigneeId ? String(card.assigneeId) : null,
      position: card.position
    };

    emitToBoard(card.boardId, 'card:updated', { card: payload });

    return res.status(StatusCodes.OK).json({ card: payload });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Invalid input' } });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Failed to update card' } });
  }
});

// Move a card (within/between lists)
router.patch('/cards/:cardId/move', async (req, res) => {
  const { cardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });
  }
  try {
    const { toListId, prevCardId, nextCardId } = moveCardSchema.parse(req.body);

    const card = await Card.findById(cardId);
    if (!card) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });

    const chk = await ensureBoardMember(card.boardId, req.user.sub);
    if (chk.status !== StatusCodes.OK) {
      return res
        .status(chk.status)
        .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
    }

    let targetListId = toListId ? toListId : String(card.listId);
    if (toListId) {
      if (!mongoose.Types.ObjectId.isValid(toListId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Invalid toListId' } });
      }
      const exists = await List.findById(toListId).lean();
      if (!exists) return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Target list not found' } });
      if (String(exists.boardId) !== String(card.boardId)) {
        return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Cannot move across boards' } });
      }
    }

    // Compute position from neighbors in target list
    let prevPos = null;
    let nextPos = null;

    if (prevCardId) {
      const prev = await Card.findById(prevCardId).lean();
      if (prev && String(prev.listId) === String(targetListId)) prevPos = prev.position;
    }
    if (nextCardId) {
      const next = await Card.findById(nextCardId).lean();
      if (next && String(next.listId) === String(targetListId)) nextPos = next.position;
    }

    let newPosition;
    if (prevPos == null && nextPos == null) {
      const last = await Card.find({ listId: targetListId }).sort({ position: -1 }).limit(1).lean();
      newPosition = last.length ? last[0].position + 1000 : 1000;
    } else {
      newPosition = between(prevPos, nextPos);
    }

    card.listId = targetListId;
    card.position = newPosition;
    await card.save();

    const payload = {
      id: String(card._id),
      listId: String(card.listId),
      title: card.title,
      description: card.description,
      assigneeId: card.assigneeId ? String(card.assigneeId) : null,
      position: card.position
    };

    emitToBoard(card.boardId, 'card:moved', { card: payload });

    return res.status(StatusCodes.OK).json({ card: payload });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(StatusCodes.BAD_REQUEST).json({ error: { message: 'Invalid input' } });
    }
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: { message: 'Failed to move card' } });
  }
});

// Delete a card
router.delete('/cards/:cardId', async (req, res) => {
  const { cardId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(cardId)) {
    return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });
  }

  const card = await Card.findById(cardId);
  if (!card) return res.status(StatusCodes.NOT_FOUND).json({ error: { message: 'Card not found' } });

  const chk = await ensureBoardMember(card.boardId, req.user.sub);
  if (chk.status !== StatusCodes.OK) {
    return res
      .status(chk.status)
      .json({ error: { message: chk.status === StatusCodes.NOT_FOUND ? 'Board not found' : 'Forbidden' } });
  }

  await Comment.deleteMany({ cardId });
  await Card.deleteOne({ _id: cardId });

  emitToBoard(card.boardId, 'card:deleted', { cardId: String(cardId), listId: String(card.listId) });

  return res.status(StatusCodes.OK).json({ success: true });
});

module.exports = router;