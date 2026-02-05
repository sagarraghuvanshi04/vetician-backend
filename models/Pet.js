const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  // Personal Details
  petPhoto: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Pet name is required'],
    trim: true,
    minlength: [2, 'Pet name must be at least 2 characters long'],
    maxlength: [50, 'Pet name cannot exceed 50 characters'],
  },
  species: {
    type: String,
    required: [true, 'Species is required'],
    enum: ['Dog', 'Cat', 'Bird', 'Fish', 'Rabbit', 'Hamster', 'Other'],
    default: 'Dog'
  },
  breed: {
    type: String,
    trim: true,
    default: null
  },
  gender: {
    type: String,
    required: true,
    enum: ['Male', 'Female', 'Neutered', 'Spayed', 'Unknown'],
    default: 'Unknown'
  },
  location: {
    type: String,
    trim: true,
    default: null
  },
  dob: {
    type: Date,
    default: null
  },
  bloodGroup: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },
  height: {
    type: Number,
    min: [1, 'Height must be at least 1 cm'],
    default: null
  },
  weight: {
    type: Number,
    min: [0.1, 'Weight must be at least 0.1 kg'],
    default: null
  },
  color: {
    type: String,
    trim: true,
    default: null
  },
  distinctiveFeatures: {
    type: String,
    trim: true,
    default: null
  },

  // Medical Details
  allergies: {
    type: String,
    default: null,
  },
  currentMedications: {
    type: String,
    default: null,
  },
  pastMedications: {
    type: String,
    default: null,
  },
  chronicDiseases: {
    type: String,
    default: null,
  },
  injuries: {
    type: String,
    default: null,
  },
  surgeries: {
    type: String,
    default: null,
  },
  vaccinations: {
    type: String,
    default: null,
  },
  userId: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastVetVisit: {
    type: Date,
    default: null
  },
  nextVetVisit: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for better query performance
petSchema.index({ name: 1 });
petSchema.index({ species: 1 });
petSchema.index({ userId: 1 });
petSchema.index({ isActive: 1 });

// Virtual for age calculation
petSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Method to get simplified pet info
petSchema.methods.getBasicInfo = function() {
  const petObject = this.toObject();
  return {
    id: petObject._id,
    name: petObject.name,
    species: petObject.species,
    breed: petObject.breed,
    age: this.age, // Uses the virtual property
    color: petObject.color,
    userId: petObject.userId
  };
};

// Method to update last vet visit
petSchema.methods.updateLastVetVisit = function(date = new Date()) {
  this.lastVetVisit = date;
  return this.save();
};

// Static method to find pets by user
petSchema.statics.findByUser = function(userId) {
  return this.find({ userId: userId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Pet', petSchema);