const Clinic = require('../models/Clinic');
const Veterinarian = require('../models/Veterinarian');
const Appointment = require('../models/Appointment');
const { catchAsync } = require('../utils/catchAsync');



const registerVeterinarian = catchAsync(async (req, res, next) => {
  const flatData = req.body;
  console.log(req.body)

  // Check if userId exists in the request
  if (!flatData.userId) {
    return res.status(400).json({  // Changed to return JSON response
      success: false,
      message: 'User ID is required'
    });
  }

  // Check existing veterinarian by userId
  const existingVeterinarianByUserId = await Veterinarian.findOne({
    userId: flatData.userId
  });

  if (existingVeterinarianByUserId) {
    return res.status(400).json({  // Changed to return JSON response
      success: false,
      message: 'You have already applied for verification'
    });
  }

  // Check existing veterinarian by registration number
  const existingVeterinarianByReg = await Veterinarian.findOne({
    'registration.value': flatData.registration
  });

  if (existingVeterinarianByReg) {
    return res.status(400).json({  // Changed to return JSON response
      success: false,
      message: 'A veterinarian with this registration number already exists.' // Note: Added period to match frontend check
    });
  }

  // Transform flat data to nested structure
  const veterinarianData = {};
  for (const [key, value] of Object.entries(flatData)) {
    if (key === 'userId') continue;

    veterinarianData[key] = {
      value: key === 'experience' ? Number(value) : value,
      verified: false
    };
  }

  // Create new veterinarian
  const veterinarian = new Veterinarian({
    ...veterinarianData,
    userId: flatData.userId,
    isVerified: false,
    isActive: true
  });

  await veterinarian.save();

  // Generate tokens
  const { accessToken, refreshToken } = generateTokens(veterinarian._id);

  // Add refresh token
  veterinarian.refreshTokens.push({ token: refreshToken });
  await veterinarian.save();

  res.status(201).json({
    success: true,
    message: 'Veterinarian profile submitted successfully! Your account will be activated after verification.',
    veterinarian: veterinarian.getPublicProfile(),
    token: accessToken,
    refreshToken
  });
});

// check veterinarian verification
const checkVeterinarianVerification = catchAsync(async (req, res, next) => {
  const { userId } = req.body;

  // Check if userId exists in the request
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
      alertType: 'error'
    });
  }

  // Find veterinarian by userId
  const veterinarian = await Veterinarian.findOne({ userId });

  if (!veterinarian) {
    return res.status(404).json({
      success: false,
      message: 'Veterinarian profile not found. Please register first.',
      alertType: 'error'
    });
  }

  if (!veterinarian.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Your veterinarian account is not yet verified. Please wait for verification.',
      alertType: 'warning',
      isVerified: false
    });
  }

  // If verified
  res.status(200).json({
    success: true,
    message: 'Account verified! You can now add your clinic.',
    alertType: 'success',
    isVerified: true,
    veterinarianId: veterinarian._id
  });
});

// get unverified veterinarians (admin)
const getUnverifiedVeterinarians = catchAsync(async (req, res, next) => {
  const veterinarians = await Veterinarian.find({ isVerified: false })
    .select('-refreshTokens') // Exclude refresh tokens
    .lean(); // Convert to plain JS object

  res.status(200).json({
    success: true,
    count: veterinarians.length,
    veterinarians: veterinarians
  });
});

// get verified veterinarians (admin)
const getVerifiedVeterinarians = catchAsync(async (req, res, next) => {
  // Add optional filters (city, specialization, etc.)
  const filter = { isVerified: true };
  if (req.query.city) filter['city.value'] = req.query.city;
  if (req.query.specialization) filter['specialization.value'] = req.query.specialization;

  const veterinarians = await Veterinarian.find(filter)
    .select('-refreshTokens')
    .lean();

  // const formattedVets = veterinarians.map(vet => {
  //   const formatted = {};
  //   Object.keys(vet).forEach(key => {
  //     formatted[key] = vet[key]?.value || vet[key];
  //   });
  //   return formatted;
  // });

  res.status(200).json({
    success: true,
    count: veterinarians.length,
    veterinarians: veterinarians
  });
});

