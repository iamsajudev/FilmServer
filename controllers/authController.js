const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign(
        { id, role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// @desc    Register User
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role = 'user' } = req.body;

        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email and password'
            });
        }

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role
        });

        // Generate token
        const token = generateToken(user._id, user.role);

        return res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error during registration'
        });
    }
};

// @desc    Login User
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Find user
        const user = await User.findOne({ email }).select('+password');

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id, user.role);

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error during login'
        });
    }
};

// @desc    Change Password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide current password and new password'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters'
            });
        }

        // Get user with password field
        const user = await User.findById(req.user.id).select('+password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.passwordChangedAt = new Date();
        await user.save();

        return res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error while changing password'
        });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email'
            });
        }

        const user = await User.findOne({ email });

        if (!user) {
            // For security, don't reveal that email doesn't exist
            return res.json({
                success: true,
                message: 'If your email is registered, you will receive reset instructions'
            });
        }

        // Generate reset token (you can implement this with nodemailer)
        // For now, just return success
        return res.json({
            success: true,
            message: 'Password reset instructions sent to your email'
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Get Current User Profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                profileImage: user.profileImage,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Update User Profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('Received update data:', req.body);

        // Update basic fields
        if (req.body.fullName !== undefined) user.fullName = req.body.fullName;
        if (req.body.name !== undefined) user.name = req.body.name;
        if (req.body.username !== undefined) user.username = req.body.username;
        if (req.body.title !== undefined) user.title = req.body.title;
        if (req.body.bio !== undefined) user.bio = req.body.bio;
        if (req.body.location !== undefined) user.location = req.body.location;
        if (req.body.email !== undefined) user.email = req.body.email;
        if (req.body.phone !== undefined) user.phone = req.body.phone;
        if (req.body.website !== undefined) user.website = req.body.website;
        
        // Update gender and pronouns
        if (req.body.gender !== undefined) user.gender = req.body.gender;
        if (req.body.pronouns !== undefined) user.pronouns = req.body.pronouns;
        
        // Update birthdate
        if (req.body.birthdate !== undefined) user.birthdate = req.body.birthdate;
        
        // Update timezone and currency
        if (req.body.timezone !== undefined) user.timezone = req.body.timezone;
        if (req.body.currency !== undefined) user.currency = req.body.currency;
        
        // Update social media
        if (req.body.socialMedia !== undefined) {
            user.socialMedia = {
                ...user.socialMedia,
                ...req.body.socialMedia
            };
        }
        
        // Update skills
        if (req.body.skills !== undefined) {
            user.skills = req.body.skills;
        }
        
        // Update experience
        if (req.body.experience !== undefined) {
            user.experience = req.body.experience;
        }
        
        // Update stats
        if (req.body.stats !== undefined) {
            user.stats = {
                ...user.stats,
                ...req.body.stats
            };
        }
        
        // Handle profile image (base64)
        if (req.body.profileImage && req.body.profileImage.startsWith('data:image')) {
            user.profileImage = req.body.profileImage;
            user.avatar = req.body.profileImage;
        }
        
        // Handle cover photo
        if (req.body.coverPhoto && req.body.coverPhoto.startsWith('data:image')) {
            user.coverPhoto = req.body.coverPhoto;
        }
        
        // Handle password update (if provided)
        if (req.body.password && req.body.password.trim() !== '') {
            if (req.body.password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 6 characters'
                });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
            user.passwordChangedAt = new Date();
        }
        
        await user.save();
        
        // Return updated user without password
        const updatedUser = await User.findById(req.user.id).select('-password');
        
        console.log('Profile updated successfully for user:', updatedUser.email);
        
        res.status(200).json({
            success: true,
            data: updatedUser,
            message: 'Profile updated successfully'
        });
        
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error while updating profile'
        });
    }
};

// @desc    Delete User Account (Soft Delete)
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Soft delete - deactivate account
        user.isActive = false;
        await user.save();

        return res.json({
            success: true,
            message: 'Account deactivated successfully'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

// @desc    Logout User
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
    try {
        // In JWT-based authentication, logout is handled client-side
        // by removing the token. This endpoint is for convenience.
        
        return res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    changePassword,
    forgotPassword,
    getMe,
    updateProfile,
    deleteAccount,
    logout
};