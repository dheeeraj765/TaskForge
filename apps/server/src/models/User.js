const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// ✅ Uncommented: Enforces unique emails at DB level (catches race conditions)
UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);