// verify veterinarians detail (admin)
const verifyVeterinarianField = catchAsync(async (req, res, next) => {
  const { veterinarianId, fieldName } = req.params;
  console.log(req.params)

  // Find the veterinarian
  const veterinarian = await Veterinarian.findById(veterinarianId);
  if (!veterinarian) {
    return next(new AppError('Veterinarian not found', 404));
  }

  // Check if the field exists and is not already verified
  if (veterinarian[fieldName] && typeof veterinarian[fieldName] === 'object') {
    if (veterinarian[fieldName].verified) {
      return next(new AppError('Field is already verified', 400));
    }

    // Mark the field as verified
    veterinarian[fieldName].verified = true;
  } else {
    return next(new AppError('Invalid field specified', 400));
  }

  // Check if all required fields are now verified
  const requiredFields = [
    'name', 'gender', 'city',
    'experience', 'specialization',
    'qualification', 'registration',
    'identityProof'
  ];

  const allVerified = requiredFields.every(field => {
    return veterinarian[field]?.verified === true;
  });

  // If all fields are verified, mark the veterinarian as verified
  if (allVerified) {
    veterinarian.isVerified = true;
  }

  await veterinarian.save();

  res.status(200).json({
    success: true,
    message: `${fieldName} verified successfully`,
    veterinarian: {
      _id: veterinarian._id,
      [fieldName]: veterinarian[fieldName],
      isVerified: veterinarian.isVerified
    }
  });
});

// register clinic
const registerClinic = catchAsync(async (req, res, next) => {
  const clinicData = req.body;
  console.log(clinicData)

  // Validate required fields - return consistent error format
  if (!clinicData.userId || !clinicData.clinicName || !clinicData.city || !clinicData.streetAddress) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Missing required fields',
        code: 400
      }
    });
  }

  // Check existing clinics
  const existingClinic = await Clinic.findOne({
    $or: [
      { userId: clinicData.userId },
      {
        clinicName: clinicData.clinicName,
        city: clinicData.city
      }
    ]
  });

  if (existingClinic) {
    const message = existingClinic.userId === clinicData.userId
      ? 'You have already registered a clinic'
      : 'A clinic with this name already exists in this city';

    return res.status(400).json({
      success: false,
      error: {
        message,
        code: 400
      }
    });
  }

  // Create and save clinic
  const clinic = await Clinic.create({
    ...clinicData,
    verified: false,
    isActive: false
  });

  res.status(201).json({
    success: true,
    data: {
      clinicId: clinic._id,
      status: clinic.status
    }
  });
});

// get unverified clinics (admin)
const getUnverifiedClinics = catchAsync(async (req, res, next) => {
  const clinics = await Clinic.find({ verified: false })
    .lean();

  // Get all unique user IDs from clinics
  const userIds = [...new Set(clinics.map(c => c.userId))];

  // Get all related veterinarians in one query
  const veterinarians = await Veterinarian.find({
    userId: { $in: userIds }
  }).lean();

  // Create a map of userId -> veterinarian
  const vetMap = new Map();
  veterinarians.forEach(vet => {
    vetMap.set(vet.userId, {
      name: vet.name.value,
      title: vet.title.value,
      specialization: vet.specialization.value,
      isVerified: vet.isVerified,
      profilePhotoUrl: vet.profilePhotoUrl.value // Added profile photo
    });
  });
  // console.log(vetMap)

  const formattedClinics = clinics.map(clinic => ({
    ...clinic, // Preserve all clinic properties
    veterinarian: {
      ...(vetMap.get(clinic.userId.toString()) || {}), // Keep existing vet info
    }
  }));
  // console.log(formattedClinics)

  res.status(200).json({
    success: true,
    count: formattedClinics.length,
    clinics: formattedClinics
  });
});

