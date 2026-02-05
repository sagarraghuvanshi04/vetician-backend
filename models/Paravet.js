const mongoose = require('mongoose');

const paravetSchema = new mongoose.Schema({
  // Step 3: Personal & Contact Info
  personalInfo: {
    fullName: {
      value: String,
      verified: { type: Boolean, default: false }
    },
    mobileNumber: {
      value: String,
      verified: { type: Boolean, default: false },
      otpVerified: { type: Boolean, default: false }
    },
    email: {
      value: String,
      verified: { type: Boolean, default: false }
    },
    city: {
      value: String,
      verified: { type: Boolean, default: false }
    },
    serviceArea: {
      value: String, // radius in km
      verified: { type: Boolean, default: false }
    },
    emergencyContact: {
      name: String,
      number: String,
      verified: { type: Boolean, default: false }
    }
  },

  // Step 4: Professional Verification
  documents: {
    governmentId: {
      type: {
        type: String, // Aadhaar, PAN, etc.
        url: String,
        verified: { type: Boolean, default: false }
      }
    },
    certificationProof: {
      type: {
        url: String,
        certificationType: String, // e.g., "Paravet Diploma", "Animal Healthcare Certificate"
        verified: { type: Boolean, default: false }
      }
    },
    vetRecommendation: {
      url: String,
      vetName: String,
      verified: { type: Boolean, default: false }
    },
    profilePhoto: {
      url: String,
      verified: { type: Boolean, default: false }
    }
  },

  // Step 5: Experience & Skills
  experience: {
    yearsOfExperience: {
      value: Number,
      verified: { type: Boolean, default: false }
    },
    areasOfExpertise: {
      value: [String], // wound care, injections, vaccinations, etc.
      verified: { type: Boolean, default: false }
    },
    languagesSpoken: {
      value: [String],
      verified: { type: Boolean, default: false }
    },
    availability: {
      days: [String], // Mon, Tue, Wed, etc.
      startTime: String, // HH:MM
      endTime: String, // HH:MM
      verified: { type: Boolean, default: false }
    }
  },

  // Step 6: Bank Details
  paymentInfo: {
    paymentMethod: {
      type: {
        type: String, // 'upi' or 'bank_account'
        value: String, // UPI ID or bank account number
        verified: { type: Boolean, default: false }
      }
    },
    accountHolderName: {
      value: String,
      verified: { type: Boolean, default: false }
    },
    pan: {
      value: String,
      verified: { type: Boolean, default: false }
    }
  },

  // Step 7: Code of Conduct
  compliance: {
    agreedToCodeOfConduct: {
      value: Boolean,
      agreedAt: Date,
      verified: { type: Boolean, default: false }
    }
  },

  // Step 8: Training Module
  training: {
    moduleCompleted: {
      type: Boolean,
      default: false
    },
    quizPassed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    badgeEarned: String // "Vetician Verified Paravet"
  },

  // Overall Application Status
  applicationStatus: {
    currentStep: {
      type: Number,
      default: 1 // 1-9
    },
    completionPercentage: {
      type: Number,
      default: 0
    },
    submitted: {
      type: Boolean,
      default: false
    },
    submittedAt: Date,
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'under_review'],
      default: 'pending'
    },
    approvedAt: Date,
    rejectionReason: String,
    approvedByAdmin: String // Admin user ID
  },

  // User reference
  userId: {
    type: String,
    required: true,
    unique: true
  },

  // Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
paravetSchema.index({ userId: 1 });
paravetSchema.index({ 'personalInfo.email.value': 1 });
paravetSchema.index({ 'applicationStatus.approvalStatus': 1 });

// Calculate completion percentage
paravetSchema.methods.calculateCompletion = function() {
  const steps = [
    !!this.personalInfo.fullName?.value,
    !!this.personalInfo.mobileNumber?.value && this.personalInfo.mobileNumber.otpVerified,
    !!this.documents.governmentId?.type,
    !!this.experience.yearsOfExperience?.value,
    !!this.paymentInfo.accountHolderName?.value,
    !!this.compliance.agreedToCodeOfConduct?.value,
    this.training.moduleCompleted,
    this.applicationStatus.submitted
  ];
  
  this.applicationStatus.completionPercentage = Math.round((steps.filter(Boolean).length / steps.length) * 100);
  return this.applicationStatus.completionPercentage;
};

// Check if all required fields are verified
paravetSchema.methods.isFullyVerified = function() {
  return (
    this.personalInfo.fullName?.verified &&
    this.personalInfo.mobileNumber?.verified &&
    this.documents.governmentId?.type?.verified &&
    this.documents.certificationProof?.type?.verified &&
    this.experience.yearsOfExperience?.verified &&
    this.paymentInfo.accountHolderName?.verified &&
    this.compliance.agreedToCodeOfConduct?.verified
  );
};

module.exports = mongoose.model('Paravet', paravetSchema);
