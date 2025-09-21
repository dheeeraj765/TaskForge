// path: apps/server/src/models/User.js
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

// Remove this to avoid duplicate index warnings:
// UserSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('User', UserSchema);