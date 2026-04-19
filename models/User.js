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
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true,
        lowercase: true,
        trim: true
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
        type: String,
        trim: true
    }],
    experience: [{
        title: { type: String, trim: true },
        company: { type: String, trim: true },
        location: { type: String, trim: true },
        period: { type: String, trim: true },
        startDate: { type: Date },
        endDate: { type: Date },
        current: { type: Boolean, default: false },
        description: { type: String, trim: true }
    }],
    education: [{
        degree: { type: String, trim: true },
        institution: { type: String, trim: true },
        location: { type: String, trim: true },
        year: { type: String, trim: true },
        startYear: { type: Number },
        endYear: { type: Number },
        description: { type: String, trim: true }
    }],
    
    // Statistics
    stats: {
        projects: { type: Number, default: 0, min: 0 },
        submissions: { type: Number, default: 0, min: 0 },
        selections: { type: Number, default: 0, min: 0 },
        awards: { type: Number, default: 0, min: 0 },
        followers: { type: Number, default: 0, min: 0 },
        following: { type: Number, default: 0, min: 0 },
        views: { type: Number, default: 0, min: 0 }
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
        language: { 
            type: String, 
            enum: ['en', 'bn', 'hi', 'ar', 'es', 'fr', 'de', 'zh'], 
            default: 'en' 
        },
        timezone: { type: String, default: 'Asia/Dhaka' },
        dateFormat: { 
            type: String, 
            enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], 
            default: 'DD/MM/YYYY' 
        },
        theme: { 
            type: String, 
            enum: ['light', 'dark', 'system'], 
            default: 'light' 
        },
        privacy: {
            profileVisibility: { 
                type: String, 
                enum: ['public', 'private', 'connections'], 
                default: 'public' 
            },
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
        default: 0,
        min: 0
    },
    lockUntil: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'stats.projects': -1 });
userSchema.index({ 'stats.followers': -1 });

// Compound indexes
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1, isActive: 1 });

// REMOVED: Virtual for fullName (already exists as real field)
// Instead, create a virtual for displayName
userSchema.virtual('displayName').get(function() {
    if (this.fullName) return this.fullName;
    if (this.name) return this.name;
    if (this.firstName && this.lastName) return `${this.firstName} ${this.lastName}`;
    return this.email.split('@')[0];
});

// Virtual for full address (no conflict)
userSchema.virtual('fullAddress').get(function() {
    const parts = [];
    if (this.address.street) parts.push(this.address.street);
    if (this.address.apartment) parts.push(this.address.apartment);
    if (this.address.city) parts.push(this.address.city);
    if (this.address.state) parts.push(this.address.state);
    if (this.address.zipCode) parts.push(this.address.zipCode);
    if (this.address.country) parts.push(this.address.country);
    return parts.join(', ');
});

// Virtual for age (no conflict)
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

// Virtual for profile completion percentage (no conflict)
userSchema.virtual('profileCompletion').get(function() {
    let completed = 0;
    const total = 15;
    
    if (this.name) completed++;
    if (this.title) completed++;
    if (this.bio) completed++;
    if (this.location) completed++;
    if (this.phone) completed++;
    if (this.website) completed++;
    if (this.profileImage) completed++;
    if (this.coverPhoto) completed++;
    if (this.skills && this.skills.length > 0) completed++;
    if (this.experience && this.experience.length > 0) completed++;
    if (this.education && this.education.length > 0) completed++;
    if (this.socialMedia && Object.values(this.socialMedia).some(v => v)) completed++;
    if (this.address.city) completed++;
    if (this.birthdate) completed++;
    if (this.gender !== 'Other') completed++;
    
    return Math.round((completed / total) * 100);
});

// Method to check if account is locked
userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incrementLoginAttempts = async function() {
    if (this.lockUntil && this.lockUntil < Date.now()) {
        await this.updateOne({
            $set: { loginAttempts: 1 },
            $unset: { lockUntil: 1 }
        });
    } else {
        const updates = { $inc: { loginAttempts: 1 } };
        if (this.loginAttempts + 1 >= 5) {
            updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
        }
        await this.updateOne(updates);
    }
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = async function() {
    await this.updateOne({
        $set: { loginAttempts: 0 },
        $unset: { lockUntil: 1 }
    });
};

// Method to update last login
userSchema.methods.updateLastLogin = async function(ip) {
    this.lastLogin = new Date();
    this.lastLoginIP = ip;
    await this.save();
};

// Method to increment stats
userSchema.methods.incrementStat = async function(statName, value = 1) {
    if (this.stats[statName] !== undefined) {
        this.stats[statName] += value;
        await this.save();
    }
};

// Method to add skill
userSchema.methods.addSkill = async function(skill) {
    if (!this.skills.includes(skill)) {
        this.skills.push(skill);
        await this.save();
    }
};

// Method to remove skill
userSchema.methods.removeSkill = async function(skill) {
    this.skills = this.skills.filter(s => s !== skill);
    await this.save();
};

// Method to add experience
userSchema.methods.addExperience = async function(experience) {
    this.experience.push(experience);
    await this.save();
};

// Method to remove experience
userSchema.methods.removeExperience = async function(index) {
    this.experience.splice(index, 1);
    await this.save();
};

// Pre-save middleware
userSchema.pre('save', function(next) {
    // Ensure name is set if fullName is provided
    if (this.fullName && !this.name) {
        this.name = this.fullName;
    }
    
    // Ensure username is set if not provided
    if (!this.username && this.email) {
        this.username = this.email.split('@')[0];
    }
    
    // Ensure stats object has all required fields with default values
    const defaultStats = {
        projects: 0,
        submissions: 0,
        selections: 0,
        awards: 0,
        followers: 0,
        following: 0,
        views: 0
    };
    this.stats = { ...defaultStats, ...this.stats };
    
    // next();
});

// Pre-update middleware
userSchema.pre('findOneAndUpdate', function(next) {
    this.set({ updatedAt: new Date() });
    // next();
});

module.exports = mongoose.model('User', userSchema);