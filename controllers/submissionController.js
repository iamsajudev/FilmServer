const Project = require('../models/Project');

// @desc    Submit project
// @route   POST /api/projects/submit
// @access  Private
const submitProject = async (req, res) => {
    try {
        const submissionData = req.body;
        
        // Validate required fields
        const requiredFields = ['projectTitle', 'projectType', 'email'];
        for (const field of requiredFields) {
            if (!submissionData[field]) {
                return res.status(400).json({
                    success: false,
                    message: `Missing required field: ${field}`
                });
            }
        }
        
        // Create project record
        const project = new Project({
            projectTitle: submissionData.projectTitle,
            projectType: submissionData.projectType,
            briefSynopsis: submissionData.briefSynopsis,
            email: submissionData.email,
            phone: submissionData.phone,
            address: submissionData.address,
            city: submissionData.city,
            country: submissionData.country,
            directors: submissionData.directors || [],
            writers: submissionData.writers || [],
            producers: submissionData.producers || [],
            keyCast: submissionData.keyCast || [],
            projectTypes: submissionData.projectTypes || [],
            genres: submissionData.genres,
            runtimeHours: submissionData.runtimeHours,
            runtimeMinutes: submissionData.runtimeMinutes,
            runtimeSeconds: submissionData.runtimeSeconds,
            completionDate: submissionData.completionDate,
            language: submissionData.language,
            shootingFormat: submissionData.shootingFormat,
            aspectRatio: submissionData.aspectRatio,
            screenings: submissionData.screenings || [],
            distributors: submissionData.distributors || [],
            paymentIntentId: submissionData.paymentIntentId,
            userId: req.user._id,  // ✅ Make sure this is set
            submissionStatus: 'pending',
            status: 'pending',
            submittedAt: new Date()
        });
        
        await project.save();
        
        res.status(201).json({
            success: true,
            message: 'Project submitted successfully',
            data: project
        });
        
    } catch (error) {
        console.error('Submit project error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Server error'
        });
    }
};

module.exports = {
    submitProject
};