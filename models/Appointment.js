const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true
  },
  veterinarianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Veterinarian'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  petName: {
    type: String,
    required: true,
    trim: true
  },
  petType: {
    type: String,
    required: true,
    enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other']
  },
  breed: {
    type: String,
    trim: true
  },
  illness: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  bookingType: {
    type: String,
    required: true,
    enum: ['in-clinic', 'video'],
    default: 'in-clinic'
  },
  contactInfo: {
    type: String,
    required: true,
    trim: true
  },
  petPic: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
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

// Indexes for better query performance
appointmentSchema.index({ clinicId: 1 });
appointmentSchema.index({ veterinarianId: 1 });
appointmentSchema.index({ userId: 1 });
appointmentSchema.index({ date: 1 });
appointmentSchema.index({ status: 1 });

// Update the updatedAt field before saving
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);