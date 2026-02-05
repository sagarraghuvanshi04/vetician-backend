

const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const User = require('../models/User');
const { AppError } = require('../utils/appError');
const { catchAsync } = require('../utils/catchAsync');

const auth = catchAsync(async (req, res, next) => {
  // 1. Get token from header
  const authHeader = req.header('Authorization');
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return next(new AppError('Access token is required', 401));
  }

  try {
    // 2. Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // 3. Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new AppError('User not found', 401));
    }

    // 4. Check if user is active
    if (!user.isActive) {
      return next(new AppError('Account has been deactivated', 401));
    }

    // 5. Check if user changed password after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please log in again.', 401));
    }

    // 6. Add user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Authentication failed', 401));
  }
});

module.exports = { auth };
