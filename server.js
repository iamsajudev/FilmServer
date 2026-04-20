// ✅ VERY FIRST: Fix DNS issue for MongoDB Atlas (SRV)
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // Use Google DNS
dns.setDefaultResultOrder("ipv4first");

// ✅ Load environment variables
require("dotenv").config({ override: true });

// ✅ Debug: Check env variables
console.log("=== Environment Check ===");
console.log("PORT:", process.env.PORT);
console.log(
  "MONGODB_URI:",
  process.env.MONGODB_URI ? "✅ Defined" : "❌ Undefined"
);
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("CORS_ORIGIN:", process.env.CORS_ORIGIN);
console.log("CLIENT_URL:", process.env.CLIENT_URL);
console.log(
  "JWT_SECRET:",
  process.env.JWT_SECRET ? "✅ Defined" : "❌ Undefined"
);
console.log(
  "GMAIL_EMAIL:",
  process.env.GMAIL_EMAIL ? "✅ Defined" : "❌ Undefined"
);
console.log(
  "GMAIL_APP_PASSWORD:",
  process.env.GMAIL_APP_PASSWORD ? "✅ Defined" : "❌ Undefined"
);
console.log("========================\n");

// ✅ Imports
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ✅ Import models from models folder (NO NEED TO REDEFINE SCHEMAS!)
const User = require("./models/User");
const Project = require("./models/Project");
const Film = require("./models/Film");
const Submission = require("./models/Submission");

// ✅ Import Email Service
const emailService = require("./services/emailService");

// ✅ MongoDB Connection Function
const connectDB = async () => {
  try {
    console.log("📡 Connecting to MongoDB Atlas...");

    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    // Log masked URI for debugging
    const maskedURI = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    console.log("Connection string:", maskedURI);

    // Connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4
      retryWrites: true,
      w: "majority",
      maxPoolSize: 10,
      minPoolSize: 2,
      heartbeatFrequencyMS: 10000,
      connectTimeoutMS: 30000,
    };

    await mongoose.connect(mongoURI, options);

    console.log("✅ MongoDB Connected Successfully!");
    console.log("📊 Database:", mongoose.connection.db.databaseName);
    console.log("🔗 Host:", mongoose.connection.host);

    return true;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    return false;
  }
};

// ✅ Auth Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret_key_change_this"
    );
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// ✅ Admin Middleware
const adminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
};

