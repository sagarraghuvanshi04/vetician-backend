const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createBooking,
  getUserBookings,
  getBooking,
  updateBookingStatus,
  cancelBooking
} = require('../controllers/doorstepController');

router.use(auth);

router.post('/bookings', createBooking);
router.get('/bookings', getUserBookings);
router.get('/bookings/:id', getBooking);
router.patch('/bookings/:id/status', updateBookingStatus);
router.patch('/bookings/:id/cancel', cancelBooking);

module.exports = router;
