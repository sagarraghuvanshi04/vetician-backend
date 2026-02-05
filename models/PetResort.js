const mongoose = require('mongoose');

const OpeningHoursSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  open: {
    type: String,
    required: function() { return !this.closed; }
  },
  close: {
    type: String,
    required: function() { return !this.closed; }
  },
  closed: {
    type: Boolean,
    default: false
  }
});

const PetResortSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  resortName: {
    type: String,
    required: true,
    trim: true
  },
  brandName: {
    type: String,
    required: true,
    trim: true
  },
  logo: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  resortPhone: {
    type: String,
    required: true,
    trim: true
  },
  ownerPhone: {
    type: String,
    required: true,
    trim: true
  },
  services: {
    type: [String],
    required: true,
    enum: [
      'cafe',
      'grooming',
      'swimming',
      'boarding_indoor',
      'boarding_outdoor',
      'playground',
      'veterinary'
    ],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'At least one service must be selected'
    }
  },
  openingHours: {
    type: [OpeningHoursSchema],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 7;
      },
      message: 'Opening hours must be provided for all 7 days'
    }
  },
  notice: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
PetResortSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries by userId
PetResortSchema.index({ userId: 1 });

module.exports = mongoose.model('PetResort', PetResortSchema);