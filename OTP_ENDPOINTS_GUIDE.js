/**
 * OTP Endpoints for Paravet Mobile Verification
 * Add these functions to backend/controllers/paravetController.js
 * 
 * For production use:
 * - Twilio: npm install twilio
 * - AWS SNS: npm install aws-sdk
 * - Firebase: npm install firebase-admin
 */

const sendOTP = catchAsync(async (req, res, next) => {
  const { userId, mobileNumber } = req.body;

  // Validate input
  if (!userId || !mobileNumber) {
    return next(new AppError('User ID and mobile number are required', 400));
  }

  if (!/^\d{10}$/.test(mobileNumber)) {
    return next(new AppError('Mobile number must be 10 digits', 400));
  }

  try {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP (Choose one method based on your setup)
    // Option 1: Using Redis (recommended for production)
    // await redis.setex(`otp:${userId}:${mobileNumber}`, 300, otp);

    // Option 2: Using MongoDB with TTL (for development)
    const OTPRecord = new OTP({
      userId,
      mobileNumber,
      otp,
      expiresAt,
    });
    await OTPRecord.save();

    // Send OTP via SMS (Using Twilio example)
    // For development, log to console
    console.log(`\n📱 OTP for ${mobileNumber}: ${otp}`);

    // Production: Use Twilio, AWS SNS, or Firebase
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your Vetician OTP is: ${otp}. Valid for 5 minutes.`,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: `+91${mobileNumber}`
    // });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      // For development only - remove in production
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });
  } catch (error) {
    console.error('OTP send error:', error);
    return next(new AppError('Failed to send OTP', 500));
  }
});

const verifyOTP = catchAsync(async (req, res, next) => {
  const { userId, mobileNumber, otp } = req.body;

  // Validate input
  if (!userId || !mobileNumber || !otp) {
    return next(new AppError('User ID, mobile number, and OTP are required', 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new AppError('OTP must be 6 digits', 400));
  }

  try {
    // Retrieve stored OTP
    const otpRecord = await OTP.findOne({
      userId,
      mobileNumber,
      otp,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!otpRecord) {
      return next(new AppError('Invalid or expired OTP', 400));
    }

    // Update Paravet record
    const paravet = await Paravet.findOne({ userId });
    if (!paravet) {
      return next(new AppError('Paravet profile not found', 404));
    }

    paravet.personalInfo.mobileNumber.otpVerified = true;
    paravet.personalInfo.mobileNumber.verified = true; // Auto-verify mobile
    await paravet.save();

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      success: true,
      message: 'Mobile number verified successfully',
      data: paravet,
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return next(new AppError('OTP verification failed', 500));
  }
});

/**
 * OTP Model to add to backend/models/OTP.js
 */
const otpSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // Auto-delete expired records
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Routes to add to backend/routes/paravetRoutes.js
 */
// router.post('/send-otp/:userId', auth, sendOTP);
// router.post('/verify-otp/:userId', auth, verifyOTP);

/**
 * Environment Variables to add to .env
 */
// For Twilio:
// TWILIO_ACCOUNT_SID=your_account_sid
// TWILIO_AUTH_TOKEN=your_auth_token
// TWILIO_PHONE_NUMBER=your_twilio_number

// For AWS SNS:
// AWS_ACCESS_KEY_ID=your_key
// AWS_SECRET_ACCESS_KEY=your_secret
// AWS_SNS_REGION=us-east-1

// For Firebase:
// FIREBASE_PROJECT_ID=your_project_id
// FIREBASE_PRIVATE_KEY=your_private_key
// FIREBASE_CLIENT_EMAIL=your_client_email

module.exports = {
  sendOTP,
  verifyOTP,
};
