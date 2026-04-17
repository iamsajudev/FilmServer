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

// ============ PUBLIC ROUTES ============
router.get('/', getAllProjects);
router.get('/slug/:slug', getProjectBySlug);

// ============ PROTECTED ROUTES ============
router.use(protect);

// SPECIFIC routes - USE A UNIQUE PREFIX
router.get('/user/list', getUserProjects);  // Changed to /user/list
router.post('/create', createProject);       // Changed to /create
router.post('/submit', submitProject);

// Dynamic routes (with parameters)
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);
router.post('/:id/reviews', addReview);

// ============ ADMIN ROUTES ============
router.get('/admin/all', adminOnly, getAllProjects);

router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Project routes are working!' });
});

module.exports = router;