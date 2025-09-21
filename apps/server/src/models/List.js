const mongoose = require('mongoose');
const { Schema } = mongoose;

const ListSchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 140 },
    position: { type: Number, required: true, index: true }
  },
  { timestamps: true }
);

ListSchema.index({ boardId: 1, position: 1 });

module.exports = mongoose.model('List', ListSchema);