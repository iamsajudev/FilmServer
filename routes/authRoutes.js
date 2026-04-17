const express = require('express');
const {
    registerUser,
    loginUser,
    changePassword,
    forgotPassword,
    getMe,
    updateProfile,
    deleteAccount,
    logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);

// Protected routes (for all authenticated users)
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.delete('/me', protect, deleteAccount);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logout);

module.exports = router;