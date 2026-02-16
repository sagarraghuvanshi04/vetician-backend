const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Parent = require('../models/Parent');
const Pet = require('../models/Pet');
const Clinic = require('../models/Clinic');
const Veterinarian = require('../models/Veterinarian');
const Paravet = require('../models/Paravet');
const { AppError } = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');
const PetResort = require('../models/PetResort');
const Appointment = require('../models/Appointment');


// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// Register new user
const register = catchAsync(async (req, res, next) => {
  console.log('🔍 REGISTER API - Request started');
  console.log('📝 REGISTER API - Request body:', req.body);
  
  const { name, email, password, phone, role = 'pet_parent' } = req.body;
  
  console.log('📋 REGISTER API - Extracted data:', {
    name: name ? name.trim() : name,
    email: email ? email.toLowerCase().trim() : email,
    phone: phone ? phone.trim() : phone,
    password: password ? '***PROVIDED***' : 'MISSING',
    role
  });

  // Validate required fields
  if (!name || !email || !password) {
    console.log('❌ REGISTER API - Missing required fields');
    return next(new AppError('Name, email, and password are required', 400));
  }

  if (!phone) {
    console.log('❌ REGISTER API - Phone number is required for new registrations');
    return next(new AppError('Phone number is required', 400));
  }

  // Validate role
  if (role && !['veterinarian', 'pet_parent', 'paravet', 'pet_resort'].includes(role)) {
    console.log('❌ REGISTER API - Invalid role specified:', role);
    return next(new AppError('Invalid role specified', 400));
  }
  
  console.log('✅ REGISTER API - Valid role:', role);

  // Check if user already exists
  console.log('🔍 REGISTER API - Checking for existing user with email:', email?.toLowerCase().trim(), 'and role:', role);
  const existingUser = await User.findOne({
    email: email.toLowerCase().trim(),
    role: role
  });

  if (existingUser) {
    console.log('❌ REGISTER API - User already exists:', {
      id: existingUser._id,
      email: existingUser.email,
      role: existingUser.role
    });
    return next(new AppError(`User with this email already exists as a ${role}`, 400));
  }
  console.log('✅ REGISTER API - No existing user found, proceeding with registration');

  // Create new user
  const user = new User({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone: phone.trim(),
    password,
    role: role
  });
  
  console.log('👤 REGISTER API - Created user object:', {
    name: user.name,
    email: user.email,
    role: user.role,
    hasPassword: !!user.password
  });

  console.log('💾 REGISTER API - Saving user to database...');
  await user.save();
  console.log('✅ REGISTER API - User saved successfully with ID:', user._id);

  // Create role-specific entry
  try {
    if (role === 'pet_parent') {
      console.log('➕ REGISTER API - Creating parent entry...');
      const parent = new Parent({
        name: user.name,
        email: user.email,
        user: user._id,
        gender: 'other'
      });
      await parent.save();
      console.log('✅ REGISTER API - Parent entry created:', parent._id);
    } else if (role === 'paravet') {
      const paravet = new Paravet({
        userId: user._id.toString(),
        personalInfo: {
          fullName: { value: user.name, verified: true },
          email: { value: user.email, verified: true }
        },
        applicationStatus: {
          currentStep: 1,
          completionPercentage: 10,
          submitted: false,
          approvalStatus: 'approved', // Auto-approve for testing
          approvedAt: new Date()
        },
        isActive: true
      });
      await paravet.save();
      console.log('✅ REGISTER API - Paravet entry created and auto-approved:', paravet._id);
    }
    // Note: pet_resort and veterinarian entries created during onboarding
  } catch (roleError) {
    console.error('❌ REGISTER API - Error creating role-specific entry:', roleError.message);
    // Continue with registration even if role-specific entry fails
  }

  // Generate tokens
  console.log('🎫 REGISTER API - Generating tokens...');
  const { accessToken, refreshToken } = generateTokens(user._id);
  console.log('✅ REGISTER API - Tokens generated successfully');

  // Save refresh token to user
  console.log('💾 REGISTER API - Saving refresh token to user...');
  user.refreshTokens.push({ token: refreshToken });
  await user.save();
  console.log('✅ REGISTER API - Refresh token saved');

  // Update last login
  console.log('📅 REGISTER API - Updating last login...');
  await user.updateLastLogin();
  console.log('✅ REGISTER API - Last login updated');

  const response = {
    success: true,
    message: 'User registered successfully',
    user: {
      ...user.getPublicProfile(),
      role: user.role
    },
    token: accessToken,
    refreshToken,
  };
  
  console.log('🎉 REGISTER API - Registration successful, sending response:', {
    success: response.success,
    message: response.message,
    userId: response.user.id,
    userRole: response.user.role,
    hasToken: !!response.token
  });

  res.status(201).json(response);
});

