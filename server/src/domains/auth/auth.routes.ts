const express = require("express");
const router = express.Router();
const { register, Login, getCurrentUser, updateProfile, testWhatsappConnection } = require("../controllers/authController");
const protect  = require("../middleware/authMiddleware");

//public routes
router.post('/register', register);
router.post('/login', Login);

//protected routes
router.get('/me', protect, getCurrentUser);
router.get('/profile', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);
router.post('/whatsapp/test-connection', protect, testWhatsappConnection);

module.exports = router;
