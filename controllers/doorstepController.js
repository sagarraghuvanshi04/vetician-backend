const DoorstepService = require('../models/DoorstepService');
const { catchAsync } = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Create doorstep service booking
exports.createBooking = catchAsync(async (req, res, next) => {
  const {
    serviceType,
    petIds,
    servicePartnerId,
    servicePartnerName,
    appointmentDate,
    timeSlot,
    address,
    isEmergency,
    repeatBooking,
    specialInstructions,
    paymentMethod,
    couponCode,
    basePrice,
    emergencyCharge,
    discount,
    totalAmount
  } = req.body;

  const booking = await DoorstepService.create({
    userId: req.user._id,
    serviceType,
    petIds,
    servicePartnerId,
    servicePartnerName,
    appointmentDate,
    timeSlot,
    address,
    isEmergency,
    repeatBooking,
    specialInstructions,
    paymentMethod,
    couponCode,
    basePrice,
    emergencyCharge,
    discount,
    totalAmount
  });

  res.status(201).json({
    success: true,
    data: booking
  });
});

// Get all bookings for a user
exports.getUserBookings = catchAsync(async (req, res, next) => {
  const bookings = await DoorstepService.find({ userId: req.user._id })
    .populate('petIds')
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings
  });
});

// Get single booking
exports.getBooking = catchAsync(async (req, res, next) => {
  const booking = await DoorstepService.findById(req.params.id)
    .populate('petIds')
    .populate('userId', 'name email phone');

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// Update booking status
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;

  const booking = await DoorstepService.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  res.status(200).json({
    success: true,
    data: booking
  });
});

// Cancel booking
exports.cancelBooking = catchAsync(async (req, res, next) => {
  const booking = await DoorstepService.findById(req.params.id);

  if (!booking) {
    return next(new AppError('Booking not found', 404));
  }

  if (booking.userId.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to cancel this booking', 403));
  }

  booking.status = 'cancelled';
  await booking.save();

  res.status(200).json({
    success: true,
    data: booking
  });
});
