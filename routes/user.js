const express = require('express');
const { body } = require('express-validator');
const {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  getVeterinarianPublicProfile,
  getDashboardStats,
  getVeterinarianAdmin,
  getAllVeterinarians,
  getAllVeterinariansAdmin
} = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');

const router = express.Router();

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
];

// Routes (all protected)
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfileValidation, validate, updateProfile);
router.put('/change-password', auth, changePasswordValidation, validate, changePassword);
router.delete('/account', auth, deleteAccount);
router.get('/dashboard-stats', auth, getDashboardStats);

// Public routes
router.get('/veterinarians/:id', getVeterinarianPublicProfile);
router.get('/veterinarians', getAllVeterinarians);

// Admin routes
router.get('/admin/veterinarians/:id', getVeterinarianAdmin);
router.get('/admin/veterinarians', getAllVeterinariansAdmin);

module.exports = router;