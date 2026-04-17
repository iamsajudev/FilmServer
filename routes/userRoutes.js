const express = require("express");
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDashboardStats,
  getCurrentUserProfile,
  updateCurrentUserProfile
} = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { changePassword } = require("../controllers/authController");

const router = express.Router();

// Profile routes for authenticated users (no admin required)
router.get("/profile", protect, getCurrentUserProfile);
router.put("/profile", protect, updateCurrentUserProfile);
router.put("/change-password", protect, changePassword);

// Stats route for authenticated users
router.get("/stats", protect, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        totalProjects: 0,
        completedTasks: 0,
        pendingTasks: 0,
        contributions: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin only routes
router.get("/dashboard/stats", protect, adminOnly, getDashboardStats);
router.get("/", protect, adminOnly, getAllUsers);
router.get("/:id", protect, adminOnly, getUserById);
router.put("/:id", protect, adminOnly, updateUser);
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;