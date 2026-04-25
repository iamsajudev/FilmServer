const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// ==================== ADMIN PROFILE ROUTES ====================
router.get('/profile', async (req, res) => {
    try {
        const admin = await User.findById(req.user._id).select('-password');
        res.json({ success: true, admin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/profile', async (req, res) => {
    try {
        const { name, email } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        
        const admin = await User.findByIdAndUpdate(
            req.user._id,
            updateData,
            { new: true }
        ).select('-password');
        
        res.json({ success: true, admin });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================== USER MANAGEMENT ROUTES ====================

// @route   GET /api/admin/users
// @desc    Get all users
router.get('/users', async (req, res) => {
    try {
        const { search, role, status, page = 1, limit = 50 } = req.query;
        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        if (role && role !== 'all') {
            query.role = role;
        }

        if (status && status !== 'all') {
            query.isActive = status === 'active';
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        res.json({ success: true, user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   POST /api/admin/users
// @desc    Create new user
router.post('/users', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { name, email, password, role, isActive } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and password are required'
            });
        }

        // Check if user exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate username from email
        let username = email.split('@')[0];
        let existingUsername = await User.findOne({ username });
        if (existingUsername) {
            username = username + Math.floor(Math.random() * 1000);
        }

        const newUser = new User({
            name,
            fullName: name,
            email: email.toLowerCase(),
            password: hashedPassword,
            username,
            role: role || 'user',
            isActive: isActive !== undefined ? isActive : true,
            isEmailVerified: true,
            createdAt: new Date(),
            stats: {
                projects: 0,
                submissions: 0,
                selections: 0,
                awards: 0
            }
        });

        await newUser.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                isActive: newUser.isActive
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
router.put('/users/:id', async (req, res) => {
    try {
        const { name, email, role, isActive } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name) updateData.name = name;
        if (email) updateData.email = email.toLowerCase();
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'You cannot delete your own account'
            });
        }

        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PATCH /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate)
router.patch('/users/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.isActive = isActive;
        await user.save();

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// @route   PATCH /api/admin/users/:id/role
// @desc    Update user role
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        
        // Validate role
        if (!['user', 'admin', 'moderator'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        user.role = role;
        await user.save();

        res.json({
            success: true,
            message: `User role updated to ${role}`
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// ==================== STATS ROUTES ====================

// @route   GET /api/admin/stats
// @desc    Get admin dashboard stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const adminUsers = await User.countDocuments({ role: 'admin' });
        const totalProjects = await Project.countDocuments();
        const pendingProjects = await Project.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                adminUsers,
                totalProjects,
                pendingProjects
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;