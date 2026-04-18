// ✅ VERY FIRST: Fix DNS issue for MongoDB Atlas (SRV)
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']); // Use Google DNS
dns.setDefaultResultOrder('ipv4first');

// ✅ Load environment variables
require('dotenv').config({ override: true });

// ✅ Debug: Check env variables
console.log('=== Environment Check ===');
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Defined' : '❌ Undefined');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('CLIENT_URL:', process.env.CLIENT_URL);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Defined' : '❌ Undefined');
console.log('========================\n');

// ✅ Imports
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ Import the User model from models folder
const User = require('./models/User');

// ✅ MongoDB Connection Function
const connectDB = async () => {
    try {
        console.log('📡 Connecting to MongoDB Atlas...');

        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Log masked URI for debugging
        const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log('Connection string:', maskedURI);

        // Connection options for better reliability
        const options = {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            family: 4, // Use IPv4
            retryWrites: true,
            w: 'majority',
            maxPoolSize: 10,
            minPoolSize: 2,
            heartbeatFrequencyMS: 10000,
            connectTimeoutMS: 30000,
        };

        await mongoose.connect(mongoURI, options);

        console.log('✅ MongoDB Connected Successfully!');
        console.log('📊 Database:', mongoose.connection.db.databaseName);
        console.log('🔗 Host:', mongoose.connection.host);

        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        return false;
    }
};

// ✅ Auth Middleware
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key_change_this');
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// ✅ Admin Middleware
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
};

// ✅ Define Other Schemas (Project, Film, Submission)
const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    director: { type: String, required: true },
    year: { type: Number },
    duration: { type: Number },
    genre: { type: String },
    posterUrl: { type: String },
    trailerUrl: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'in-review'], default: 'pending' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // Step 1: Project Information - Additional fields
    hasNonEnglishTitle: { type: Boolean, default: false },
    nonEnglishTitle: { type: String, default: '' },
    nonEnglishSynopsis: { type: String, default: '' },
    website: { type: String, default: '' },
    twitter: { type: String, default: '' },
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    // Step 2: Submitter Information
    submitterEmail: { type: String, default: '' },
    submitterPhone: { type: String, default: '' },
    submitterAddress: { type: String, default: '' },
    submitterCity: { type: String, default: '' },
    submitterStateProvince: { type: String, default: '' },
    submitterPostalCode: { type: String, default: '' },
    submitterCountry: { type: String, default: '' },
    submitterBirthDate: { type: String, default: '' },
    submitterGender: { type: String, default: '' },
    submitterPronouns: { type: String, default: '' },
    // Step 3: Credits
    directors: [{
        firstName: String,
        middleName: String,
        lastName: String,
        priorCredits: String
    }],
    writers: [{
        firstName: String,
        middleName: String,
        lastName: String,
        priorCredits: String
    }],
    producers: [{
        firstName: String,
        middleName: String,
        lastName: String,
        priorCredits: String
    }],
    keyCast: [{
        firstName: String,
        middleName: String,
        lastName: String,
        role: String,
        priorCredits: String
    }],
    // Step 4: Specifications
    projectTypes: [String],
    genres: { type: String, default: '' },
    runtimeHours: { type: String, default: '00' },
    runtimeMinutes: { type: String, default: '00' },
    runtimeSeconds: { type: String, default: '00' },
    completionDate: { type: String, default: '' },
    productionBudget: { type: String, default: '' },
    countryOfOrigin: { type: String, default: '' },
    countryOfFilming: { type: String, default: '' },
    language: { type: String, default: 'en' },
    shootingFormat: { type: String, default: '' },
    aspectRatio: { type: String, default: '16:9' },
    filmColor: { type: String, default: 'Color' },
    studentProject: { type: String, default: 'No' },
    firstTimeFilmmaker: { type: String, default: 'No' },
    // Step 5: Screenings
    screenings: [{
        festivalName: String,
        screeningDate: Date,
        location: String,
        awardWon: String
    }],
    distributors: [{
        name: String,
        contact: String,
        region: String
    }],
    // Payment
    paymentIntentId: { type: String, default: '' },
    submittedAt: { type: Date, default: Date.now }
});

