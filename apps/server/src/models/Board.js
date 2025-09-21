const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const MemberSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'member'], default: 'member' }
  },
  { _id: false }
);

const BoardSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 140 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: { type: [MemberSchema], default: [] },
    archived: { type: Boolean, default: false }
  },
  { timestamps: true }
);

BoardSchema.index({ ownerId: 1, updatedAt: -1 });
BoardSchema.index({ 'members.userId': 1 });

BoardSchema.statics.userIsMember = function (board, userId) {
  const uid = Types.ObjectId.isValid(userId) ? String(userId) : String(userId);
  if (String(board.ownerId) === uid) return true;
  return (board.members || []).some((m) => String(m.userId) === uid);
};

module.exports = mongoose.model('Board', BoardSchema);