// Delete user account
// Delete user account and all associated data
const deleteAccount = catchAsync(async (req, res, next) => {
  const { email, password, loginType } = req.body;

  // Validate required fields
  if (!email || !password || !loginType) {
    return next(new AppError('Email, password, and login type are required', 400));
  }

  // Validate login type
  if (!['veterinarian', 'pet_parent', 'paravet', 'pet_resort'].includes(loginType)) {
    return next(new AppError('Invalid login type specified', 400));
  }

  // Find user and include password for verification
  const user = await User.findByEmailAndRole(email, loginType).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Verify role matches login type
  if (user.role !== loginType) {
    return next(new AppError(`Please authenticate as ${user.role}`, 401));
  }

  // Verify password before deletion
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return next(new AppError('Invalid email or password', 401));
  }

  const userId = user._id;

  // Delete all associated data across all models
  await Promise.all([
    // Delete from Parent model
    Parent.deleteMany({ userId: userId }),
    
    // Delete from Pet model
    Pet.deleteMany({ userId: userId }),
    
    // Delete from Clinic model
    Clinic.deleteMany({ userId: userId }),
    
    // Delete from Veterinarian model
    Veterinarian.deleteMany({ userId: userId }),
    
    // Delete from PetResort model
    PetResort.deleteMany({ userId: userId }),
    
    // Delete appointments where user is either the client or provider
    Appointment.deleteMany({
      $or: [
        { clientId: userId },
        { providerId: userId }
      ]
    }),
    
    // Soft delete the user (set isActive to false)
    (async () => {
      user.isActive = false;
      user.deletedAt = new Date();
      user.refreshTokens = [];
      await user.save();
    })()
  ]);

  res.json({
    success: true,
    message: 'Account and all associated data deleted successfully',
    data: {
      userId: user._id,
      email: user.email,
      deletedAt: user.deletedAt
    }
  });
});

// Login user
const login = catchAsync(async (req, res, next) => {
  console.log('🔍 LOGIN API - Request started');
  console.log('📝 LOGIN API - Request body:', req.body);
  
  const { email, password, loginType } = req.body;
  
  console.log('🔑 LOGIN API - Extracted credentials:', {
    email: email ? email.toLowerCase().trim() : email,
    password: password ? '***PROVIDED***' : 'MISSING',
    loginType
  });

  // Validate login type
  if (!['veterinarian', 'pet_parent', 'paravet', 'pet_resort'].includes(loginType)) {
    console.log('❌ LOGIN API - Invalid login type:', loginType);
    return next(new AppError('Invalid login type specified', 400));
  }
  console.log('✅ LOGIN API - Valid login type:', loginType);

  // Find user and include password for comparison
  console.log('🔍 LOGIN API - Searching for user with email:', email?.toLowerCase().trim(), 'and role:', loginType);
  const user = await User.findByEmailAndRole(email, loginType).select('+password');
  
  if (!user) {
    console.log('❌ LOGIN API - User not found with email:', email, 'and role:', loginType);
    return next(new AppError('Invalid email or password', 401));
  }
  console.log('✅ LOGIN API - User found:', {
    id: user._id,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    hasPassword: !!user.password
  });

  // Verify role matches login type
  if (user.role !== loginType) {
    console.log('❌ LOGIN API - Role mismatch. User role:', user.role, 'Login type:', loginType);
    return next(new AppError(`Please login as ${user.role}`, 401));
  }
  console.log('✅ LOGIN API - Role matches login type');

  // Check if user is active
  if (!user.isActive) {
    console.log('❌ LOGIN API - User account is inactive');
    return next(new AppError('Account has been deactivated', 401));
  }
  console.log('✅ LOGIN API - User account is active');

  // Verify password
  console.log('🔑 LOGIN API - Verifying password...');
  const isPasswordValid = await user.comparePassword(password);
  console.log('🔑 LOGIN API - Password verification result:', isPasswordValid);
  
  if (!isPasswordValid) {
    console.log('❌ LOGIN API - Invalid password');
    return next(new AppError('Invalid email or password', 401));
  }
  console.log('✅ LOGIN API - Password is valid');

  // Generate tokens
  console.log('🎫 LOGIN API - Generating tokens...');
  const { accessToken, refreshToken } = generateTokens(user._id);
  console.log('✅ LOGIN API - Tokens generated successfully');

  // Save refresh token to user
  console.log('💾 LOGIN API - Saving refresh token to user...');
  user.refreshTokens.push({ token: refreshToken });
  await user.save();
  console.log('✅ LOGIN API - Refresh token saved');

  // Update last login
  console.log('📅 LOGIN API - Updating last login...');
  await user.updateLastLogin();
  console.log('✅ LOGIN API - Last login updated');

  const response = {
    success: true,
    message: 'Login successful',
    user: {
      ...user.getPublicProfile(),
      role: user.role
    },
    token: accessToken,
    refreshToken,
  };
  
  console.log('🎉 LOGIN API - Login successful, sending response:', {
    success: response.success,
    message: response.message,
    userId: response.user.id,
    userRole: response.user.role,
    hasToken: !!response.token
  });

  res.json(response);
});

