const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    fullName: {
        type: String,
        trim: true
    },
    firstName: {
        type: String,
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    username: {
        type: String,
        unique: true,  // Keep only this one
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,  // Keep only this one
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    
    // Profile Information
    title: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    phone: {
        type: String,
        default: ''
    },
    website: {
        type: String,
        default: ''
    },
    
    // Personal Information
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
        default: 'Other'
    },
    pronouns: {
        type: String,
        enum: ['He/Him', 'She/Her', 'They/Them', 'Custom'],
        default: 'Custom'
    },
    customPronouns: {
        type: String,
        default: ''
    },
    birthdate: {
        type: Date,
        default: null
    },
    
    // Preferences
    timezone: {
        type: String,
        default: '(GMT+06:00) Dhaka Time'
    },
    currency: {
        type: String,
        enum: ['USD', 'BDT', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY', 'CNY'],
        default: 'BDT'
    },
    
    // Images
    profileImage: {
        type: String,
        default: null
    },
    avatar: {
        type: String,
        default: null
    },
    coverPhoto: {
        type: String,
        default: null
    },
    
    // Role & Status
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        default: null
    },
    emailVerificationExpires: {
        type: Date,
        default: null
    },
    
    // Social Media
    socialMedia: {
        twitter: { type: String, default: '' },
        facebook: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        instagram: { type: String, default: '' },
        vimeo: { type: String, default: '' },
        youtube: { type: String, default: '' },
        github: { type: String, default: '' }
    },
    
    // Skills & Experience
    skills: [{
        type: String
    }],
    experience: [{
        title: { type: String },
        company: { type: String },
        location: { type: String },
        period: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String }
    }],
    education: [{
        degree: { type: String },
        institution: { type: String },
        location: { type: String },
        year: { type: String },
        startYear: { type: Number },
        endYear: { type: Number },
        description: { type: String }
    }],
    
    // Statistics
    stats: {
        projects: { type: Number, default: 0 },
        submissions: { type: Number, default: 0 },
        selections: { type: Number, default: 0 },
        awards: { type: Number, default: 0 },
        followers: { type: Number, default: 0 },
        following: { type: Number, default: 0 },
        views: { type: Number, default: 0 }
    },
    
    // Complete Address Information
    address: {
        street: { type: String, default: '' },
        apartment: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },
        country: { type: String, default: '' },
        coordinates: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null }
        }
    },
    
    // Billing Address
    billingAddress: {
        street: { type: String, default: '' },
        apartment: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zipCode: { type: String, default: '' },
        country: { type: String, default: '' }
    },
    
    // Professional Information
    company: { type: String, default: '' },
    position: { type: String, default: '' },
    department: { type: String, default: '' },
    workEmail: { type: String, default: '' },
    
    // Preferences
    preferences: {
        emailNotifications: { type: Boolean, default: true },
        pushNotifications: { type: Boolean, default: false },
        smsNotifications: { type: Boolean, default: false },
        marketingEmails: { type: Boolean, default: true },
        language: { type: String, enum: ['en', 'bn', 'hi', 'ar', 'es', 'fr', 'de', 'zh'], default: 'en' },
        timezone: { type: String, default: 'Asia/Dhaka' },
        dateFormat: { type: String, enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], default: 'DD/MM/YYYY' },
        theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
        privacy: {
            profileVisibility: { type: String, enum: ['public', 'private', 'connections'], default: 'public' },
            showEmail: { type: Boolean, default: false },
            showPhone: { type: Boolean, default: false },
            showLocation: { type: Boolean, default: true }
        }
    },
    
    // Portfolio Links
    portfolio: {
        website: { type: String, default: '' },
        behance: { type: String, default: '' },
        dribbble: { type: String, default: '' },
        github: { type: String, default: '' }
    },
    
    // Account Security
    twoFactorEnabled: {
        type: Boolean,
        default: false
    },
    twoFactorSecret: {
        type: String,
        default: null
    },
    lastLogin: {
        type: Date,
        default: null
    },
    lastLoginIP: {
        type: String,
        default: null
    },
    passwordChangedAt: {
        type: Date,
        default: null
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full address
userSchema.virtual('fullAddress').get(function() {
    const parts = [];
    if (this.address.street) parts.push(this.address.street);
    if (this.address.city) parts.push(this.address.city);
    if (this.address.state) parts.push(this.address.state);
    if (this.address.zipCode) parts.push(this.address.zipCode);
    if (this.address.country) parts.push(this.address.country);
    return parts.join(', ');
});

// Virtual for age
userSchema.virtual('age').get(function() {
    if (!this.birthdate) return null;
    const today = new Date();
    const birthDate = new Date(this.birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
});

// Method to check if account is locked
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    } else {
        const updates = { $inc: { loginAttempts: 1 } };
        if (this.loginAttempts + 1 >= 5) {
            updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // Lock for 2 hours
        }
        await this.updateOne(updates);
    }
};

module.exports = mongoose.model('User', userSchema);