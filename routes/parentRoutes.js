const express = require('express');
const {
  registerParent
} = require('../controllers/parentController');
const {
  createPet,
  getPetsByUserId,
  
}=require("../controllers/petController")

const {
  createAppointment
  
}=require("../controllers/vetController")
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerParent);
router.post('/pets', auth, createPet);
router.get('/pets/:userId', auth, getPetsByUserId);
router.post('/appointments', auth, createAppointment);

module.exports = router;