// Register new parent
const registerParent = catchAsync(async (req, res, next) => {
  const { name, email, phone, address, gender, image, userId } = req.body;
  console.log('🔍 REGISTER PARENT - Request body:', req.body);

  // Validate required fields
  if (!name || !email) {
    console.log('❌ REGISTER PARENT - Missing required fields');
    return next(new AppError('Name and email are required', 400));
  }

  // Validate user exists if userId is provided
  if (userId) {
    console.log('🔍 REGISTER PARENT - Checking if user exists:', userId);
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ REGISTER PARENT - User not found:', userId);
      return next(new AppError('User not found', 404));
    }
    console.log('✅ REGISTER PARENT - User found:', user._id);
  }

  // Check if parent already exists by userId or email
  console.log('🔍 REGISTER PARENT - Checking for existing parent...');
  let parent = await Parent.findOne({ 
    $or: [
      { user: userId },
      { email: email.toLowerCase().trim() }
    ]
  });

  // Clean phone and address
  const cleanPhone = phone && phone !== 'Not provided' ? phone.replace(/\D/g, '') : null;
  const cleanAddress = address && address !== 'Not provided' ? address.trim() : null;

  if (parent) {
    console.log('📝 REGISTER PARENT - Updating existing parent:', parent._id);
    // Update existing parent
    parent.name = name;
    parent.email = email.toLowerCase().trim();
    parent.phone = cleanPhone;
    parent.address = cleanAddress;
    if (gender) parent.gender = gender.toLowerCase();
    if (image !== undefined) parent.image = image;
    if (userId) parent.user = userId;
    
    await parent.save();
    console.log('✅ REGISTER PARENT - Parent updated successfully:', parent._id);

    return res.status(200).json({
      success: true,
      message: 'Parent information updated successfully',
      parent: parent.getPublicProfile()
    });
  }

  // Create new parent
  console.log('➕ REGISTER PARENT - Creating new parent...');
  parent = new Parent({
    name,
    email: email.toLowerCase().trim(),
    phone: cleanPhone,
    address: cleanAddress,
    gender: gender ? gender.toLowerCase() : 'other',
    image: image || null,
    user: userId || null
  });

  await parent.save();
  console.log('✅ REGISTER PARENT - New parent created:', parent._id);

  res.status(201).json({
    success: true,
    message: 'Parent registered successfully',
    parent: parent.getPublicProfile()
  });
});

// get parent by id
const getParentById = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  console.log(userId);

  // Find parent by ID
  const parent = await Parent.find({ user: userId });

  if (!parent) {
    return next(new AppError('Parent not found', 404));
  }

  res.status(200).json({
    success: true,
    parent: parent
  });
});