// get verified clinics (admin)
const getVerifiedClinics = catchAsync(async (req, res, next) => {   
  const filter = { verified: true };
  if (req.query.city) filter.city = req.query.city;
  if (req.query.establishmentType) filter.establishmentType = req.query.establishmentType;
  if (req.query.locality) filter.locality = req.query.locality;

  const clinics = await Clinic.find(filter)
    .lean();

  // Get all unique user IDs from clinics
  const userIds = [...new Set(clinics.map(c => c.userId))];

  // Get all related veterinarians in one query
  const veterinarians = await Veterinarian.find({
    userId: { $in: userIds }
  }).lean();

  // Create a map of userId -> veterinarian
  const vetMap = new Map();
  veterinarians.forEach(vet => {
    vetMap.set(vet.userId, {
      name: vet.name.value,
      title: vet.title.value,
      specialization: vet.specialization.value,
      experience: vet.experience.value,
      profilePhotoUrl: vet.profilePhotoUrl.value, // Changed from profilePhoto to profilePhotoUrl
      isVerified: vet.isVerified
    });
  });

  const formattedClinics = clinics.map(clinic => ({
    ...clinic, // Preserve all clinic properties
    veterinarian: vetMap.get(clinic.userId.toString()) || null
  }));

  res.status(200).json({
    success: true,
    count: formattedClinics.length,
    clinics: formattedClinics
  });
});

// Verify Clinic (admin)
const verifyClinic = catchAsync(async (req, res, next) => {
  const { clinicId } = req.params;
  console.log(clinicId)

  // Find the clinic
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    console.log('Clinic not found');
    return next(new AppError('Clinic not found', 404));
  }

  // Check if already verified
  if (clinic.verified) {
    console.log('Clinic is already verified');
    return next(new AppError('Clinic is already verified', 400));
  }

  // Mark the clinic as verified
  clinic.verified = true;
  await clinic.save();

  res.status(200).json({
    success: true,
    message: 'Clinic verified successfully',
    clinic: {
      _id: clinic._id,
      isVerified: clinic.verified
    }
  });
});

// get profile screen data
const getProfileDetails = catchAsync(async (req, res, next) => {
  const { userId } = req.body;
  console.log(req.body)

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  // Find veterinarian and clinic data in parallel
  const [veterinarian, clinics] = await Promise.all([
    Veterinarian.findOne({userId}),
    Clinic.find({userId})
  ]);

  // console.log(veterinarian, clinics)

  if (!veterinarian) {
    return next(new AppError('No veterinarian found with that user ID', 404));
  }

  // Format the response similar to your example image
  const profileData = {
    status: 'Your profile is under review',
    message: 'Please give us 7 business days from the date of submission to review your profile',
    profile: {
      name: `${veterinarian.title.value} ${veterinarian.name.value}`,
      specialization: veterinarian.specialization.value,
      qualification: veterinarian.qualification.value,
      experience: `${veterinarian.experience.value} years of experience`,
      registration: veterinarian.registration.value,
      additionalCertification: 'Arizona State Board of Dental Examiners-2003', // This would come from your data
      profilePhotoUrl: veterinarian.profilePhotoUrl.value,
      isVerified: veterinarian.isVerified
    },
    clinics: clinics.map(clinic => ({
      clinicName: clinic.clinicName,
      address: clinic.streetAddress || `${clinic.locality}, ${clinic.city}`,
      verified: clinic.verified
    }))
  };

  res.status(200).json({
    success: true,
    data: profileData
  });
});



