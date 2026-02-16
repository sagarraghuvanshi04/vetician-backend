const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const veterinarianSchema = new mongoose.Schema({
  title: {
    value: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      enum: ['Dr.', 'Mr.', 'Mrs.', 'Ms.', 'Prof.']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  name: {
    value: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  gender: {
    value: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  city: {
    value: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  experience: {
    value: {
      type: Number,
      required: [true, 'Experience is required'],
      min: [0, 'Experience cannot be negative']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  specialization: {
    value: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      enum: ['Veterinarian', 'Surgeon', 'Dermatologist', 'Other']
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  profilePhotoUrl: {
    value: {
      type: String,
      required: [true, 'Profile photo URL is required'],
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  qualification: {
    value: {
      type: String,
      required: [true, 'Qualification is required'],
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  qualificationUrl: {
    value: {
      type: String,
      required: [true, 'Qualification documents URL is required'],
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  registration: {
    value: {
      type: String,
      required: [true, 'Registration number is required'],
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  registrationUrl: {
    value: {
      type: String,
      required: [true, 'Registration proof URL is required'],
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  identityProof: {
    value: {
      type: String,
      required: [true, 'Identity proof is required'],
      trim: true
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  identityProofUrl: {
    value: {
      type: String,
      required: [true, 'Identity proof URL is required'],
      validate: {
        validator: function(v) {
          return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
        },
        message: props => `${props.value} is not a valid URL!`
      }
    },
    verified: {
      type: Boolean,
      default: false
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 604800 // 7 days
    }
  }]
}, {
  timestamps: true
});

// Indexes
veterinarianSchema.index({ 'name.value': 1, 'city.value': 1 });
veterinarianSchema.index({ 'registration.value': 1 }, { unique: true });
veterinarianSchema.index({ createdAt: -1 });

// Instance methods
veterinarianSchema.methods.getPublicProfile = function() {
  const vet = this.toObject();
  const publicProfile = {};
  
  Object.keys(vet).forEach(key => {
    if (key === 'refreshTokens') return;
    publicProfile[key] = vet[key]?.value || vet[key];
  });
  
  delete publicProfile.refreshTokens;
  return publicProfile;
};

veterinarianSchema.methods.checkAllVerified = function() {
  const fields = [
    'title', 'name', 'gender', 'city', 'experience',
    'specialization', 'profilePhotoUrl', 'qualification',
    'qualificationUrl', 'registration', 'registrationUrl',
    'identityProof', 'identityProofUrl'
  ];
  
  return fields.every(field => this[field]?.verified === true);
};

veterinarianSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

veterinarianSchema.methods.cleanupRefreshTokens = function() {
  this.refreshTokens = this.refreshTokens.filter(
    tokenObj => tokenObj.createdAt.getTime() + (7 * 24 * 60 * 60 * 1000) > Date.now()
  );
  return this.save();
};

veterinarianSchema.pre('save', function(next) {
  if (this.checkAllVerified()) {
    this.isVerified = true;
  } else {
    this.isVerified = false;
  }
  next();
});

module.exports = mongoose.model('Veterinarian', veterinarianSchema);