// update parent detail
const updateParent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, phone, address, gender, image } = req.body;

  // Find parent by user ID
  let parent = await Parent.findOne({ user: id });

  if (!parent) {
    // Create new parent if not found
    parent = new Parent({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone === 'Not provided' ? null : phone.replace(/\D/g, ''),
      address: address === 'Not provided' ? null : address.trim(),
      gender: gender ? gender.toLowerCase() : 'other',
      image: image || null,
      user: id
    });
    await parent.save();
    return res.status(200).json({
      success: true,
      message: 'Parent profile created successfully',
      parent: parent.getPublicProfile()
    });
  }

  // Update existing parent
  if (name) parent.name = name.trim();
  if (email) parent.email = email.toLowerCase().trim();
  if (phone) parent.phone = phone === 'Not provided' ? null : phone.replace(/\D/g, '');
  if (address) parent.address = address === 'Not provided' ? null : address.trim();
  if (gender) parent.gender = gender.toLowerCase();
  if (image !== undefined) parent.image = image;

  await parent.save();

  res.status(200).json({
    success: true,
    message: 'Parent profile updated successfully',
    parent: parent.getPublicProfile()
  });
});

// delete parent
const deleteParent = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find parent by ID and delete
  const parent = await Parent.findByIdAndDelete(id);

  if (!parent) {
    return next(new AppError('Parent not found', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Parent deleted successfully',
    data: null
  });
});


// create Veterinarian
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
    Veterinarian.findOne({ userId }),
    Clinic.find({ userId })
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






// Register pet
const createPet = catchAsync(async (req, res, next) => {
  const { name, species, gender, userId } = req.body;
  console.log(req.body);

  // Validate required fields
  if (!name || !species || !gender) {
    return next(new AppError('Name, species and gender are required', 400));
  }

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  // Check if pet already exists for this user
  // const existingPet = await Pet.findOne({ name, userId });
  // if (existingPet) {
  //   return next(new AppError('A pet with this name already exists for this user', 409));
  // }

  // Create new pet  
  const pet = new Pet({
    name,
    species,
    gender,
    userId,
    ...req.body // Include any additional fields
  });

  await pet.save();


  res.status(201).json({
    success: true,
    message: 'Pet created successfully',
    pet: pet.getBasicInfo()
  });
});

// registered pet info
const getPetsByUserId = catchAsync(async (req, res, next) => {
  const { userId } = req.params;
  console.log("getPetsByUserId =>", userId)

  if (!userId) {
    return next(new AppError('User ID is required', 400));
  }

  const pets = await Pet.find({ userId });

  if (!pets || pets.length === 0) {
    return res.status(200).json({
      success: true,
      message: 'No pets found for this user',
      pets: []
    });
  }

  res.status(200).json({
    success: true,
    message: 'Pets retrieved successfully',
    pets: pets
  });
});

// update pet detail
const updateUserPet = catchAsync(async (req, res, next) => {
  const { userId, petId } = req.params;
  const updates = req.body;
  console.log(updates)

  console.log(`Updating pet - User: ${userId}, Pet: ${petId}`);

  // Validate required IDs
  if (!userId || !petId) {
    return next(new AppError('Both User ID and Pet ID are required', 400));
  }

  // Find the pet belonging to this specific user
  const pet = await Pet.findOne({ _id: petId, userId });

  if (!pet) {
    return next(new AppError('Pet not found for this user', 404));
  }

  // List of allowed fields to update
  const allowedUpdates = [
    'name',
    'species',
    'breed',
    'gender',
    'dob',
    'height',
    'weight',
    'color',
    'image',
    'medicalHistory',
    'vaccinationStatus',
    'specialNeeds',
    'location',
    'petPhoto',
    'bloodGroup',
    'distinctiveFeatures',
    'allergies',
    'currentMedications',
    'chronicDiseases',
    'injuries',
    'surgeries',
    'vaccinations',
    'notes'
  ];

  // Filter updates to only include allowed fields
  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedUpdates.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {});

  // Validate date format if dob is being updated
  if (filteredUpdates.dob) {
    const isValidDate = (dateString) => {
      const regEx = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateString.match(regEx)) return false;
      const d = new Date(dateString);
      return d instanceof Date && !isNaN(d);
    };

    if (!isValidDate(filteredUpdates.dob)) {
      return next(new AppError('Invalid date format. Please use YYYY-MM-DD', 400));
    }
  }

  // Validate numeric fields
  const numericFields = ['height', 'weight'];
  numericFields.forEach(field => {
    if (filteredUpdates[field]) {
      filteredUpdates[field] = Number(filteredUpdates[field]);
      if (isNaN(filteredUpdates[field])) {
        return next(new AppError(`${field} must be a valid number`, 400));
      }
    }
  });

  // Apply updates
  const updatedPet = await Pet.findByIdAndUpdate(
    petId,
    filteredUpdates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Pet updated successfully',
    data: {
      pet: updatedPet
    }
  });
});

