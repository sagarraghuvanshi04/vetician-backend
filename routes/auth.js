const express = require('express');
const { body } = require('express-validator');

const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  registerParent,
  getParentById,
  deleteParent,
  updateParent,
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
} = require('../controllers/authController');

const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

/* =========================
   VALIDATIONS
========================= */

const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  body('loginType')
    .optional()
    .isIn(['veterinarian', 'vetician', 'paravet', 'pet_resort'])
    .withMessage('Invalid login type')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),

  body('loginType')
    .isIn(['veterinarian', 'vetician', 'paravet', 'pet_resort'])
    .withMessage('Invalid login type')
];

/* =========================
   AUTH ROUTES
========================= */

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);

router.post('/refresh-token', refreshToken);
router.post('/logout', auth, logout);
router.post('/logout-all', auth, logoutAll);

router.post('/delete-account', auth, deleteAccount);

/* =========================
   PARENT ROUTES
========================= */

router.post('/parent-register', registerParent);
router.get('/parents/:userId', getParentById);
router.patch('/parents/:id', updateParent);
router.delete('/parents/:id', deleteParent);

/* =========================
   PET ROUTES
========================= */

router.post('/pet-register', createPet);
router.get('/pets/user/:userId', getPetsByUserId);
router.patch('/users/:userId/pets/:petId', updateUserPet);
router.delete('/users/:userId/pets/:petId', deleteUserPet);

/* =========================
   APPOINTMENT
========================= */

router.post('/petparent/appointments/book', auth, createAppointment);

/* =========================
   VETERINARIAN
========================= */

router.post('/veterinarian-register', registerVeterinarian);
router.post('/check-veterinarian-verification', checkVeterinarianVerification);

router.post('/admin/verified', getVerifiedVeterinarians);
router.post('/admin/unverified', getUnverifiedVeterinarians);
router.patch('/verify/:veterinarianId/:fieldName', verifyVeterinarianField);

/* =========================
   CLINIC
========================= */

router.post('/register-clinic', registerClinic);
router.post('/admin/unverified/clinic', getUnverifiedClinics);
router.post('/admin/verified/clinic', getVerifiedClinics);
router.post('/admin/clinic/verify/:clinicId', verifyClinic);
router.post('/veterinarian/profile-screen', getProfileDetails);

/* =========================
   PET RESORT
========================= */

router.post('/petresort/register', createPetResort);
router.post('/admin/verified/petresort', getVerifiedPetResorts);
router.post('/admin/unverified/petresort', getUnverifiedPetResorts);
router.post('/admin/petresort/verify/:resortId', verifyPetResort);
router.post('/admin/petresort/unverify/:resortId', unverifyPetResort);

/* =========================
   PUBLIC
========================= */

router.post('/petparent/verified/all-clinic', getAllClinicsWithVets);

/* =========================
   OTP ROUTES
========================= */

router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

module.exports = router;
