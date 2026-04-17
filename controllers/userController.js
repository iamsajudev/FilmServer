const User = require("../models/User");
const bcrypt = require("bcryptjs");

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateCurrentUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("Received update data:", req.body);

    // Update basic fields
    if (req.body.fullName !== undefined) user.fullName = req.body.fullName;
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
    if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
    if (req.body.username !== undefined) user.username = req.body.username;
    if (req.body.title !== undefined) user.title = req.body.title;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.location !== undefined) user.location = req.body.location;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.website !== undefined) user.website = req.body.website;

    // Update personal information
    if (req.body.gender !== undefined) user.gender = req.body.gender;
    if (req.body.pronouns !== undefined) user.pronouns = req.body.pronouns;
    if (req.body.customPronouns !== undefined) user.customPronouns = req.body.customPronouns;
    if (req.body.birthdate !== undefined) user.birthdate = req.body.birthdate;

    // Update preferences
    if (req.body.timezone !== undefined) user.timezone = req.body.timezone;
    if (req.body.currency !== undefined) user.currency = req.body.currency;

    // Update address fields
    if (req.body.address) {
      if (typeof req.body.address === 'object') {
        user.address = {
          ...user.address,
          ...req.body.address
        };
      }
    }
    
    // Flat address fields (alternative to nested object)
    if (req.body.street !== undefined) user.address.street = req.body.street;
    if (req.body.apartment !== undefined) user.address.apartment = req.body.apartment;
    if (req.body.city !== undefined) user.address.city = req.body.city;
    if (req.body.state !== undefined) user.address.state = req.body.state;
    if (req.body.zipCode !== undefined) user.address.zipCode = req.body.zipCode;
    if (req.body.country !== undefined) user.address.country = req.body.country;

    // Update social media
    if (req.body.socialMedia !== undefined) {
      user.socialMedia = {
        ...user.socialMedia,
        ...req.body.socialMedia,
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
        ...req.body.stats,
      };
    }

    // Update preferences
    if (req.body.preferences !== undefined) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences,
      };
    }

    // Handle profile image (base64)
    if (req.body.profileImage && req.body.profileImage.startsWith("data:image")) {
      user.profileImage = req.body.profileImage;
      user.avatar = req.body.profileImage;
    }

    // Handle cover photo
    if (req.body.coverPhoto && req.body.coverPhoto.startsWith("data:image")) {
      user.coverPhoto = req.body.coverPhoto;
    }

    // Handle email verification
    if (req.body.isEmailVerified !== undefined) {
      user.isEmailVerified = req.body.isEmailVerified;
    }

    // Handle password update
    if (req.body.password && req.body.password.trim() !== "") {
      if (req.body.password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    await user.save();

    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select("-password");

    console.log("Profile updated successfully for user:", updatedUser.email);

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while updating profile",
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/:id
// @access  Private/Admin
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update user (Admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const updateData = {
      name: req.body.fullName || req.body.name,
      fullName: req.body.fullName || req.body.name,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      username: req.body.username,
      email: req.body.email,
      phone: req.body.phone,
      bio: req.body.bio,
      website: req.body.website,
      company: req.body.company,
      position: req.body.position,
      role: req.body.role,
      isActive: req.body.isActive !== undefined ? req.body.isActive : req.body.status === "active",
      socialMedia: req.body.socialMedia,
      preferences: req.body.preferences,
      skills: req.body.skills,
      experience: req.body.experience,
      stats: req.body.stats,
      gender: req.body.gender,
      pronouns: req.body.pronouns,
      timezone: req.body.timezone,
      currency: req.body.currency,
    };

    // Handle address
    if (req.body.address) {
      updateData.address = req.body.address;
    }

    // Handle profile image (base64)
    if (req.body.profileImage && req.body.profileImage.startsWith("data:image")) {
      updateData.profileImage = req.body.profileImage;
      updateData.avatar = req.body.profileImage;
    }

    // Handle cover photo
    if (req.body.coverPhoto && req.body.coverPhoto.startsWith("data:image")) {
      updateData.coverPhoto = req.body.coverPhoto;
    }

    // Handle password update
    if (req.body.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(req.body.password, salt);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: user,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if trying to delete self
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    // Delete the user
    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get dashboard stats (Admin only)
// @route   GET /api/users/dashboard/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        adminUsers,
        newUsersThisMonth
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats,
};  