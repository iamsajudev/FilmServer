const express = require('express');
const {
    createAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    getAdminProfile,
    updateAdminProfile,
    getDashboardStats
} = require('../controllers/adminController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// All admin routes require authentication
router.use(protect);
router.use(adminOnly);

// Admin profile routes
router.get('/profile', getAdminProfile);
router.put('/profile', updateAdminProfile);
router.get('/dashboard/stats', getDashboardStats);

// Super admin only routes
router.post('/', superAdminOnly, createAdmin);
router.get('/', superAdminOnly, getAllAdmins);
router.get('/:id', superAdminOnly, getAdminById);
router.put('/:id', superAdminOnly, updateAdmin);
router.delete('/:id', superAdminOnly, deleteAdmin);

module.exports = router;