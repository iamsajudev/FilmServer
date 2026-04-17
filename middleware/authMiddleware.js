const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // First try to find in User model, then in Admin model
            let user = await User.findById(decoded.id).select('-password');
            let isAdmin = false;
            
            if (!user) {
                user = await Admin.findById(decoded.id).select('-password');
                if (user) isAdmin = true;
            }
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            req.user = user;
            req.isAdmin = isAdmin;
            
            next();
        } catch (error) {
            console.error('Auth error:', error.message);
            
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid token'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expired'
                });
            }
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }
    }
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }
};

const adminOnly = (req, res, next) => {
    // Check if user is from Admin model or has admin role in User model
    if (req.isAdmin || (req.user && req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
};

module.exports = { protect, adminOnly };