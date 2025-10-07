// path: apps/server/src/models/Board.js
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
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        // Normalize id and remove mongoose internals
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

// Optional explicit virtual (handy if you ever use toObject)
BoardSchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString?.() || String(this._id) : undefined;
});

BoardSchema.index({ ownerId: 1, updatedAt: -1 });
BoardSchema.index({ 'members.userId': 1 });

// Membership helper (owner counts as member)
BoardSchema.statics.userIsMember = function (board, userId) {
  if (!board || !userId) return false;
  const uid = String(userId);
  if (String(board.ownerId) === uid) return true;
  return Array.isArray(board.members) && board.members.some((m) => String(m.userId) === uid);
};

// Optional: ensure owner is in members as role 'owner' (uncomment if desired)
/*
BoardSchema.pre('save', function (next) {
  const uid = String(this.ownerId || '');
  if (uid && Array.isArray(this.members)) {
    const exists = this.members.some((m) => String(m.userId) === uid);
    if (!exists) this.members.push({ userId: this.ownerId, role: 'owner' });
  }
  next();
});
*/

module.exports = mongoose.model('Board', BoardSchema);