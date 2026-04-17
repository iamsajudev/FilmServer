const Project = require("../models/Project");
const mongoose = require("mongoose");

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    req.body.userId = req.user.id;

    // Generate slug if not provided
    if (req.body.title && !req.body.slug) {
      req.body.slug = req.body.title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    const project = await Project.create(req.body);

    res.status(201).json({
      success: true,
      data: project,
      message: "Project created successfully",
    });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all projects (with filters)
// @route   GET /api/projects
// @access  Public
const getAllProjects = async (req, res) => {
  try {
    const {
      category,
      genre,
      status,
      visibility,
      search,
      sort = "-createdAt",
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    // Apply filters
    if (category) query.category = category;
    if (genre) query.genre = { $in: [genre] };
    if (status) query.status = status;
    if (visibility) query.visibility = visibility;

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // If not admin, only show published/public projects
    if (!req.user || req.user.role !== "admin") {
      query.status = "published";
      query.visibility = "public";
    }

    // Pagination
    const skip = (page - 1) * limit;

    const projects = await Project.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name email");

    const total = await Project.countDocuments(query);

    res.status(200).json({
      success: true,
      count: projects.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: projects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get user's projects
// @route   GET /api/projects/user
// @access  Private
// In projectController.js
const getUserProjects = async (req, res) => {
  try {
    console.log("=== getUserProjects called ===");
    console.log("Request URL:", req.originalUrl);
    console.log("User ID:", req.user.id);

    // Validate user ID
    if (!req.user.id) {
      return res.status(400).json({
        success: false,
        message: "User ID not found",
      });
    }

    const projects = await Project.find({ userId: req.user.id }).sort(
      "-createdAt",
    );

    console.log(`Found ${projects.length} projects for user`);

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  } catch (error) {
    console.error("Get user projects error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Public
// In projectController.js - update getProjectById
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if the id is actually a route path
    if (
      id === "my-projects" ||
      id === "user" ||
      id === "list" ||
      id === "submit"
    ) {
      return res.status(404).json({
        success: false,
        message: "Invalid project ID",
      });
    }

    // Check if it's a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid project ID format",
      });
    }

    const project = await Project.findById(id).populate(
      "userId",
      "name email profileImage",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Increment views
    project.views += 1;
    await project.save();

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get project by slug
// @route   GET /api/projects/slug/:slug
// @access  Public
const getProjectBySlug = async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug }).populate(
      "userId",
      "name email profileImage",
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Increment views
    project.views += 1;
    await project.save();

    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Get project by slug error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Owner or Admin)
const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check ownership
    if (
      project.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this project",
      });
    }

    // Update slug if title changed
    if (req.body.title && req.body.title !== project.title) {
      req.body.slug = req.body.title
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: project,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Owner or Admin)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check ownership
    if (
      project.userId.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this project",
      });
    }

    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add review to project
// @route   POST /api/projects/:id/reviews
// @access  Private
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // Check if user already reviewed
    const alreadyReviewed = project.reviews.find(
      (review) => review.userId.toString() === req.user.id,
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You have already reviewed this project",
      });
    }

    const review = {
      userId: req.user.id,
      rating: Number(rating),
      comment,
    };

    project.reviews.push(review);

    // Update average rating
    project.totalReviews = project.reviews.length;
    project.averageRating =
      project.reviews.reduce((acc, item) => item.rating + acc, 0) /
      project.reviews.length;

    await project.save();

    res.status(201).json({
      success: true,
      data: project,
      message: "Review added successfully",
    });
  } catch (error) {
    console.error("Add review error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Submit project
// @route   POST /api/projects/submit
// @access  Private
const submitProject = async (req, res) => {
  try {
    console.log("=== New Project Submission ===");
    console.log("User ID:", req.user.id);

    const submissionData = req.body;

    // Create project with the exact structure from your form
    const projectData = {
      // Step 1: Project Information
      projectType: submissionData.projectType,
      projectTitle: submissionData.projectTitle,
      briefSynopsis: submissionData.briefSynopsis,
      hasNonEnglishTitle: submissionData.hasNonEnglishTitle || false,
      nonEnglishTitle: submissionData.nonEnglishTitle || "",
      nonEnglishSynopsis: submissionData.nonEnglishSynopsis || "",
      website: submissionData.website || "",
      twitter: submissionData.twitter || "",
      facebook: submissionData.facebook || "",
      instagram: submissionData.instagram || "",

      // Step 2: Submitter Information
      email: submissionData.email,
      phone: submissionData.phone || "",
      address: submissionData.address || "",
      city: submissionData.city || "",
      stateProvince: submissionData.stateProvince || "",
      postalCode: submissionData.postalCode || "",
      country: submissionData.country || "",
      birthDate: submissionData.birthDate || null,
      gender: submissionData.gender || "",
      pronouns: submissionData.pronouns || "",

      // Step 3: Credits
      directors: submissionData.directors || [],
      writers: submissionData.writers || [],
      producers: submissionData.producers || [],
      keyCast: submissionData.keyCast || [],

      // Step 4: Specifications
      projectTypes: submissionData.projectTypes || [],
      genres: submissionData.genres || "",
      runtimeHours: submissionData.runtimeHours || "00",
      runtimeMinutes: submissionData.runtimeMinutes || "00",
      runtimeSeconds: submissionData.runtimeSeconds || "00",
      completionDate: submissionData.completionDate || null,
      productionBudget: submissionData.productionBudget || "",
      countryOfOrigin: submissionData.countryOfOrigin || "",
      countryOfFilming: submissionData.countryOfFilming || "",
      language: submissionData.language || "",
      shootingFormat: submissionData.shootingFormat || "",
      aspectRatio: submissionData.aspectRatio || "16:9",
      filmColor: submissionData.filmColor || "Color",
      studentProject: submissionData.studentProject || "No",
      firstTimeFilmmaker: submissionData.firstTimeFilmmaker || "No",

      // Step 5: Screenings & Distributors
      screenings: submissionData.screenings || [],
      distributors: submissionData.distributors || [],

      // Step 6: Payment
      paymentIntentId: submissionData.paymentIntentId,

      // System fields
      userId: req.user.id,
      submissionStatus: "submitted",
      submittedAt: new Date(),
    };

    // Validate required fields
    if (!projectData.projectTitle) {
      return res.status(400).json({
        success: false,
        message: "Project title is required",
      });
    }

    if (!projectData.projectType) {
      return res.status(400).json({
        success: false,
        message: "Project type is required",
      });
    }

    if (!projectData.email) {
      return res.status(400).json({
        success: false,
        message: "Submitter email is required",
      });
    }

    // Save to database
    const project = new Project(projectData);
    await project.save();

    console.log("Project saved successfully with ID:", project._id);

    res.status(201).json({
      success: true,
      message: "Project submitted successfully",
      data: {
        id: project._id,
        projectTitle: project.projectTitle,
        submissionStatus: project.submissionStatus,
        submittedAt: project.submittedAt,
      },
    });
  } catch (error) {
    console.error("Submit project error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Server error while submitting project",
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getUserProjects,
  getProjectById,
  getProjectBySlug,
  updateProject,
  deleteProject,
  addReview,
  submitProject,
};