// delete pet
const deleteUserPet = catchAsync(async (req, res, next) => {
  const { userId, petId } = req.params;

  console.log(`deleteUserPet => User: ${userId}, Pet: ${petId}`);

  // Validate required IDs
  if (!userId || !petId) {
    return next(new AppError('Both User ID and Pet ID are required', 400));
  }

  // Find and delete the pet belonging to this specific user
  const pet = await Pet.findOneAndDelete({ _id: petId, userId });

  if (!pet) {
    return next(new AppError('Pet not found for this user', 404));
  }

  res.status(200).json({
    success: true,
    message: 'Pet deleted successfully',
    data: null
  });
});

// Refresh access token
const refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return next(new AppError('Refresh token is required', 400));
  }

  try {
    // Verify refresh token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError('Invalid refresh token', 401));
    }

    const tokenExists = user.refreshTokens.some(tokenObj => tokenObj.token === token);
    if (!tokenExists) {
      return next(new AppError('Invalid refresh token', 401));
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Remove old refresh token and add new one
    user.refreshTokens = user.refreshTokens.filter(tokenObj => tokenObj.token !== token);
    user.refreshTokens.push({ token: newRefreshToken });
    await user.save();

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(new AppError('Invalid refresh token', 401));
  }
});

// Logout user (remove current refresh token)
const logout = catchAsync(async (req, res, next) => {
  const { refreshToken: token } = req.body;
  const user = req.user;

  if (token) {
    // Remove specific refresh token
    user.refreshTokens = user.refreshTokens.filter(tokenObj => tokenObj.token !== token);
    await user.save();
  }

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// Logout from all devices (remove all refresh tokens)
const logoutAll = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Remove all refresh tokens
  user.refreshTokens = [];
  await user.save();

  res.json({
    success: true,
    message: 'Logged out from all devices successfully',
  });
});






// pet resort detail
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





