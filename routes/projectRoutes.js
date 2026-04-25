// routes/projectRoutes.js
const express = require('express');
const {
    createProject,
    getAllProjects,
    getUserProjects,
    getProjectById,
    getProjectBySlug,
    updateProject,
    deleteProject,
    addReview,
    submitProject
} = require('../controllers/projectController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ============ PUBLIC ROUTES (No authentication required) ============
router.get('/', getAllProjects);
router.get('/slug/:slug', getProjectBySlug);
router.post('/submit', submitProject);

// ============ PROTECTED ROUTES (Authentication required) ============
// ✅ IMPORTANT: This must come AFTER public routes
router.use(protect);

// User's own projects - This requires authentication
router.get('/user/list', getUserProjects);  // This will redirect if no token
router.post('/create', createProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/reviews', addReview);

// Admin routes
router.get('/admin/all', adminOnly, getAllProjects);

module.exports = router;