const filmSchema = new mongoose.Schema({
    title: { type: String, required: true },
    director: { type: String, required: true },
    year: { type: Number },
    duration: { type: Number },
    genre: { type: String },
    description: { type: String },
    posterUrl: { type: String },
    trailerUrl: { type: String },
    submissionStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const submissionSchema = new mongoose.Schema({
    filmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Film', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'reviewing', 'accepted', 'rejected'], default: 'pending' },
    feedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// ✅ Register models (but NOT User - it's already imported)
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
const Film = mongoose.models.Film || mongoose.model('Film', filmSchema);
const Submission = mongoose.models.Submission || mongoose.model('Submission', submissionSchema);

// ✅ Create Admin User Function
const createAdminUser = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
        const existingAdmin = await User.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 10);

            const adminUser = new User({
                name: process.env.ADMIN_NAME || 'Super Admin',
                fullName: process.env.ADMIN_NAME || 'Super Admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                isEmailVerified: true
            });

            await adminUser.save();
            console.log('✅ Admin user created successfully');
            console.log(`📧 Email: ${adminEmail}`);
            console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
    }
};

// ✅ Start server AFTER DB connection
const startServer = async () => {
    try {
        // 🔌 Connect DB first
        const isConnected = await connectDB();

        if (!isConnected) {
            console.error('\n❌ Failed to connect to database. Exiting...');
            process.exit(1);
        }

        const app = express();

        // ✅ Body parsers
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // ✅ CORS configuration
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:5000',
            'https://server.nybff.us',
            'https://portals.nybff.us',
            process.env.CORS_ORIGIN,
            process.env.CLIENT_URL
        ].filter(Boolean);

        app.use(cors({
            origin: function (origin, callback) {
                if (!origin) return callback(null, true);
                if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
                    callback(null, true);
                } else {
                    console.log('⚠️ CORS blocked for origin:', origin);
                    if (process.env.NODE_ENV === 'development') {
                        callback(null, true);
                    } else {
                        callback(new Error('CORS not allowed'));
                    }
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
        }));

        // ✅ Logger
        if (process.env.NODE_ENV === 'development') {
            app.use(morgan('dev'));
        } else {
            app.use((req, res, next) => {
                console.log(`${req.method} ${req.path}`);
                next();
            });
        }

        // ✅ Create admin user after DB connection
        await createAdminUser();

        // ==================== AUTH ROUTES ====================

        app.post('/api/auth/register', async (req, res) => {
            try {
                const { name, email, password } = req.body;

                if (!name || !email || !password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide all required fields'
                    });
                }

                if (password.length < 6) {
                    return res.status(400).json({
                        success: false,
                        message: 'Password must be at least 6 characters'
                    });
                }

                const existingUser = await User.findOne({ email: email.toLowerCase() });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'User already exists with this email'
                    });
                }

                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const user = new User({
                    name,
                    fullName: name,
                    email: email.toLowerCase(),
                    password: hashedPassword,
                    role: 'user',
                    isActive: true,
                    isEmailVerified: false
                });

                await user.save();

                const token = jwt.sign(
                    { id: user._id, email: user.email, role: user.role },
                    process.env.JWT_SECRET || 'default_secret_key_change_this',
                    { expiresIn: '7d' }
                );

                res.status(201).json({
                    success: true,
                    message: 'User registered successfully',
                    token,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role
                    }
                });
            } catch (error) {
                console.error('Registration error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Server error during registration'
                });
            }
        });

        app.post('/api/auth/login', async (req, res) => {
            try {
                const { email, password } = req.body;

                if (!email || !password) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide email and password'
                    });
                }

                const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                if (!user.isActive) {
                    return res.status(401).json({
                        success: false,
                        message: 'Account is disabled. Please contact admin.'
                    });
                }

                const token = jwt.sign(
                    { id: user._id, email: user.email, role: user.role },
                    process.env.JWT_SECRET || 'default_secret_key_change_this',
                    { expiresIn: '7d' }
                );

                res.json({
                    success: true,
                    message: 'Login successful',
                    token,
                    user: {
                        id: user._id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        isActive: user.isActive,
                        isEmailVerified: user.isEmailVerified,
                        avatar: user.avatar || user.profileImage,
                        title: user.title
                    }
                });
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Server error during login'
                });
            }
        });

        app.get('/api/auth/me', authMiddleware, async (req, res) => {
            res.json({
                success: true,
                user: req.user
            });
        });

        // ==================== USER PROFILE ROUTES ====================

        // Get current user profile
        // Get current user profile
        app.get('/api/users/profile', authMiddleware, async (req, res) => {
            try {
                const user = await User.findById(req.user._id).select('-password');

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Format the response to match frontend expectations
                const profileData = {
                    id: user._id,
                    name: user.name || user.fullName || '',
                    fullName: user.fullName || user.name || '',
                    username: user.username || user.email.split('@')[0],
                    title: user.title || 'Filmmaker',
                    bio: user.bio || '',
                    location: user.location || '',
                    email: user.email,
                    phone: user.phone || '',
                    website: user.website || '',
                    joined: user.createdAt,
                    avatar: user.avatar || user.profileImage || '',
                    coverPhoto: user.coverPhoto || '',
                    socials: user.socialMedia || {
                        twitter: '',
                        facebook: '',
                        linkedin: '',
                        instagram: '',
                        vimeo: '',
                        github: '',
                        youtube: ''
                    },
                    skills: user.skills || [],
                    experience: (user.experience || []).map(exp => ({
                        title: exp.title || '',
                        company: exp.company || '',
                        period: exp.period || '',
                        description: exp.description || ''
                    })),
                    education: user.education || [],
                    stats: user.stats || {
                        projects: 0,
                        submissions: 0,
                        selections: 0,
                        awards: 0,
                        followers: 0,
                        following: 0
                    }
                };

                res.json({
                    success: true,
                    data: profileData,
                    user: profileData
                });
            } catch (error) {
                console.error('Get profile error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching profile'
                });
            }
        });

        // Update current user profile
        app.put('/api/users/profile', authMiddleware, async (req, res) => {
            console.log('\n=== PROFILE UPDATE REQUEST ===');
            console.log('User ID:', req.user?._id);
            console.log('User Email:', req.user?.email);
            console.log('Request headers:', req.headers);
            console.log('Request body keys:', Object.keys(req.body));
            console.log('Full request body:', JSON.stringify(req.body, null, 2));

            try {
                // First, get the current user
                const currentUser = await User.findById(req.user._id);

                if (!currentUser) {
                    console.log('User not found in database');
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                console.log('Current user found:', currentUser.email);

                const updates = req.body;
                const updateData = { updatedAt: Date.now() };

                // Map frontend fields to backend schema
                const fieldMappings = ['fullName', 'name', 'username', 'title', 'bio', 'location', 'email', 'phone', 'website'];
                fieldMappings.forEach(field => {
                    if (updates[field] !== undefined) {
                        updateData[field] = updates[field];
                        console.log(`Updating ${field}:`, updates[field]);
                    }
                });

                // Handle skills separately
                if (updates.skills !== undefined) {
                    updateData.skills = Array.isArray(updates.skills) ? updates.skills : [];
                    console.log('Updating skills:', updateData.skills);
                }

                // Handle experience separately
                if (updates.experience !== undefined) {
                    updateData.experience = Array.isArray(updates.experience) ? updates.experience : [];
                    console.log('Updating experience count:', updateData.experience.length);
                }

                // Handle socials
                if (updates.socials) {
                    updateData.socialMedia = updates.socials;
                    console.log('Updating social media:', Object.keys(updates.socials));
                }
                if (updates.socialMedia) {
                    updateData.socialMedia = updates.socialMedia;
                    console.log('Updating social media from socialMedia field');
                }

                // Handle images (only log, don't log full base64)
                if (updates.avatar && updates.avatar.startsWith('data:image')) {
                    updateData.avatar = updates.avatar;
                    updateData.profileImage = updates.avatar;
                    console.log('Updating avatar image (base64 length:', updates.avatar.length, ')');
                }
                if (updates.profileImage && updates.profileImage.startsWith('data:image')) {
                    updateData.profileImage = updates.profileImage;
                    updateData.avatar = updates.profileImage;
                    console.log('Updating profileImage (base64 length:', updates.profileImage.length, ')');
                }
                if (updates.coverPhoto && updates.coverPhoto.startsWith('data:image')) {
                    updateData.coverPhoto = updates.coverPhoto;
                    console.log('Updating coverPhoto (base64 length:', updates.coverPhoto.length, ')');
                }

                // Handle stats
                if (updates.stats) {
                    updateData.stats = {
                        projects: currentUser.stats?.projects || 0,
                        submissions: currentUser.stats?.submissions || 0,
                        selections: currentUser.stats?.selections || 0,
                        awards: currentUser.stats?.awards || 0,
                        followers: currentUser.stats?.followers || 0,
                        following: currentUser.stats?.following || 0,
                        views: currentUser.stats?.views || 0,
                        ...updates.stats
                    };
                    console.log('Updating stats:', updateData.stats);
                }

                // Handle password change
                if (updates.password && updates.password.trim() !== '') {
                    if (updates.password.length < 6) {
                        console.log('Password too short');
                        return res.status(400).json({
                            success: false,
                            message: 'Password must be at least 6 characters'
                        });
                    }
                    const salt = await bcrypt.genSalt(10);
                    updateData.password = await bcrypt.hash(updates.password, salt);
                    updateData.passwordChangedAt = Date.now();
                    console.log('Password updated');
                }

                // Remove undefined fields
                Object.keys(updateData).forEach(key => {
                    if (updateData[key] === undefined) {
                        delete updateData[key];
                    }
                });

                console.log('Final update data keys:', Object.keys(updateData));

                const user = await User.findByIdAndUpdate(
                    req.user._id,
                    updateData,
                    { new: true, runValidators: true }
                ).select('-password');

                if (!user) {
                    console.log('Failed to update user');
                    return res.status(404).json({
                        success: false,
                        message: 'User not found after update'
                    });
                }

                console.log('User updated successfully:', user.email);

                // Format response
                const profileData = {
                    id: user._id,
                    name: user.name || user.fullName || '',
                    fullName: user.fullName || user.name || '',
                    username: user.username,
                    title: user.title,
                    bio: user.bio,
                    location: user.location,
                    email: user.email,
                    phone: user.phone,
                    website: user.website,
                    avatar: user.avatar || user.profileImage || '',
                    coverPhoto: user.coverPhoto || '',
                    socials: user.socialMedia || {},
                    skills: user.skills || [],
                    experience: user.experience || [],
                    education: user.education || [],
                    stats: user.stats || {
                        projects: 0,
                        submissions: 0,
                        selections: 0,
                        awards: 0
                    },
                    joined: user.createdAt
                };

                console.log('Sending success response');

                res.json({
                    success: true,
                    message: 'Profile updated successfully',
                    user: profileData,
                    data: profileData
                });

            } catch (error) {
                console.error('=== UPDATE PROFILE ERROR ===');
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);

                res.status(500).json({
                    success: false,
                    message: error.message || 'Error updating profile',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Get user by ID (for viewing other profiles)
        app.get('/api/users/:id', authMiddleware, async (req, res) => {
            try {
                const user = await User.findById(req.params.id)
                    .select('-password -emailVerificationToken -passwordResetToken -twoFactorSecret -loginAttempts -lockUntil');

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Check privacy settings
                const isOwner = req.user && req.user._id.toString() === user._id.toString();
                const isAdmin = req.user && req.user.role === 'admin';

                let profileData = {
                    id: user._id,
                    name: user.name || user.fullName,
                    username: user.username,
                    title: user.title,
                    bio: user.bio,
                    avatar: user.avatar || user.profileImage,
                    coverPhoto: user.coverPhoto,
                    skills: user.skills,
                    stats: user.stats,
                    joined: user.createdAt
                };

                // Only show contact info if profile is public or viewer is owner/admin
                if (isOwner || isAdmin || user.preferences?.privacy?.profileVisibility === 'public') {
                    profileData = {
                        ...profileData,
                        email: user.email,
                        location: user.location,
                        website: user.website,
                        socials: user.socialMedia,
                        experience: user.experience,
                        education: user.education
                    };
                }

                res.json({
                    success: true,
                    user: profileData
                });
            } catch (error) {
                console.error('Get user by ID error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching user'
                });
            }
        });

        // ==================== PROJECT ROUTES ====================

        // Get user's own projects
        app.get('/api/projects/user/list', authMiddleware, async (req, res) => {
            try {
                const projects = await Project.find({ submittedBy: req.user._id }).sort({ createdAt: -1 });
                res.json({ success: true, count: projects.length, projects });
            } catch (error) {
                console.error('Get user projects error:', error);
                res.status(500).json({ success: false, message: 'Error fetching your projects' });
            }
        });

        // Get all projects (public)
        app.get('/api/projects', async (req, res) => {
            try {
                const { status, category, page = 1, limit = 10 } = req.query;
                const query = {};
                if (status) query.status = status;
                if (category) query.category = category;

                const projects = await Project.find(query)
                    .populate('submittedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit);

                const total = await Project.countDocuments(query);

                res.json({
                    success: true,
                    projects,
                    totalPages: Math.ceil(total / limit),
                    currentPage: parseInt(page),
                    total
                });
            } catch (error) {
                console.error('Get projects error:', error);
                res.status(500).json({ success: false, message: 'Error fetching projects' });
            }
        });

        // Create new project
        app.post('/api/projects', authMiddleware, async (req, res) => {
            try {
                let title, description, category, director;

                if (req.body.projectTitle) {
                    title = req.body.projectTitle;
                    description = req.body.briefSynopsis;
                    category = req.body.projectType;
                    if (req.body.directors && req.body.directors.length > 0) {
                        const firstDirector = req.body.directors[0];
                        director = `${firstDirector.firstName || ''} ${firstDirector.lastName || ''}`.trim();
                    }
                    if (!director) director = req.body.director || 'Not specified';
                } else {
                    title = req.body.title;
                    description = req.body.description;
                    category = req.body.category;
                    director = req.body.director;
                }

                if (!title || !description || !category || !director) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide title, description, category, and director'
                    });
                }

                const project = new Project({
                    title, description, category, director,
                    hasNonEnglishTitle: req.body.hasNonEnglishTitle || false,
                    nonEnglishTitle: req.body.nonEnglishTitle || '',
                    nonEnglishSynopsis: req.body.nonEnglishSynopsis || '',
                    website: req.body.website || '',
                    twitter: req.body.twitter || '',
                    facebook: req.body.facebook || '',
                    instagram: req.body.instagram || '',
                    submitterEmail: req.body.email || '',
                    submitterPhone: req.body.phone || '',
                    submitterAddress: req.body.address || '',
                    submitterCity: req.body.city || '',
                    submitterStateProvince: req.body.stateProvince || '',
                    submitterPostalCode: req.body.postalCode || '',
                    submitterCountry: req.body.country || '',
                    submitterBirthDate: req.body.birthDate || '',
                    submitterGender: req.body.gender || '',
                    submitterPronouns: req.body.pronouns || '',
                    directors: req.body.directors || [],
                    writers: req.body.writers || [],
                    producers: req.body.producers || [],
                    keyCast: req.body.keyCast || [],
                    projectTypes: req.body.projectTypes || [],
                    genres: req.body.genres || '',
                    runtimeHours: req.body.runtimeHours || '00',
                    runtimeMinutes: req.body.runtimeMinutes || '00',
                    runtimeSeconds: req.body.runtimeSeconds || '00',
                    completionDate: req.body.completionDate || '',
                    productionBudget: req.body.productionBudget || '',
                    countryOfOrigin: req.body.countryOfOrigin || '',
                    countryOfFilming: req.body.countryOfFilming || '',
                    language: req.body.language || 'en',
                    shootingFormat: req.body.shootingFormat || '',
                    aspectRatio: req.body.aspectRatio || '16:9',
                    filmColor: req.body.filmColor || 'Color',
                    studentProject: req.body.studentProject || 'No',
                    firstTimeFilmmaker: req.body.firstTimeFilmmaker || 'No',
                    screenings: req.body.screenings || [],
                    distributors: req.body.distributors || [],
                    paymentIntentId: req.body.paymentIntentId || '',
                    submittedAt: req.body.submittedAt || new Date().toISOString(),
                    submittedBy: req.user._id,
                    status: 'pending'
                });

                await project.save();

                res.status(201).json({
                    success: true,
                    message: 'Project submitted successfully',
                    project
                });
            } catch (error) {
                console.error('Create project error:', error);
                res.status(500).json({ success: false, message: 'Error creating project submission' });
            }
        });

        // ==================== HEALTH ROUTES ====================

        app.get('/', (req, res) => {
            res.status(200).json({
                success: true,
                message: 'Film Festival API is running...',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                endpoints: {
                    auth: {
                        register: 'POST /api/auth/register',
                        login: 'POST /api/auth/login',
                        me: 'GET /api/auth/me'
                    },
                    users: {
                        profile: 'GET /api/users/profile',
                        updateProfile: 'PUT /api/users/profile',
                        getUserById: 'GET /api/users/:id'
                    },
                    projects: {
                        list: 'GET /api/projects',
                        userList: 'GET /api/projects/user/list',
                        create: 'POST /api/projects'
                    }
                }
            });
        });

        app.get('/health', (req, res) => {
            const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
            res.status(200).json({
                success: true,
                status: 'OK',
                timestamp: new Date().toISOString(),
                mongodb: { status: dbStatus }
            });
        });

        // ==================== ERROR HANDLERS ====================

        app.use((req, res) => {
            res.status(404).json({
                success: false,
                message: `Cannot ${req.method} ${req.url}`,
                error: 'Route not found'
            });
        });

        app.use((err, req, res, next) => {
            console.error('❌ Error:', err.message);
            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });

        // Start server
        const PORT = process.env.PORT || 5000;

        const server = app.listen(PORT, () => {
            console.log('\n========================================');
            console.log(`✅ Server started successfully!`);
            console.log(`🚀 Running on port ${PORT}`);
            console.log(`📡 Local URL: http://localhost:${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${mongoose.connection.name || 'connected'}`);
            console.log(`✅ User profile routes available at /api/users/profile`);
            console.log('========================================\n');
        });

        const gracefulShutdown = () => {
            console.log('\n⚠️ Received shutdown signal, closing gracefully...');
            server.close(() => {
                console.log('HTTP server closed');
                mongoose.connection.close(false, () => {
                    console.log('MongoDB connection closed');
                    process.exit(0);
                });
            });
        };

        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// 🚀 Start the server
startServer();