// veterinarian's clinic for pet parent
const getAllClinicsWithVets = catchAsync(async (req, res, next) => {
  // 1. Fetch all verified clinics
  const clinics = await Clinic.find({ verified: true }).lean();
  
  if (!clinics || clinics.length === 0) {
    return next(new AppError('No verified clinics found', 404));
  }

  // 2. Get all unique user IDs from clinics
  const userIds = [...new Set(clinics.map(clinic => clinic.userId))];

  // 3. Fetch all veterinarians associated with these clinics
  const veterinarians = await Veterinarian.find({ 
    userId: { $in: userIds } 
  }).lean();
  
  // 4. Create a map of userId -> veterinarian for quick lookup
  const vetMap = veterinarians.reduce((map, vet) => {
    map[vet.userId] = vet;
    return map;
  }, {});
  
  // 5. Combine clinic and veterinarian data
  const responseData = clinics.map(clinic => {
    const vet = vetMap[clinic.userId] || null;
    
    return {
      clinicDetails: {
        establishmentType: clinic.establishmentType,
        clinicName: clinic.clinicName,
        city: clinic.city,
        locality: clinic.locality,
        streetAddress: clinic.streetAddress,
        fees: clinic.fees,
        timings: clinic.timings,
        verified: clinic.verified,
        clinicId: clinic._id
      },
      veterinarianDetails: vet ? {
        title: vet.title.value,
        name: vet.name.value,
        gender: vet.gender.value,
        city: vet.city.value,
        experience: vet.experience.value,
        specialization: vet.specialization.value,
        profilePhotoUrl: vet.profilePhotoUrl.value,
        isVerified: vet.isVerified,
        vetId: vet._id
      } : null
    };
  });
  console.log(responseData)

  res.status(200).json({
    success: true,
    count: responseData.length,
    data: responseData
  });
});

// Appointment Booking
const createAppointment = catchAsync(async (req, res, next) => {
  // 1. Extract data from request body
  const {
    clinicId,
    veterinarianId,
    petName,
    petType,
    breed,
    illness,
    date,
    bookingType,
    contactInfo,
    petPic
  } = req.body;
  console.log(req.body)

  // 2. Get user ID from authenticated user
  const userId = req.user._id;

  // 3. Validate clinic exists
  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    return next(new AppError('No clinic found with that ID', 404));
  }

  // 4. Validate veterinarian exists if provided
  if (veterinarianId) {
    const veterinarian = await Veterinarian.findById(veterinarianId);
    if (!veterinarian) {
      return next(new AppError('No veterinarian found with that ID', 404));
    }
  }

  // 5. Create new appointment
  const newAppointment = await Appointment.create({
    clinicId,
    veterinarianId,
    userId,
    petName,
    petType,
    breed,
    illness,
    date: new Date(date),
    bookingType,
    contactInfo,
    petPic,
    status: 'pending' // Default status
  });

  // 6. Format the response data similar to your clinic/vet format
  const responseData = {
    appointmentDetails: {
      _id: newAppointment._id,
      petName: newAppointment.petName,
      petType: newAppointment.petType,
      breed: newAppointment.breed,
      illness: newAppointment.illness,
      date: newAppointment.date,
      bookingType: newAppointment.bookingType,
      status: newAppointment.status,
      createdAt: newAppointment.createdAt
    },
    clinicDetails: {
      clinicName: clinic.clinicName,
      establishmentType: clinic.establishmentType,
      city: clinic.city,
      locality: clinic.locality,
      streetAddress: clinic.streetAddress,
      fees: clinic.fees,
      timings: clinic.timings
    },
    veterinarianDetails: veterinarianId ? {
      name: veterinarian.name,
      specialization: veterinarian.specialization,
      profilePhotoUrl: veterinarian.profilePhotoUrl
    } : null
  };

  res.status(201).json({
    success: true,
    data: responseData
  });
});





module.exports = {
  registerVeterinarian,
  checkVeterinarianVerification,
  getUnverifiedVeterinarians,
  getVerifiedVeterinarians,
  verifyVeterinarianField,
  registerClinic,
  getUnverifiedClinics,
  getVerifiedClinics,
  verifyClinic,
  getProfileDetails,
  getAllClinicsWithVets,
  createAppointment
};