// ✅ Create Admin User Function
const createAdminUser = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(
        process.env.ADMIN_PASSWORD || "Admin@123456",
        10
      );

      const adminUser = new User({
        name: process.env.ADMIN_NAME || "Super Admin",
        fullName: process.env.ADMIN_NAME || "Super Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        isActive: true,
        isEmailVerified: true,
      });

      await adminUser.save();
      console.log("✅ Admin user created successfully");
      console.log(`📧 Email: ${adminEmail}`);
      console.log(
        `🔑 Password: ${process.env.ADMIN_PASSWORD || "Admin@123456"}`
      );
    } else {
      console.log("✅ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }
};

// Helper function for time ago
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

// ==================== EMAIL FUNCTIONS ====================
async function sendConfirmationEmails(
  userEmail,
  userName,
  projectTitle,
  projectId
) {
  console.log("📧 SENDING EMAILS - Function called!");
  console.log("To:", userEmail, "Project:", projectTitle);

  try {
    // Send to user using template
    const userResult = await emailService.sendSubmissionConfirmation(
      userEmail,
      userName,
      projectTitle,
      projectId
    );

    // Send to admin if email is configured
    if (process.env.ADMIN_EMAIL) {
      const adminResult = await emailService.sendAdminNotification(
        process.env.ADMIN_EMAIL,
        userName,
        userEmail,
        projectTitle,
        projectId
      );
    }

    return true;
  } catch (error) {
    console.error("❌ Email error details:", error.message);
    return false;
  }
}

// ✅ Start server AFTER DB connection
const startServer = async () => {
  try {
    // 🔌 Connect DB first
    const isConnected = await connectDB();

    if (!isConnected) {
      console.error("\n❌ Failed to connect to database. Exiting...");
      process.exit(1);
    }

    const app = express();

    // ✅ Body parsers
    app.use(express.json({ limit: "10mb" }));
    app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // ✅ CORS configuration
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5000",
      "http://localhost:3001",
      "https://portal-nybff.vercel.app",
      "https://server.nybff.us",
      "https://portals.nybff.us",
      "https://portal.nybff.us",
      process.env.CORS_ORIGIN,
      process.env.CLIENT_URL,
    ].filter(Boolean);

    app.use(
      cors({
        origin: function (origin, callback) {
          if (!origin) return callback(null, true);
          if (
            allowedOrigins.indexOf(origin) !== -1 ||
            process.env.NODE_ENV !== "production"
          ) {
            callback(null, true);
          } else {
            console.log("⚠️ CORS blocked for origin:", origin);
            if (process.env.NODE_ENV === "development") {
              callback(null, true);
            } else {
              callback(new Error("CORS not allowed"));
            }
          }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );

    // ✅ Logger
    if (process.env.NODE_ENV === "development") {
      app.use(morgan("dev"));
    } else {
      app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }

    // ✅ Create admin user after DB connection
    await createAdminUser();

    // ==================== TEST EMAIL ROUTE (FOR POSTMAN) ====================
    app.post("/api/test-email", async (req, res) => {
      try {
        const { email, name } = req.body;

        if (!email) {
          return res.status(400).json({
            success: false,
            message: "Email is required",
          });
        }

        const testResult = await emailService.sendSubmissionConfirmation(
          email,
          name || "Test User",
          "Test Project",
          "TEST123456"
        );

        if (testResult) {
          res.json({
            success: true,
            message: "Test email sent successfully! Check your inbox.",
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Failed to send test email. Check Gmail credentials.",
          });
        }
      } catch (error) {
        console.error("Test email error:", error);
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // ==================== AUTH ROUTES ====================

    app.post("/api/auth/register", async (req, res) => {
      try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
          return res.status(400).json({
            success: false,
            message: "Please provide all required fields",
          });
        }

        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters",
          });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "User already exists with this email",
          });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
          name,
          fullName: name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "user",
          isActive: true,
          isEmailVerified: false,
        });

        await user.save();

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || "default_secret_key_change_this",
          { expiresIn: "7d" }
        );

        res.status(201).json({
          success: true,
          message: "User registered successfully",
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        });
      } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({
          success: false,
          message: "Server error during registration",
        });
      }
    });

    app.post("/api/auth/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: "Please provide email and password",
          });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select(
          "+password"
        );
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }

        if (!user.isActive) {
          return res.status(401).json({
            success: false,
            message: "Account is disabled. Please contact admin.",
          });
        }

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          process.env.JWT_SECRET || "default_secret_key_change_this",
          { expiresIn: "7d" }
        );

        res.json({
          success: true,
          message: "Login successful",
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar || user.profileImage,
            title: user.title,
          },
        });
      } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
          success: false,
          message: "Server error during login",
        });
      }
    });

    app.get("/api/auth/me", authMiddleware, async (req, res) => {
      res.json({
        success: true,
        user: req.user,
      });
    });

    // ==================== USER PROFILE ROUTES ====================

    app.get("/api/users/profile", authMiddleware, async (req, res) => {
      try {
        const user = await User.findById(req.user._id).select("-password");

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const profileData = {
          id: user._id,
          name: user.name || user.fullName || "",
          fullName: user.fullName || user.name || "",
          username: user.username || user.email.split("@")[0],
          title: user.title || "Filmmaker",
          bio: user.bio || "",
          location: user.location || "",
          email: user.email,
          phone: user.phone || "",
          website: user.website || "",
          joined: user.createdAt,
          avatar: user.avatar || user.profileImage || "",
          coverPhoto: user.coverPhoto || "",
          socials: user.socialMedia || {},
          skills: user.skills || [],
          experience: user.experience || [],
          education: user.education || [],
          stats: user.stats || {
            projects: 0,
            submissions: 0,
            selections: 0,
            awards: 0,
            followers: 0,
            following: 0,
          },
        };

        res.json({
          success: true,
          data: profileData,
          user: profileData,
        });
      } catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching profile",
        });
      }
    });

    app.put("/api/users/profile", authMiddleware, async (req, res) => {
      try {
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const updates = req.body;
        const updateData = { updatedAt: Date.now() };

        const fieldMappings = [
          "fullName",
          "name",
          "username",
          "title",
          "bio",
          "location",
          "email",
          "phone",
          "website",
        ];
        fieldMappings.forEach((field) => {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        });

        if (updates.skills !== undefined) {
          updateData.skills = Array.isArray(updates.skills)
            ? updates.skills
            : [];
        }

        if (updates.experience !== undefined) {
          updateData.experience = Array.isArray(updates.experience)
            ? updates.experience
            : [];
        }

        if (updates.socials) {
          updateData.socialMedia = updates.socials;
        }

        if (updates.avatar && updates.avatar.startsWith("data:image")) {
          updateData.avatar = updates.avatar;
          updateData.profileImage = updates.avatar;
        }

        if (updates.coverPhoto && updates.coverPhoto.startsWith("data:image")) {
          updateData.coverPhoto = updates.coverPhoto;
        }

        if (updates.password && updates.password.trim() !== "") {
          if (updates.password.length < 6) {
            return res.status(400).json({
              success: false,
              message: "Password must be at least 6 characters",
            });
          }
          const salt = await bcrypt.genSalt(10);
          updateData.password = await bcrypt.hash(updates.password, salt);
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, {
          new: true,
          runValidators: true,
        }).select("-password");

        const profileData = {
          id: user._id,
          name: user.name || user.fullName || "",
          fullName: user.fullName || user.name || "",
          username: user.username,
          title: user.title,
          bio: user.bio,
          location: user.location,
          email: user.email,
          phone: user.phone,
          website: user.website,
          avatar: user.avatar || user.profileImage || "",
          coverPhoto: user.coverPhoto || "",
          socials: user.socialMedia || {},
          skills: user.skills || [],
          experience: user.experience || [],
          education: user.education || [],
          stats: user.stats || {},
          joined: user.createdAt,
        };

        res.json({
          success: true,
          message: "Profile updated successfully",
          user: profileData,
          data: profileData,
        });
      } catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({
          success: false,
          message: error.message || "Error updating profile",
        });
      }
    });

    app.get("/api/users/:id", authMiddleware, async (req, res) => {
      try {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        res.json({
          success: true,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar || user.profileImage,
            bio: user.bio,
            location: user.location,
            joined: user.createdAt,
          },
        });
      } catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching user",
        });
      }
    });

    // ==================== ADMIN USER MANAGEMENT ROUTES ====================

    app.get(
      "/api/admin/users",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { search, role, status, page = 1, limit = 50 } = req.query;
          let query = {};

          if (search) {
            query.$or = [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
            ];
          }

          if (role && role !== "all") {
            query.role = role;
          }

          if (status && status !== "all") {
            query.isActive = status === "active";
          }

          const users = await User.find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

          const total = await User.countDocuments(query);

          res.json({
            success: true,
            users,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
          });
        } catch (error) {
          console.error("Get users error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.delete(
      "/api/admin/users/:id",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const user = await User.findById(req.params.id);
          if (!user) {
            return res.status(404).json({
              success: false,
              message: "User not found",
            });
          }

          if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({
              success: false,
              message: "You cannot delete your own account",
            });
          }

          await User.findByIdAndDelete(req.params.id);

          res.json({
            success: true,
            message: "User deleted successfully",
          });
        } catch (error) {
          console.error("Delete user error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.patch(
      "/api/admin/users/:id/status",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { isActive } = req.body;
          const user = await User.findById(req.params.id);

          if (!user) {
            return res.status(404).json({
              success: false,
              message: "User not found",
            });
          }

          user.isActive = isActive;
          await user.save();

          res.json({
            success: true,
            message: `User ${isActive ? "activated" : "deactivated"
              } successfully`,
          });
        } catch (error) {
          console.error("Update status error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.patch(
      "/api/admin/users/:id/role",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { role } = req.body;
          const user = await User.findById(req.params.id);

          if (!user) {
            return res.status(404).json({
              success: false,
              message: "User not found",
            });
          }

          user.role = role;
          await user.save();

          res.json({
            success: true,
            message: `User role updated to ${role}`,
          });
        } catch (error) {
          console.error("Update role error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // ==================== ADMIN SUBMISSION MANAGEMENT ROUTES ====================

    app.get(
      "/api/admin/submissions",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { status, page = 1, limit = 50, search } = req.query;
          let query = {};

          if (status && status !== "all") {
            query.status = status;
          }

          if (search) {
            query.$or = [
              { title: { $regex: search, $options: "i" } },
              { submitterEmail: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } },
            ];
          }

          const submissions = await Project.find(query)
            .populate("submittedBy", "name email profileImage")
            .populate("reviewedBy", "name email")
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

          const total = await Project.countDocuments(query);

          const transformedSubmissions = submissions.map((sub) => {
            const subObj = sub.toObject();
            return {
              ...subObj,
              projectTitle: subObj.title,
              projectType: subObj.category,
              briefSynopsis: subObj.description,
              email: subObj.submitterEmail,
              submitterName: sub.submittedBy?.name || "Unknown User",
              submitterEmail:
                sub.submittedBy?.email || subObj.submitterEmail || "No email",
              submissionStatus: subObj.status,
              userId: sub.submittedBy,
            };
          });

          res.json({
            success: true,
            submissions: transformedSubmissions,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit)),
          });
        } catch (error) {
          console.error("Get submissions error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.get(
      "/api/admin/submissions/:id",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const submission = await Project.findById(req.params.id)
            .populate("submittedBy", "name email profileImage")
            .populate("reviewedBy", "name email");

          if (!submission) {
            return res.status(404).json({
              success: false,
              message: "Submission not found",
            });
          }

          const transformedSubmission = {
            ...submission.toObject(),
            projectTitle: submission.title,
            projectType: submission.category,
            briefSynopsis: submission.description,
            email: submission.submitterEmail,
            userId: submission.submittedBy,
            submissionStatus: submission.status,
          };

          res.json({
            success: true,
            submission: transformedSubmission,
          });
        } catch (error) {
          console.error("Get submission error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.patch(
      "/api/admin/submissions/:id/status",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { status, adminNotes } = req.body;

          if (
            !status ||
            !["pending", "in-review", "approved", "rejected"].includes(status)
          ) {
            return res.status(400).json({
              success: false,
              message: "Valid status is required",
            });
          }

          const submission = await Project.findById(req.params.id);
          if (!submission) {
            return res.status(404).json({
              success: false,
              message: "Submission not found",
            });
          }

          submission.status = status;
          if (adminNotes !== undefined) {
            submission.adminNotes = adminNotes;
          }
          submission.reviewedBy = req.user._id;
          submission.reviewedAt = new Date();
          submission.updatedAt = new Date();

          await submission.save();

          res.json({
            success: true,
            message: `Submission ${status} successfully`,
            submission: {
              _id: submission._id,
              submissionStatus: submission.status,
              adminNotes: submission.adminNotes,
              reviewedAt: submission.reviewedAt,
            },
          });
        } catch (error) {
          console.error("Update submission status error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.delete(
      "/api/admin/submissions/:id",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const submission = await Project.findById(req.params.id);
          if (!submission) {
            return res.status(404).json({
              success: false,
              message: "Submission not found",
            });
          }

          await Project.findByIdAndDelete(req.params.id);

          res.json({
            success: true,
            message: "Submission deleted successfully",
          });
        } catch (error) {
          console.error("Delete submission error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // Get submission statistics (Admin only)
    app.get(
      "/api/admin/submissions/stats",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const total = await Project.countDocuments();
          const pending = await Project.countDocuments({
            status: "pending",
          });
          const inReview = await Project.countDocuments({
            status: "in-review",
          });
          const approved = await Project.countDocuments({
            status: "approved",
          });
          const rejected = await Project.countDocuments({
            status: "rejected",
          });

          // Get submissions by month (last 6 months)
          const last6Months = [];
          for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const startOfMonth = new Date(
              date.getFullYear(),
              date.getMonth(),
              1
            );
            const endOfMonth = new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0
            );

            const count = await Project.countDocuments({
              createdAt: { $gte: startOfMonth, $lte: endOfMonth },
            });

            last6Months.push({
              month: date.toLocaleString("default", { month: "short" }),
              year: date.getFullYear(),
              count,
            });
          }

          res.json({
            success: true,
            stats: {
              total,
              pending,
              inReview,
              approved,
              rejected,
              monthlyData: last6Months,
            },
          });
        } catch (error) {
          console.error("Submission stats error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // Bulk update submissions status (Admin only)
    app.post(
      "/api/admin/submissions/bulk-update",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const { submissionIds, status } = req.body;

          if (
            !submissionIds ||
            !Array.isArray(submissionIds) ||
            submissionIds.length === 0
          ) {
            return res.status(400).json({
              success: false,
              message: "Submission IDs array is required",
            });
          }

          if (
            !status ||
            !["pending", "in-review", "approved", "rejected"].includes(status)
          ) {
            return res.status(400).json({
              success: false,
              message: "Valid status is required",
            });
          }

          const result = await Project.updateMany(
            { _id: { $in: submissionIds } },
            {
              $set: {
                status: status,
                reviewedBy: req.user._id,
                reviewedAt: new Date(),
              },
            }
          );

          res.json({
            success: true,
            message: `${result.modifiedCount} submissions updated to ${status}`,
            modifiedCount: result.modifiedCount,
          });
        } catch (error) {
          console.error("Bulk update error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    // ==================== PROJECT ROUTES ====================

    // Get user's own projects
    app.get("/api/projects/user/list", authMiddleware, async (req, res) => {
      try {
        const projects = await Project.find({
          submittedBy: req.user._id,
        }).sort({ createdAt: -1 });
        res.json({ success: true, count: projects.length, projects });
      } catch (error) {
        console.error("Get user projects error:", error);
        res
          .status(500)
          .json({ success: false, message: "Error fetching your projects" });
      }
    });

    // Get all projects (public)
    app.get("/api/projects", async (req, res) => {
      try {
        const { status, category, page = 1, limit = 10 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (category) query.category = category;

        const projects = await Project.find(query)
          .populate("submittedBy", "name email")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

        const total = await Project.countDocuments(query);

        res.json({
          success: true,
          projects,
          totalPages: Math.ceil(total / limit),
          currentPage: parseInt(page),
          total,
        });
      } catch (error) {
        console.error("Get projects error:", error);
        res
          .status(500)
          .json({ success: false, message: "Error fetching projects" });
      }
    });

    // Create new project
    app.post("/api/projects", authMiddleware, async (req, res) => {
      try {
        let title, description, category, director;

        if (req.body.projectTitle) {
          title = req.body.projectTitle;
          description = req.body.briefSynopsis;
          category = req.body.projectType;
          if (req.body.directors && req.body.directors.length > 0) {
            const firstDirector = req.body.directors[0];
            director = `${firstDirector.firstName || ""
              } ${firstDirector.lastName || ""}`.trim();
          }
          if (!director) director = req.body.director || "Not specified";
        } else {
          title = req.body.title;
          description = req.body.description;
          category = req.body.category;
          director = req.body.director;
        }

        if (!title || !description || !category || !director) {
          return res.status(400).json({
            success: false,
            message:
              "Please provide title, description, category, and director",
          });
        }

        const project = new Project({
          title,
          description,
          category,
          director,
          hasNonEnglishTitle: req.body.hasNonEnglishTitle || false,
          nonEnglishTitle: req.body.nonEnglishTitle || "",
          nonEnglishSynopsis: req.body.nonEnglishSynopsis || "",
          website: req.body.website || "",
          twitter: req.body.twitter || "",
          facebook: req.body.facebook || "",
          instagram: req.body.instagram || "",
          submitterEmail: req.body.email || "",
          submitterPhone: req.body.phone || "",
          submitterAddress: req.body.address || "",
          submitterCity: req.body.city || "",
          submitterStateProvince: req.body.stateProvince || "",
          submitterPostalCode: req.body.postalCode || "",
          submitterCountry: req.body.country || "",
          submitterBirthDate: req.body.birthDate || "",
          submitterGender: req.body.gender || "",
          submitterPronouns: req.body.pronouns || "",
          directors: req.body.directors || [],
          writers: req.body.writers || [],
          producers: req.body.producers || [],
          keyCast: req.body.keyCast || [],
          projectTypes: req.body.projectTypes || [],
          genres: req.body.genres || "",
          runtimeHours: req.body.runtimeHours || "00",
          runtimeMinutes: req.body.runtimeMinutes || "00",
          runtimeSeconds: req.body.runtimeSeconds || "00",
          completionDate: req.body.completionDate || "",
          productionBudget: req.body.productionBudget || "",
          countryOfOrigin: req.body.countryOfOrigin || "",
          countryOfFilming: req.body.countryOfFilming || "",
          language: req.body.language || "en",
          shootingFormat: req.body.shootingFormat || "",
          aspectRatio: req.body.aspectRatio || "16:9",
          filmColor: req.body.filmColor || "Color",
          studentProject: req.body.studentProject || "No",
          firstTimeFilmmaker: req.body.firstTimeFilmmaker || "No",
          screenings: req.body.screenings || [],
          distributors: req.body.distributors || [],
          paymentIntentId: req.body.paymentIntentId || "",
          submittedAt: req.body.submittedAt || new Date().toISOString(),
          submittedBy: req.user._id,
          status: "pending",
        });

        await project.save();
        await sendConfirmationEmails(
          req.body.email || req.user.email,
          req.user.name,
          req.body.projectTitle || req.body.title || "Project",
          project._id
        );

        res.status(201).json({
          success: true,
          message: "Project submitted successfully",
          project,
        });
      } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({
          success: false,
          message: "Error creating project submission",
        });
      }
    });

    // Get user's own projects (alias for /my-projects)
    app.get("/api/projects/my-projects", authMiddleware, async (req, res) => {
      try {
        const projects = await Project.find({
          submittedBy: req.user._id,
        }).sort({ createdAt: -1 });

        res.json({
          success: true,
          count: projects.length,
          projects,
        });
      } catch (error) {
        console.error("Get my projects error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching your projects",
        });
      }
    });

    // Get single project
    app.get("/api/projects/:id", async (req, res) => {
      try {
        const project = await Project.findById(req.params.id).populate(
          "submittedBy",
          "name email"
        );

        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        res.json({
          success: true,
          project,
        });
      } catch (error) {
        console.error("Get project error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching project",
        });
      }
    });

    // Update project
    app.put("/api/projects/:id", authMiddleware, async (req, res) => {
      try {
        const project = await Project.findById(req.params.id);

        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        if (
          project.submittedBy.toString() !== req.user._id.toString() &&
          req.user.role !== "admin"
        ) {
          return res.status(403).json({
            success: false,
            message: "You can only update your own projects",
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
          message: "Project updated successfully",
          project: updatedProject,
        });
      } catch (error) {
        console.error("Update project error:", error);
        res.status(500).json({
          success: false,
          message: "Error updating project",
        });
      }
    });

    // Delete project
    app.delete("/api/projects/:id", authMiddleware, async (req, res) => {
      try {
        const project = await Project.findById(req.params.id);

        if (!project) {
          return res.status(404).json({
            success: false,
            message: "Project not found",
          });
        }

        if (
          project.submittedBy.toString() !== req.user._id.toString() &&
          req.user.role !== "admin"
        ) {
          return res.status(403).json({
            success: false,
            message: "You can only delete your own projects",
          });
        }

        await Project.findByIdAndDelete(req.params.id);

        res.json({
          success: true,
          message: "Project deleted successfully",
        });
      } catch (error) {
        console.error("Delete project error:", error);
        res.status(500).json({
          success: false,
          message: "Error deleting project",
        });
      }
    });

    // ==================== PAYMENT ROUTES ====================

    app.post(
      "/api/payments/create-payment-intent",
      authMiddleware,
      async (req, res) => {
        try {
          const { amount = 2500, currency = "usd" } = req.body; // 2500 cents = $25.00

          console.log(
            `Creating payment intent for user ${req.user._id}: $${amount / 100
            } ${currency}`
          );

          // Check if Stripe secret key is configured
          if (!process.env.STRIPE_SECRET_KEY) {
            console.warn("⚠️ STRIPE_SECRET_KEY not set. Using mock payment.");
            // Return mock for testing
            return res.json({
              clientSecret: `mock_secret_${Date.now()}_${req.user._id}`,
              mock: true,
            });
          }

          const Stripe = require("stripe");
          const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

          const paymentIntent = await stripe.paymentIntents.create({
            amount: parseInt(amount),
            currency: currency,
            metadata: {
              userId: req.user._id.toString(),
              userEmail: req.user.email,
              projectType: req.body.projectType || "unknown",
            },
            automatic_payment_methods: {
              enabled: true,
            },
          });

          console.log(`✅ Payment intent created: ${paymentIntent.id}`);

          res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            mock: false,
          });
        } catch (error) {
          console.error("❌ Payment intent error:", error.message);

          // For development, return mock to allow testing
          if (process.env.NODE_ENV === "development") {
            console.log("⚠️ Using mock payment intent for development");
            res.json({
              clientSecret: `mock_secret_${Date.now()}_${req.user._id}`,
              mock: true,
              error: error.message,
            });
          } else {
            res.status(500).json({
              success: false,
              message: error.message || "Failed to create payment intent",
            });
          }
        }
      }
    );

    // ==================== FILM ROUTES ====================

    app.get("/api/films", async (req, res) => {
      try {
        const { status, genre, page = 1, limit = 10 } = req.query;
        const query = {};

        if (status) query.submissionStatus = status;
        if (genre) query.genre = genre;

        const films = await Film.find(query)
          .populate("submittedBy", "name email")
          .sort({ createdAt: -1 })
          .limit(limit * 1)
          .skip((page - 1) * limit);

        const total = await Film.countDocuments(query);

        res.json({
          success: true,
          films,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total,
        });
      } catch (error) {
        console.error("Get films error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching films",
        });
      }
    });

    app.post("/api/films", async (req, res) => {
      try {
        const {
          title,
          director,
          year,
          duration,
          genre,
          description,
          posterUrl,
          trailerUrl,
        } = req.body;

        const token = req.headers.authorization?.split(" ")[1];
        let userId = null;

        if (token) {
          try {
            const decoded = jwt.verify(
              token,
              process.env.JWT_SECRET || "default_secret_key_change_this"
            );
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
          submissionStatus: "pending",
        });

        await film.save();

        res.status(201).json({
          success: true,
          message: "Film submitted successfully",
          film,
        });
      } catch (error) {
        console.error("Create film error:", error);
        res.status(500).json({
          success: false,
          message: "Error creating film submission",
        });
      }
    });

    app.get("/api/films/:id", async (req, res) => {
      try {
        const film = await Film.findById(req.params.id).populate(
          "submittedBy",
          "name email"
        );

        if (!film) {
          return res.status(404).json({
            success: false,
            message: "Film not found",
          });
        }

        res.json({
          success: true,
          film,
        });
      } catch (error) {
        console.error("Get film error:", error);
        res.status(500).json({
          success: false,
          message: "Error fetching film",
        });
      }
    });

    app.put("/api/films/:id", async (req, res) => {
      try {
        const updates = req.body;
        updates.updatedAt = Date.now();

        const film = await Film.findByIdAndUpdate(req.params.id, updates, {
          new: true,
          runValidators: true,
        });

        if (!film) {
          return res.status(404).json({
            success: false,
            message: "Film not found",
          });
        }

        res.json({
          success: true,
          message: "Film updated successfully",
          film,
        });
      } catch (error) {
        console.error("Update film error:", error);
        res.status(500).json({
          success: false,
          message: "Error updating film",
        });
      }
    });

    app.delete("/api/films/:id", async (req, res) => {
      try {
        const film = await Film.findByIdAndDelete(req.params.id);

        if (!film) {
          return res.status(404).json({
            success: false,
            message: "Film not found",
          });
        }

        res.json({
          success: true,
          message: "Film deleted successfully",
        });
      } catch (error) {
        console.error("Delete film error:", error);
        res.status(500).json({
          success: false,
          message: "Error deleting film",
        });
      }
    });

    // ==================== DASHBOARD STATS ROUTES ====================

    app.get(
      "/api/admin/stats",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const totalUsers = await User.countDocuments();
          const activeUsers = await User.countDocuments({ isActive: true });
          const totalAdmins = await User.countDocuments({ role: "admin" });
          const totalProjects = await Project.countDocuments();
          const pendingProjects = await Project.countDocuments({
            status: "pending",
          });
          const approvedProjects = await Project.countDocuments({
            status: "approved",
          });
          const rejectedProjects = await Project.countDocuments({
            status: "rejected",
          });
          const inReviewProjects = await Project.countDocuments({
            status: "in-review",
          });

          res.json({
            success: true,
            stats: {
              totalUsers,
              activeUsers,
              totalAdmins,
              totalProjects,
              pendingProjects,
              approvedProjects,
              rejectedProjects,
              inReviewProjects,
              totalSubmissions: totalProjects,
              pendingSubmissions: pendingProjects,
            },
          });
        } catch (error) {
          console.error("Stats error:", error);
          res.status(500).json({
            success: false,
            message: error.message,
          });
        }
      }
    );

    app.get(
      "/api/admin/recent-activities",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const recentProjects = await Project.find()
            .populate("submittedBy", "name")
            .sort({ createdAt: -1 })
            .limit(5);

          const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5);

          const activities = [
            ...recentProjects.map((p) => ({
              user: p.submittedBy?.name || "Unknown",
              action: `submitted project: ${p.title}`,
              time: getTimeAgo(p.createdAt),
              type: "submission",
            })),
            ...recentUsers.map((u) => ({
              user: u.name,
              action: "registered as a user",
              time: getTimeAgo(u.createdAt),
              type: "user",
            })),
          ]
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);

          res.json({ success: true, activities });
        } catch (error) {
          console.error("Activities error:", error);
          res.json({ success: true, activities: [] });
        }
      }
    );

    app.get(
      "/api/admin/pending-tasks",
      authMiddleware,
      adminMiddleware,
      async (req, res) => {
        try {
          const pendingSubmissions = await Project.countDocuments({
            status: "pending",
          });
          const pendingUsers = await User.countDocuments({ isActive: false });

          const tasks = [];
          if (pendingSubmissions > 0) {
            tasks.push({
              task: "Review new submissions",
              count: pendingSubmissions,
              priority:
                pendingSubmissions > 10
                  ? "high"
                  : pendingSubmissions > 5
                    ? "medium"
                    : "low",
              link: "/admin/submissions",
            });
          }
          if (pendingUsers > 0) {
            tasks.push({
              task: "Verify new users",
              count: pendingUsers,
              priority:
                pendingUsers > 10
                  ? "high"
                  : pendingUsers > 5
                    ? "medium"
                    : "low",
              link: "/admin/users",
            });
          }

          res.json({ success: true, tasks });
        } catch (error) {
          console.error("Tasks error:", error);
          res.json({ success: true, tasks: [] });
        }
      }
    );

    // ==================== PROJECT SUBMISSION ROUTE ====================

    // ==================== PROJECT SUBMISSION ROUTE ====================

    // ==================== PROJECT SUBMISSION ROUTE ====================

    app.post("/api/projects/submit", authMiddleware, async (req, res) => {
      try {
        const submissionData = req.body;

        console.log("📝 Received submission:", JSON.stringify(submissionData, null, 2));

        // Validate required fields according to your schema
        if (!submissionData.projectTitle) {
          return res.status(400).json({
            success: false,
            message: "projectTitle is required"
          });
        }

        if (!submissionData.briefSynopsis) {
          return res.status(400).json({
            success: false,
            message: "briefSynopsis is required"
          });
        }

        if (!submissionData.projectType) {
          return res.status(400).json({
            success: false,
            message: "projectType is required"
          });
        }

        if (!submissionData.email) {
          return res.status(400).json({
            success: false,
            message: "email is required"
          });
        }

        // Create project with your schema fields
        const project = new Project({
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

          // Step 4: Technical Specifications
          projectTypes: submissionData.projectTypes || [submissionData.projectType],
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
          paymentIntentId: submissionData.paymentIntentId || "",

          // System Fields
          userId: req.user._id,  // ✅ This is the required userId field
          submissionStatus: "pending",
          status: "pending",
          submittedAt: new Date()
        });

        await project.save();

        console.log("✅ Project saved with ID:", project._id);

        // Send email confirmation
        await sendConfirmationEmails(
          submissionData.email,
          req.user.name || "User",
          submissionData.projectTitle,
          project._id
        );

        res.status(201).json({
          success: true,
          message: "Project submitted successfully! Check your email for confirmation.",
          data: project,
        });

      } catch (error) {
        console.error("❌ Submit project error:", error);
        res.status(500).json({
          success: false,
          message: error.message || "Server error",
        });
      }
    });

    // ==================== HEALTH ROUTES ====================

    app.get("/", (req, res) => {
      res.status(200).json({
        success: true,
        message: "Film Festival API is running...",
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
      });
    });

    app.get("/health", (req, res) => {
      const dbStatus =
        mongoose.connection.readyState === 1 ? "connected" : "disconnected";
      res.status(200).json({
        success: true,
        status: "OK",
        timestamp: new Date().toISOString(),
        mongodb: { status: dbStatus },
      });
    });

    // ==================== ERROR HANDLERS ====================

    app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.url}`,
        error: "Route not found",
      });
    });

    app.use((err, req, res, next) => {
      console.error("❌ Error:", err.message);
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        error:
          process.env.NODE_ENV === "development"
            ? err.message
            : "Something went wrong",
      });
    });

    // Start server
    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log("\n========================================");
      console.log(`✅ Server started successfully!`);
      console.log(`🚀 Running on port ${PORT}`);
      console.log(`📡 Local URL: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`💾 Database: ${mongoose.connection.name || "connected"}`);
      console.log("========================================\n");
    });

    const gracefulShutdown = () => {
      console.log("\n⚠️ Received shutdown signal, closing gracefully...");
      server.close(() => {
        console.log("HTTP server closed");
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0);
        });
      });
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

// 🚀 Start the server
startServer();