// veterinarian's clinic for pet parent
const getAllClinicsWithVets = catchAsync(async (req, res, next) => {
  // 1. Fetch all verified clinics
  const clinics = await Clinic.find({ verified: true }).lean();

  if (!clinics || clinics.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      data: []
    });
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











// OTP Storage (In production, use Redis or database)
const otpStorage = new Map();

// Generate random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP using Fast2SMS (for Indian numbers)
const sendOTP = catchAsync(async (req, res, next) => {
  const { phoneNumber, email } = req.body;
  
  console.log('📞 Received OTP request for:', phoneNumber || email);
  
  if (!phoneNumber && !email) {
    return next(new AppError('Phone number or email is required', 400));
  }
  
  // Check if user exists
  let user;
  if (phoneNumber) {
    // For phone numbers, check both phone field and email field
    user = await User.findOne({
      $or: [
        { phone: phoneNumber },
        { phone: phoneNumber.replace('+91', '') }, // Try without country code
        { phone: phoneNumber.replace('+', '') }    // Try without + sign
      ]
    });
    
    if (!user) {
      console.log(`📞 No user found with phone: ${phoneNumber}`);
      console.log('💡 Available phone numbers in database:');
      const allUsers = await User.find({ phone: { $exists: true, $ne: null } }).select('phone email');
      allUsers.forEach(u => console.log(`  - ${u.phone} (${u.email})`));
    }
  } else {
    user = await User.findOne({ email: email.toLowerCase() });
  }
  
  if (!user) {
    return next(new AppError('User not found. Please sign up first.', 404));
  }
  
  const otp = generateOTP();
  const verificationId = 'verify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  console.log('🔢 Generated OTP:', otp);
  
  // Store OTP with 5 minute expiry
  otpStorage.set(verificationId, {
    phoneNumber,
    email,
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000
  });
  
  if (phoneNumber) {
    try {
      const axios = require('axios');
      
      // Clean phone number (remove +91)
      const cleanPhone = phoneNumber.replace('+91', '').replace('+', '');
      console.log('📤 Sending SMS to:', cleanPhone);
      console.log('🔑 API Key:', process.env.FAST2SMS_API_KEY ? 'Found' : 'Missing');
      
      const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'v3',
        sender_id: 'FSTSMS',
        message: `Your Vetician OTP is ${otp}. Valid for 5 minutes.`,
        language: 'english',
        flash: 0,
        numbers: cleanPhone
      }, {
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Fast2SMS response:', response.data);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        verificationId
      });
    } catch (error) {
      console.error('❌ SMS Error:', error.message);
      if (error.response) {
        console.error('❌ Response data:', error.response.data);
        console.error('❌ Response status:', error.response.status);
      }
      
      // Check if it's the payment requirement error
      if (error.response?.data?.message?.includes('complete one transaction')) {
        return res.status(402).json({
          success: false,
          message: 'SMS service requires payment activation. Please use email OTP instead.',
          errorCode: 'SMS_PAYMENT_REQUIRED',
          suggestedAction: 'USE_EMAIL_OTP'
        });
      }
      
      // For other SMS errors
      return res.status(500).json({
        success: false,
        message: 'SMS service temporarily unavailable. Please use email OTP instead.',
        errorCode: 'SMS_SERVICE_ERROR',
        suggestedAction: 'USE_EMAIL_OTP'
      });
    }
  } else {
    // Email OTP using nodemailer with Gmail
    try {
      const nodemailer = require('nodemailer');
      
      // Create transporter using Gmail (free service)
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        // Add these options for better compatibility
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Test the connection first
      await transporter.verify();
      console.log('✅ Email server connection verified');
      
      const mailOptions = {
        from: `"Vetician App" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Vetician OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4A90E2;">Vetician OTP Verification</h2>
            <p>Your OTP code is:</p>
            <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4A90E2; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">This is an automated message from Vetician. Please do not reply.</p>
          </div>
        `
      };
      
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Email OTP sent to ${email}:`, info.messageId);
      
      res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email',
        verificationId
      });
    } catch (emailError) {
      console.error('❌ Email Error:', emailError.message);
      console.log(`📧 OTP for ${email}: ${otp}`);
      
      // Return error - don't show test OTP in frontend
      return next(new AppError('Failed to send email OTP. Please check your email settings or try phone OTP.', 500));
    }
  }
});

// Verify OTP
const verifyOTP = catchAsync(async (req, res, next) => {
  const { phoneNumber, email, otp, verificationId } = req.body;
  
  if ((!phoneNumber && !email) || !otp || !verificationId) {
    return next(new AppError('Phone/Email, OTP, and verification ID are required', 400));
  }
  
  const storedData = otpStorage.get(verificationId);
  if (!storedData) {
    console.log('❌ Verification ID not found or expired:', verificationId);
    console.log('🗺 Available verification IDs:', Array.from(otpStorage.keys()));
    return next(new AppError('Invalid or expired verification ID. Please request a new OTP.', 400));
  }
  
  if (Date.now() > storedData.expiresAt) {
    otpStorage.delete(verificationId);
    return next(new AppError('OTP has expired', 400));
  }
  
  if (phoneNumber && storedData.phoneNumber !== phoneNumber) {
    return next(new AppError('Phone number mismatch', 400));
  }
  
  if (email && storedData.email !== email) {
    return next(new AppError('Email mismatch', 400));
  }
  
  if (storedData.otp !== otp) {
    return next(new AppError('Invalid OTP', 400));
  }
  
  otpStorage.delete(verificationId);
  
  let user;
  if (phoneNumber) {
    user = await User.findOne({ phone: phoneNumber });
  } else {
    user = await User.findOne({ email: email.toLowerCase() });
  }
  
  if (!user) {
    return next(new AppError('User not found', 404));
  }
  
  const { accessToken, refreshToken } = generateTokens(user._id);
  user.refreshTokens.push({ token: refreshToken });
  await user.save();
  await user.updateLastLogin();
  
  res.status(200).json({
    success: true,
    message: 'OTP verified successfully',
    user: {
      ...user.getPublicProfile(),
      role: user.role
    },
    token: accessToken,
    refreshToken
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  registerParent,
  getParentById,
  updateParent,
  deleteParent,
  createPet,
  updateUserPet,
  deleteUserPet,
  registerVeterinarian,
  getUnverifiedVeterinarians,
  getVerifiedVeterinarians,
  verifyVeterinarianField,
  checkVeterinarianVerification,
  registerClinic,
  getUnverifiedClinics,
  getVerifiedClinics,
  verifyClinic,
  getProfileDetails,
  createPetResort,
  getUnverifiedPetResorts,
  getVerifiedPetResorts,
  verifyPetResort,
  unverifyPetResort,
  getAllClinicsWithVets,
  createAppointment,
  getPetsByUserId,
  deleteAccount,
  sendOTP,
  verifyOTP
};
