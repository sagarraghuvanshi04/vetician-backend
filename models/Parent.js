



const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const parentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Parent name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{10,15}$/.test(v);
      },
      message: props => `${props.value} is not a valid phone number!`
    }
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
    minlength: [10, 'Please enter a complete address'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other',
    required: [true, 'Gender is required'],
  },
  image: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow null/empty
        return /^(https?:\/\/).+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: props => `${props.value} is not a valid image URL!`
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  pets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pet'
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  lastContacted: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    trim: true,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
parentSchema.index({ email: 1 });
parentSchema.index({ phone: 1 });
parentSchema.index({ user: 1 });
parentSchema.index({ createdAt: -1 });

// Instance method to get public profile
parentSchema.methods.getPublicProfile = function() {
  const parentObject = this.toObject();
  delete parentObject.__v;
  return parentObject;
};

// Static method to find parent by email
parentSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find parent by phone
parentSchema.statics.findByPhone = function(phone) {
  return this.findOne({ phone });
};

// Static method to find parent by user ID
parentSchema.statics.findByUserId = function(userId) {
  return this.findOne({ user: userId });
};

// Update last contacted date
parentSchema.methods.updateLastContacted = function() {
  this.lastContacted = new Date();
  return this.save();
};

module.exports = mongoose.model('Parent', parentSchema);