const PetResort = require('../models/PetResort');
const { catchAsync } = require('../utils/catchAsync');



const createPetResort = catchAsync(async (req, res, next) => {
  const { 
    userId,
    resortName, 
    brandName, 
    address, 
    resortPhone, 
    ownerPhone, 
    services, 
    openingHours, 
    notice 
  } = req.body;
  console.log(req.body);

  // Check if resort already exists for this user
  const existingResort = await PetResort.findOne({ userId: userId });
  if (existingResort) {
    return next(new AppError('You already have a pet resort registered', 400));
  }

  // Handle logo upload (assuming Cloudinary URL is in req.body.logo)
  if (!req.body.logo) {
    return next(new AppError('Resort logo is required', 400));
  }

  // Create new pet resort
  const petResort = new PetResort({
    userId: userId,
    resortName: resortName.trim(),
    brandName: brandName.trim(),
    logo: req.body.logo,
    address: address.trim(),
    resortPhone: resortPhone.trim(),
    ownerPhone: ownerPhone.trim(),
    services,
    openingHours,
    notice: notice ? notice.trim() : undefined
  });

  await petResort.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(petResort._id);

  res.status(201).json({
    success: true,
    message: 'Pet resort created successfully',
    petResort: {
      id: petResort._id,
      resortName: petResort.resortName,
      brandName: petResort.brandName,
      logo: petResort.logo,
      services: petResort.services,
      isVerified: petResort.isVerified
    },
    token: accessToken,
    refreshToken
  });
});

// Get unverified pet resorts (admin)
const getUnverifiedPetResorts = catchAsync(async (req, res, next) => {
  const petResorts = await PetResort.find({ isVerified: false })
    .lean();

  // Get all unique user IDs from pet resorts
  const userIds = [...new Set(petResorts.map(r => r.userId))];

  // Get all related users in one query
  const users = await User.find({
    _id: { $in: userIds }
  }).lean();

  // Create a map of userId -> user
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user._id.toString(), {
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto
    });
  });

  const formattedPetResorts = petResorts.map(resort => ({
    ...resort, // Preserve all pet resort properties
    user: userMap.get(resort.userId.toString()) || null
  }));

  res.status(200).json({
    success: true,
    count: formattedPetResorts.length,
    petResorts: formattedPetResorts
  });
});

// Get verified pet resorts (admin)
const getVerifiedPetResorts = catchAsync(async (req, res, next) => {
  const filter = { isVerified: true };
  
  // Add optional filters from query params
  if (req.query.city) filter.city = req.query.city;
  if (req.query.services) filter.services = { $in: req.query.services.split(',') };

  const petResorts = await PetResort.find(filter)
    .lean();

  // Get all unique user IDs from pet resorts
  const userIds = [...new Set(petResorts.map(r => r.userId))];

  // Get all related users in one query
  const users = await User.find({
    _id: { $in: userIds }
  }).lean();

  // Create a map of userId -> user
  const userMap = new Map();
  users.forEach(user => {
    userMap.set(user._id.toString(), {
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: user.profilePhoto
    });
  });

  const formattedPetResorts = petResorts.map(resort => ({
    ...resort, // Preserve all pet resort properties
    user: userMap.get(resort.userId.toString()) || null
  }));

  res.status(200).json({
    success: true,
    count: formattedPetResorts.length,
    petResorts: formattedPetResorts
  });
});

// Verify pet resort (admin)
const verifyPetResort = catchAsync(async (req, res, next) => {
  const { resortId } = req.params;

  // Find the pet resort
  const petResort = await PetResort.findById(resortId);
  if (!petResort) {
    return next(new AppError('Pet resort not found', 404));
  }

  // Check if already verified
  if (petResort.isVerified) {
    return next(new AppError('Pet resort is already verified', 400));
  }

  // Mark the pet resort as verified
  petResort.isVerified = true;
  await petResort.save();

  res.status(200).json({
    success: true,
    message: 'Pet resort verified successfully',
    petResort: {
      _id: petResort._id,
      isVerified: petResort.isVerified
    }
  });
});

// Unverify pet resort (admin)
const unverifyPetResort = catchAsync(async (req, res, next) => {
  const { resortId } = req.params;

  // Find the pet resort
  const petResort = await PetResort.findById(resortId);
  if (!petResort) {
    return next(new AppError('Pet resort not found', 404));
  }

  // Check if already unverified
  if (!petResort.isVerified) {
    return next(new AppError('Pet resort is already unverified', 400));
  }

  // Mark the pet resort as unverified
  petResort.isVerified = false;
  await petResort.save();

  res.status(200).json({
    success: true,
    message: 'Pet resort unverified successfully',
    petResort: {
      _id: petResort._id,
      isVerified: petResort.isVerified
    }
  });
});



module.exports = {
  createPetResort,
  getUnverifiedPetResorts,
  getVerifiedPetResorts,
  verifyPetResort,
  unverifyPetResort
};