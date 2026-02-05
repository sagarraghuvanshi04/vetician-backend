const mongoose = require('mongoose');

const clinicSchema = new mongoose.Schema({
  establishmentType: {
    type: String,
    required: true,
    enum: [
      'Owner of establishment',
      'Consultant doctor',
      'Rented at other establishment',
      'Practicing at home'
    ]
  },
  clinicName: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  locality: {
    type: String,
    required: true,
    trim: true
  },
  streetAddress: {
    type: String,
    trim: true
  },
  clinicNumber: {
    type: String,
    trim: true
  },
  fees: {
    type: String,
    trim: true
  },
  sameTimingsForWeekdays: {
    type: Boolean,
    default: true
  },
  timings: {
    mon: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    tue: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    wed: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    thu: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    fri: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    sat: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    },
    sun: {
      start: String,
      end: String,
      type: {
        type: String,
        enum: ['Video', 'In-Clinic', 'Both']
      }
    }
  },
  ownerProof: {
    type: String,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verified: {
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

// Indexes
clinicSchema.index({ clinicName: 1, city: 1 });
clinicSchema.index({ userId: 1 });
clinicSchema.index({ status: 1 });

// Update the updatedAt field before saving
clinicSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Clinic', clinicSchema);