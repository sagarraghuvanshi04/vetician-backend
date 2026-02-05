const User = require('../models/User');
const Veterinarian = require('../models/Veterinarian')
const { AppError } = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

// Get user profile
const getProfile = catchAsync(async (req, res, next) => {
  const user = req.user;

  res.json({
    success: true,
    user: user.getPublicProfile(),
  });
});

// Update user profile
const updateProfile = catchAsync(async (req, res, next) => {
  const user = req.user;
  const { name, phone, location } = req.body;

  // Update fields if provided
  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim() || null;
  if (location !== undefined) user.location = location.trim() || null;

  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully',
    user: user.getPublicProfile(),
  });
});

// Change password
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  
  // Get user with password
  const user = await User.findById(req.user._id).select('+password');
  
  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    return next(new AppError('Current password is incorrect', 400));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Remove all refresh tokens to force re-login on all devices
  user.refreshTokens = [];
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully. Please log in again.',
  });
});

// Delete user account
const deleteAccount = catchAsync(async (req, res, next) => {
  const user = req.user;

  // Soft delete - deactivate account
  user.isActive = false;
  user.refreshTokens = [];
  await user.save();

  res.json({
    success: true,
    message: 'Account deactivated successfully',
  });
});

// Get dashboard summary for Veterinarians
const getDashboardStats = catchAsync(async (req, res, next) => {
  
  if (req.user.role !== 'veterinarian') {
    return next(new AppError('Access denied. Only veterinarians can access this dashboard.', 403));
  }

  
  const stats = {
    patients: 24, // Placeholder: await Patient.countDocuments({ vetId: req.user._id })
    appointments: 12,
    surgeries: 3,
  };

  // 3. Recent activities/patients fetch karein
  const recentPatients = [
    { id: '1', name: 'Max', breed: 'Golden Retriever', time: '10:00 AM', status: 'Annual checkup' },
    { id: '2', name: 'Whiskers', breed: 'Persian Cat', time: '11:30 AM', status: 'Vaccination' },
    { id: '3', name: 'Rocky', breed: 'German Shepherd', time: '2:00 PM', status: 'Post-op' },
  ];

  res.status(200).json({
    success: true,
    stats,
    recentPatients
  });
});



// Get veterinarian public profile (unverified data)
const getVeterinarianPublicProfile = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const veterinarian = await Veterinarian.findById(id);
  if (!veterinarian) {
    return next(new AppError('Veterinarian not found', 404));
  }

  res.status(200).json({
    success: true,
    veterinarian: veterinarian.getPublicProfile()
  });
});

// Admin route to get full veterinarian details including verification status
const getVeterinarianAdmin = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const veterinarian = await Veterinarian.findById(id);
  if (!veterinarian) {
    return next(new AppError('Veterinarian not found', 404));
  }

  res.status(200).json({
    success: true,
    veterinarian
  });
});

// Get all veterinarians (public view)
const getAllVeterinarians = catchAsync(async (req, res) => {
  const veterinarians = await Veterinarian.find({ isVerified: true }); // Only show verified vets to public
  const publicProfiles = veterinarians.map(vet => vet.getPublicProfile());

  res.status(200).json({
    success: true,
    count: publicProfiles.length,
    veterinarians: publicProfiles
  });
});

// Admin route to get all veterinarians including unverified
const getAllVeterinariansAdmin = catchAsync(async (req, res) => {
  const veterinarians = await Veterinarian.find({});

  res.status(200).json({
    success: true,
    count: veterinarians.length,
    veterinarians
  });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getDashboardStats,
  deleteAccount,
  getVeterinarianPublicProfile,
  getVeterinarianAdmin,
  getAllVeterinarians,
  getAllVeterinariansAdmin
};