const mongoose = require('mongoose');
const { Schema } = mongoose;

const ActivitySchema = new Schema(
  {
    boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g., 'card.created', 'card.moved', 'list.renamed'
    payload: { type: Object, default: {} }
  },
  { timestamps: true }
);

ActivitySchema.index({ boardId: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', ActivitySchema);