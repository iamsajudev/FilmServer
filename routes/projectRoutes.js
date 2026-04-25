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
router.post('/submit', submitProject);  // ✅ PUBLIC - No auth required

// ============ PROTECTED ROUTES (Authentication required) ============
router.use(protect);  // All routes below require authentication

// User's own projects
router.get('/user/list', getUserProjects);
router.post('/create', createProject);

// Dynamic routes (with parameters)
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/reviews', addReview);

// Admin routes
router.get('/admin/all', adminOnly, getAllProjects);

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Project routes are working!' });
});

module.exports = router;