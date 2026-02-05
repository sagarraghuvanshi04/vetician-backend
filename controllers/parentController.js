const Parent = require('../models/Parent');
const { catchAsync } = require('../utils/catchAsync');
// Register new parent
const registerParent = catchAsync(async (req, res, next) => {
  const { name, email, phone, address } = req.body;
  console.log(req.body)

  // Check if parent already exists
  const existingParent = await Parent.findByEmail(email);
  if (existingParent) {
    return next(new AppError('Parent with this email already exists', 400));
  }

  // Create new parent  
  const parent = new Parent({
    name: name,
    email: email,
    phone: phone,
    address: address,
  });

  await parent.save();

  // Generate tokens (same as user registration)
  const { accessToken, refreshToken } = generateTokens(parent._id);

  res.status(201).json({
    success: true,
    message: 'Parent registered successfully',
    parent: parent.getPublicProfile(),
    token: accessToken,
    refreshToken,
  });
});


module.exports = {
  registerParent
};