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

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️ MongoDB disconnected, attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

        return true;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);

        if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
            console.log('\n🔧 FIX: DNS or Network issue detected');
            console.log('👉 Add 0.0.0.0/0 to MongoDB Atlas IP whitelist');
            console.log('👉 Or use standard connection string instead of SRV:\n');
            console.log('MONGODB_URI=mongodb://szamansaju_db_user:3FwWOBZdE1AMCQ8z@cluster0.ozzefdt.mongodb.net:27017/filmHhub?retryWrites=true&w=majority&ssl=true&authSource=admin');
        } else if (error.message.includes('Authentication failed')) {
            console.log('\n🔧 FIX: Wrong username or password');
            console.log('👉 Check your MongoDB credentials\n');
        }

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

// ✅ Define Schemas
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Project Schema (for user projects)
const projectSchema = new mongoose.Schema({
    // Basic fields
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

// ✅ Register models
const User = mongoose.models.User || mongoose.model('User', userSchema);
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
            console.log('💡 Troubleshooting:');
            console.log('   1. Go to MongoDB Atlas → Network Access');
            console.log('   2. Add IP: 0.0.0.0/0');
            console.log('   3. Verify username/password in connection string');
            console.log('   4. Check if database user has proper permissions\n');
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
            'https://films-hub.vercel.app',
            'https://skyblue-armadillo-710430.hostingersite.com',
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

                const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const user = new User({
                    name,
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
                    { expiresIn: process.env.JWT_EXPIRE || '7d' }
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
                    message: 'Server error during registration',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

                const user = await User.findOne({ email: email.toLowerCase() });
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
                    { expiresIn: process.env.JWT_EXPIRE || '7d' }
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
                        isEmailVerified: user.isEmailVerified
                    }
                });
            } catch (error) {
                console.error('Login error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Server error during login',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        app.get('/api/auth/me', authMiddleware, async (req, res) => {
            res.json({
                success: true,
                user: req.user
            });
        });

        // ==================== PAYMENT ROUTES ====================

        // Create Payment Intent endpoint
        // Add this after your other routes and before the 404 handler
        // ==================== PAYMENT ROUTES ====================

        app.post('/api/payments/create-payment-intent', authMiddleware, async (req, res) => {
            try {
                const { amount = 2500, currency = 'usd' } = req.body; // 2500 cents = $25.00

                console.log(`Creating payment intent for user ${req.user._id}: $${amount / 100} ${currency}`);

                // Check if Stripe secret key is configured
                if (!process.env.STRIPE_SECRET_KEY) {
                    console.warn('⚠️ STRIPE_SECRET_KEY not set. Using mock payment.');
                    // Return mock for testing
                    return res.json({
                        clientSecret: `mock_secret_${Date.now()}_${req.user._id}`,
                        mock: true
                    });
                }

                const Stripe = require('stripe');
                const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

                const paymentIntent = await stripe.paymentIntents.create({
                    amount: parseInt(amount),
                    currency: currency,
                    metadata: {
                        userId: req.user._id.toString(),
                        userEmail: req.user.email,
                        projectType: req.body.projectType || 'unknown'
                    },
                    automatic_payment_methods: {
                        enabled: true,
                    },
                });

                console.log(`✅ Payment intent created: ${paymentIntent.id}`);

                res.json({
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                    mock: false
                });

            } catch (error) {
                console.error('❌ Payment intent error:', error.message);

                // For development, return mock to allow testing
                if (process.env.NODE_ENV === 'development') {
                    console.log('⚠️ Using mock payment intent for development');
                    res.json({
                        clientSecret: `mock_secret_${Date.now()}_${req.user._id}`,
                        mock: true,
                        error: error.message
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        message: error.message || 'Failed to create payment intent'
                    });
                }
            }
        });

        // ==================== PROJECT ROUTES (ADDED FOR YOUR FRONTEND) ====================

        // Get user's own projects (for /api/projects/user/list)
        app.get('/api/projects/user/list', authMiddleware, async (req, res) => {
            try {
                const projects = await Project.find({ submittedBy: req.user._id })
                    .sort({ createdAt: -1 });

                res.json({
                    success: true,
                    count: projects.length,
                    projects
                });
            } catch (error) {
                console.error('Get user projects error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching your projects'
                });
            }
        });

        // Get user's own projects (alias for /my-projects)
        app.get('/api/projects/my-projects', authMiddleware, async (req, res) => {
            try {
                const projects = await Project.find({ submittedBy: req.user._id })
                    .sort({ createdAt: -1 });

                res.json({
                    success: true,
                    count: projects.length,
                    projects
                });
            } catch (error) {
                console.error('Get my projects error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching your projects'
                });
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
                res.status(500).json({
                    success: false,
                    message: 'Error fetching projects'
                });
            }
        });

        // Get single project
        app.get('/api/projects/:id', async (req, res) => {
            try {
                const project = await Project.findById(req.params.id)
                    .populate('submittedBy', 'name email');

                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: 'Project not found'
                    });
                }

                res.json({
                    success: true,
                    project
                });
            } catch (error) {
                console.error('Get project error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching project'
                });
            }
        });

        // Create new project
        // In your backend server.js, replace the project creation endpoint
        app.post('/api/projects', authMiddleware, async (req, res) => {
            try {
                // Support both frontend and backend field names
                let title, description, category, director;

                // Check if using frontend format (projectTitle) or backend format (title)
                if (req.body.projectTitle) {
                    // Frontend format - Map all fields
                    title = req.body.projectTitle;
                    description = req.body.briefSynopsis;
                    category = req.body.projectType;

                    // Get director from the directors array if available
                    if (req.body.directors && req.body.directors.length > 0) {
                        const firstDirector = req.body.directors[0];
                        director = `${firstDirector.firstName || ''} ${firstDirector.lastName || ''}`.trim();
                    }
                    if (!director) director = req.body.director || 'Not specified';
                } else {
                    // Backend format
                    title = req.body.title;
                    description = req.body.description;
                    category = req.body.category;
                    director = req.body.director;
                }

                // Validation
                if (!title || !description || !category || !director) {
                    return res.status(400).json({
                        success: false,
                        message: 'Please provide title, description, category, and director'
                    });
                }

                // Create project with ALL fields from frontend
                const project = new Project({
                    // Basic required fields
                    title,
                    description,
                    category,
                    director,

                    // Step 1: Project Information
                    hasNonEnglishTitle: req.body.hasNonEnglishTitle || false,
                    nonEnglishTitle: req.body.nonEnglishTitle || '',
                    nonEnglishSynopsis: req.body.nonEnglishSynopsis || '',
                    website: req.body.website || '',
                    twitter: req.body.twitter || '',
                    facebook: req.body.facebook || '',
                    instagram: req.body.instagram || '',

                    // Step 2: Submitter Information
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

                    // Step 3: Credits
                    directors: req.body.directors || [],
                    writers: req.body.writers || [],
                    producers: req.body.producers || [],
                    keyCast: req.body.keyCast || [],

                    // Step 4: Specifications
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

                    // Step 5: Screenings
                    screenings: req.body.screenings || [],
                    distributors: req.body.distributors || [],

                    // Payment info
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
                res.status(500).json({
                    success: false,
                    message: 'Error creating project submission',
                    error: error.message
                });
            }
        });

        // Update project
        app.put('/api/projects/:id', authMiddleware, async (req, res) => {
            try {
                const project = await Project.findById(req.params.id);

                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: 'Project not found'
                    });
                }

                if (project.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only update your own projects'
                    });
                }

                const updates = req.body;
                updates.updatedAt = Date.now();

                const updatedProject = await Project.findByIdAndUpdate(
                    req.params.id,
                    updates,
                    { new: true, runValidators: true }
                );

                res.json({
                    success: true,
                    message: 'Project updated successfully',
                    project: updatedProject
                });
            } catch (error) {
                console.error('Update project error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error updating project'
                });
            }
        });

        // Delete project
        app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
            try {
                const project = await Project.findById(req.params.id);

                if (!project) {
                    return res.status(404).json({
                        success: false,
                        message: 'Project not found'
                    });
                }

                if (project.submittedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
                    return res.status(403).json({
                        success: false,
                        message: 'You can only delete your own projects'
                    });
                }

                await Project.findByIdAndDelete(req.params.id);

                res.json({
                    success: true,
                    message: 'Project deleted successfully'
                });
            } catch (error) {
                console.error('Delete project error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error deleting project'
                });
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
                    health: 'GET /health',
                    auth: {
                        register: 'POST /api/auth/register',
                        login: 'POST /api/auth/login',
                        me: 'GET /api/auth/me'
                    },
                    projects: {
                        list: 'GET /api/projects',
                        userList: 'GET /api/projects/user/list',
                        myProjects: 'GET /api/projects/my-projects',
                        create: 'POST /api/projects',
                        getOne: 'GET /api/projects/:id',
                        update: 'PUT /api/projects/:id',
                        delete: 'DELETE /api/projects/:id'
                    },
                    films: {
                        list: 'GET /api/films',
                        create: 'POST /api/films',
                        getOne: 'GET /api/films/:id',
                        update: 'PUT /api/films/:id',
                        delete: 'DELETE /api/films/:id'
                    }
                }
            });
        });

        app.get('/health', (req, res) => {
            const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
            const dbReadyState = {
                0: 'disconnected',
                1: 'connected',
                2: 'connecting',
                3: 'disconnecting'
            };

            res.status(200).json({
                success: true,
                status: 'OK',
                timestamp: new Date().toISOString(),
                mongodb: {
                    status: dbStatus,
                    readyState: dbReadyState[mongoose.connection.readyState] || 'unknown',
                    host: mongoose.connection.host || 'unknown',
                    database: mongoose.connection.name || 'unknown'
                },
                uptime: process.uptime(),
                environment: process.env.NODE_ENV || 'development',
                memory: process.memoryUsage(),
                nodeVersion: process.version
            });
        });

        // ==================== FILM ROUTES ====================

        app.get('/api/films', async (req, res) => {
            try {
                const { status, genre, page = 1, limit = 10 } = req.query;
                const query = {};

                if (status) query.submissionStatus = status;
                if (genre) query.genre = genre;

                const films = await Film.find(query)
                    .populate('submittedBy', 'name email')
                    .sort({ createdAt: -1 })
                    .limit(limit * 1)
                    .skip((page - 1) * limit);

                const total = await Film.countDocuments(query);

                res.json({
                    success: true,
                    films,
                    totalPages: Math.ceil(total / limit),
                    currentPage: page,
                    total
                });
            } catch (error) {
                console.error('Get films error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching films'
                });
            }
        });

        app.post('/api/films', async (req, res) => {
            try {
                const { title, director, year, duration, genre, description, posterUrl, trailerUrl } = req.body;

                const token = req.headers.authorization?.split(' ')[1];
                let userId = null;

                if (token) {
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret_key_change_this');
                        userId = decoded.id;
                    } catch (e) {
                        // Invalid token, continue without user
                    }
                }

                const film = new Film({
                    title,
                    director,
                    year,
                    duration,
                    genre,
                    description,
                    posterUrl,
                    trailerUrl,
                    submittedBy: userId,
                    submissionStatus: 'pending'
                });

                await film.save();

                res.status(201).json({
                    success: true,
                    message: 'Film submitted successfully',
                    film
                });
            } catch (error) {
                console.error('Create film error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error creating film submission'
                });
            }
        });

        app.get('/api/films/:id', async (req, res) => {
            try {
                const film = await Film.findById(req.params.id).populate('submittedBy', 'name email');

                if (!film) {
                    return res.status(404).json({
                        success: false,
                        message: 'Film not found'
                    });
                }

                res.json({
                    success: true,
                    film
                });
            } catch (error) {
                console.error('Get film error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error fetching film'
                });
            }
        });

        app.put('/api/films/:id', async (req, res) => {
            try {
                const updates = req.body;
                updates.updatedAt = Date.now();

                const film = await Film.findByIdAndUpdate(
                    req.params.id,
                    updates,
                    { new: true, runValidators: true }
                );

                if (!film) {
                    return res.status(404).json({
                        success: false,
                        message: 'Film not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Film updated successfully',
                    film
                });
            } catch (error) {
                console.error('Update film error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error updating film'
                });
            }
        });

        app.delete('/api/films/:id', async (req, res) => {
            try {
                const film = await Film.findByIdAndDelete(req.params.id);

                if (!film) {
                    return res.status(404).json({
                        success: false,
                        message: 'Film not found'
                    });
                }

                res.json({
                    success: true,
                    message: 'Film deleted successfully'
                });
            } catch (error) {
                console.error('Delete film error:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error deleting film'
                });
            }
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
            console.error(err.stack);

            res.status(err.status || 500).json({
                success: false,
                message: err.message || 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong'
            });
        });

        // Start server
        const PORT = process.env.PORT || 5000;

        const server = app.listen(PORT, () => {
            console.log('\n========================================');
            console.log(`✅ Server started successfully!`);
            console.log(`🚀 Running on port ${PORT}`);
            console.log(`📡 Local URL: http://localhost:${PORT}`);
            console.log(`🔗 CORS enabled for: ${allowedOrigins.join(', ')}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`💾 Database: ${mongoose.connection.name || 'connected'}`);
            console.log(`📚 API Documentation: http://localhost:${PORT}`);
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

        process.on('unhandledRejection', (err) => {
            console.error('❌ Unhandled Rejection:', err);
            gracefulShutdown();
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

// 🚀 Start the server
startServer();