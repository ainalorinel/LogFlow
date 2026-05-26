const express = require('express');
const { register, login, getMe, createDriver, verifyOwner } = require('../controllers/authController');
const { protect, authorize } = require('../middlewares/auth.js');
const { getDrivers } = require('../controllers/orderController.js');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/verify-owner', verifyOwner);
router.post('/create-driver', protect, authorize('proprietaire'), createDriver);
router.get('/drivers', protect, authorize('proprietaire'), getDrivers);

module.exports = router;