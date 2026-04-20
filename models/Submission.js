const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
    filmId: { type: mongoose.Schema.Types.ObjectId, ref: "Film", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: {
        type: String,
        enum: ["pending", "reviewing", "accepted", "rejected"],
        default: "pending",
    },
    feedback: { type: String },
    submittedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

module.exports = mongoose.models.Submission || mongoose.model("Submission", submissionSchema);