const express = require("express");
const router = express.Router();
const { register, Login, getCurrentUser, updateProfile } = require("../controllers/authController");
const protect  = require("../middleware/authMiddleware");

//public routes
router.post('/register', register);
router.post('/login', Login);

//protected routes
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, updateProfile);

module.exports = router;