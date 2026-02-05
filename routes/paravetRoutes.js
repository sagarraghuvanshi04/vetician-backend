const express = require('express');
const {
  initializeParavetOnboarding,
  getParavetProfile,
  updatePersonalInfo,
  updateExperienceSkills,
  updatePaymentInfo,
  agreeToCodeOfConduct,
  completeTrainingModule,
  submitApplication,
  uploadDocuments,
  getUnverifiedParavets,
  verifyParavet,
  verifyParavetField
} = require('../controllers/paravetController');

const { auth } = require('../middleware/auth');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Paravet routes working!' });
});

// User routes
router.post('/initialize', auth, initializeParavetOnboarding);
router.get('/profile/:userId', auth, getParavetProfile);
router.patch('/personal-info/:userId', auth, updatePersonalInfo);
router.patch('/experience-skills/:userId', auth, updateExperienceSkills);
router.patch('/payment-info/:userId', auth, updatePaymentInfo);
router.patch('/code-of-conduct/:userId', auth, agreeToCodeOfConduct);
router.patch('/training/:userId', auth, completeTrainingModule);
router.patch(
  '/upload-documents/:userId',
  uploadDocuments
);
router.post('/submit/:userId', auth, submitApplication);

// Admin routes
router.get('/admin/unverified', getUnverifiedParavets);
router.patch('/admin/verify/:id', verifyParavet);
router.patch('/admin/verify-field/:id/:field', verifyParavetField);

module.exports = router;
