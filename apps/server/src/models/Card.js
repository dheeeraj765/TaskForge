const mongoose = require('mongoose');
const { Schema } = mongoose;

const CardSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    listId: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
    description: { type: String, default: '' },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    position: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

CardSchema.index({ listId: 1, position: 1 });
CardSchema.index({ boardId: 1, title: 1 });

module.exports = mongoose.model('Card', CardSchema);