

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['veterinarian', 'pet_parent', 'paravet', 'pet_resort'],
    default: 'pet_parent'
  },
  phone: {
    type: String,
    trim: true,
    default: null,
  },
  location: {
    type: String,
    trim: true,
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800, // 7 days
    },
  }],
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ email: 1, role: 1 }, { unique: true });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshTokens;
  return userObject;
};

// Static method to find user by email and role
userSchema.statics.findByEmailAndRole = function(email, role) {
  return this.findOne({ 
    email: email.toLowerCase(),
    role 
  });
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Clean up expired refresh tokens
userSchema.methods.cleanupRefreshTokens = function() {
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.createdAt.getTime() + (7 * 24 * 60 * 60 * 1000) > Date.now()
  );
  return this.save();
};

module.exports = mongoose.model('User', userSchema);