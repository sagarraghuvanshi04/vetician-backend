const express = require('express');
const {
  registerVeterinarian,
  checkVeterinarianVerification,
  registerClinic,
  getProfileDetails,
  getAllClinicsWithVets,
  getUnverifiedVeterinarians,
  getVerifiedVeterinarians,
  verifyVeterinarianField,
  getUnverifiedClinics,
  getVerifiedClinics,
  verifyClinic
} = require('../controllers/vetController');

const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', auth, registerVeterinarian);
router.get('/verification-status', auth,checkVeterinarianVerification);
router.post('/clinics', auth, registerClinic);
router.get('/profile', auth, getProfileDetails);
router.get('/clinics', getAllClinicsWithVets);

// Admin routes
router.get('/admin/unverified', getUnverifiedVeterinarians);
router.get('/admin/verified', getVerifiedVeterinarians);
router.patch('/admin/verify-field/:id/:field', verifyVeterinarianField);
router.get('/admin/clinics/unverified', getUnverifiedClinics);
router.get('/admin/clinics/verified', getVerifiedClinics);
router.patch('/admin/clinics/verify/:id', verifyClinic);

module.exports = router;