const express = require('express');
const {
  createPetResort,
  getVerifiedPetResorts,
  getUnverifiedPetResorts,
  verifyPetResort,
  unverifyPetResort
} = require('../controllers/resortController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createPetResort);
router.get('/', getVerifiedPetResorts);

// Admin routes
router.get('/admin/unverified', getUnverifiedPetResorts);
router.patch('/admin/verify/:id', verifyPetResort);
router.patch('/admin/unverify/:id', unverifyPetResort);

module.exports = router;