const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'card_created', 'card_updated', 'card_moved', 'card_deleted',
        'card_assigned', 'card_comment_added', 'card_due_date_set',
        'list_created', 'list_updated', 'list_deleted',
        'board_created', 'board_updated', 'board_member_added',
        'user_joined_board' // etc.—expand as needed
      ],
      trim: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true  // Who performed the action
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Board',  // Assuming you have a Board model
      required: true
    },
    list: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'List',   // Optional, for list-specific actions
      sparse: true   // Allows nulls without errors
    },
    card: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Card',   // Optional, for card-specific actions
      sparse: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,  // Flexible JSON: { oldPosition: 123, newPosition: 456, comment: 'Great idea!' }
      default: {}
    }
  },
  {
    timestamps: true,  // Auto-adds createdAt/updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for fast queries (e.g., board activity feed)
activitySchema.index({ board: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

// Virtual for populated user (optional, for convenience)
activitySchema.virtual('userDetails', {
  ref: 'User',
  localField: 'user',
  foreignField: '_id',
  justOne: true
});

// Pre-save hook: Ensure details is always an object
activitySchema.pre('save', function(next) {
  if (this.details && typeof this.details !== 'object') {
    this.details = {};
  }
  next();
});

module.exports = mongoose.model('Activity', activitySchema);