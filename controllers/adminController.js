const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const User = require('../models/User');

// @desc    Create new admin (Super Admin only)
const createAdmin = async (req, res) => {
    try {
        const { name, email, password, permissions, isSuperAdmin } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        // Check if admin exists
        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Admin already exists with this email'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create admin
        const admin = await Admin.create({
            name,
            email,
            password: hashedPassword,
            permissions: permissions || ['manage_users', 'view_reports'],
            isSuperAdmin: isSuperAdmin || false
        });

        return res.status(201).json({
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                permissions: admin.permissions,
                isSuperAdmin: admin.isSuperAdmin,
                isActive: admin.isActive
            }
        });
    } catch (error) {
        console.error('Create admin error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get all admins (Super Admin only)
const getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find({}).select('-password');
        return res.json({
            success: true,
            count: admins.length,
            admins
        });
    } catch (error) {
        console.error('Get admins error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get admin by ID (Super Admin only)
const getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id).select('-password');
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        return res.json({
            success: true,
            admin
        });
    } catch (error) {
        console.error('Get admin error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Update admin (Super Admin only)
const updateAdmin = async (req, res) => {
    try {
        const { name, email, permissions, isActive, isSuperAdmin } = req.body;
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Update fields
        if (name) admin.name = name;
        if (email) admin.email = email;
        if (permissions) admin.permissions = permissions;
        if (isActive !== undefined) admin.isActive = isActive;
        if (isSuperAdmin !== undefined) admin.isSuperAdmin = isSuperAdmin;

        await admin.save();

        return res.json({
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                permissions: admin.permissions,
                isActive: admin.isActive,
                isSuperAdmin: admin.isSuperAdmin
            }
        });
    } catch (error) {
        console.error('Update admin error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Delete admin (Super Admin only)
const deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);
        
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        // Prevent deleting super admin
        if (admin.isSuperAdmin) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete super admin'
            });
        }

        await admin.deleteOne();

        return res.json({
            success: true,
            message: 'Admin deleted successfully'
        });
    } catch (error) {
        console.error('Delete admin error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get admin profile
const getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user._id).select('-password');
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }
        return res.json({
            success: true,
            admin
        });
    } catch (error) {
        console.error('Get admin profile error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Update admin profile
const updateAdminProfile = async (req, res) => {
    try {
        const { name, email, profileImage } = req.body;
        const admin = await Admin.findById(req.user._id);

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        if (name) admin.name = name;
        if (email) admin.email = email;
        if (profileImage) admin.profileImage = profileImage;

        await admin.save();

        return res.json({
            success: true,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                profileImage: admin.profileImage
            }
        });
    } catch (error) {
        console.error('Update admin profile error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get dashboard stats
const getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const activeUsers = await User.countDocuments({ isActive: true });
        const totalAdmins = await Admin.countDocuments();

        return res.json({
            success: true,
            stats: {
                totalUsers,
                activeUsers,
                inactiveUsers: totalUsers - activeUsers,
                totalAdmins
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

module.exports = {
    createAdmin,
    getAllAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    getAdminProfile,
    updateAdminProfile,
    getDashboardStats
};