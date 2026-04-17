const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    // ==================== STEP 1: PROJECT INFORMATION ====================
    projectType: {
        type: String,
        required: [true, 'Project type is required'],
        default: 'short_film'
    },
    projectTitle: {
        type: String,
        required: [true, 'Project title is required'],
        trim: true
    },
    briefSynopsis: {
        type: String,
        required: [true, 'Brief synopsis is required']
    },
    hasNonEnglishTitle: {
        type: Boolean,
        default: false
    },
    nonEnglishTitle: {
        type: String,
        default: ''
    },
    nonEnglishSynopsis: {
        type: String,
        default: ''
    },
    website: { type: String, default: '' },
    twitter: { type: String, default: '' },
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    
    // ==================== STEP 2: SUBMITTER INFORMATION ====================
    email: {
        type: String,
        required: [true, 'Submitter email is required'],
        lowercase: true
    },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    stateProvince: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    country: { type: String, default: '' },
    birthDate: { type: Date, default: null },
    gender: { type: String, default: '' },
    pronouns: { type: String, default: '' },
    
    // ==================== STEP 3: CREDITS ====================
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
    
    // ==================== STEP 4: TECHNICAL SPECIFICATIONS ====================
    projectTypes: [String],
    genres: { type: String, default: '' },
    runtimeHours: { type: String, default: '00' },
    runtimeMinutes: { type: String, default: '00' },
    runtimeSeconds: { type: String, default: '00' },
    completionDate: { type: Date, default: null },
    productionBudget: { type: String, default: '' },
    countryOfOrigin: { type: String, default: '' },
    countryOfFilming: { type: String, default: '' },
    language: { type: String, default: '' },
    shootingFormat: { type: String, default: '' },
    aspectRatio: { type: String, default: '16:9' },
    filmColor: { type: String, default: 'Color' },
    studentProject: { type: String, default: 'No' },
    firstTimeFilmmaker: { type: String, default: 'No' },
    
    // ==================== STEP 5: SCREENINGS & DISTRIBUTORS ====================
    screenings: [{
        festivalName: String,
        date: Date,
        venue: String,
        city: String,
        country: String,
        status: { type: String, default: 'pending' }
    }],
    distributors: [{
        company: String,
        contactName: String,
        email: String,
        phone: String,
        territory: String
    }],
    
    // ==================== STEP 6: PAYMENT ====================
    paymentIntentId: { type: String, default: '' },
    
    // ==================== SYSTEM FIELDS ====================
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    submissionStatus: {
        type: String,
        default: 'submitted'
    },
    adminNotes: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    submittedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    strict: false
});

// ==================== INDEXES ====================
projectSchema.index({ projectTitle: 'text', briefSynopsis: 'text' });
projectSchema.index({ userId: 1 });
projectSchema.index({ createdAt: -1 });

// ==================== NO MIDDLEWARE - REMOVED PRE-SAVE ====================

module.exports = mongoose.model('Project', projectSchema);