const mongoose = require("mongoose");

const filmSchema = new mongoose.Schema({
  title: { type: String, required: true },
  director: { type: String, required: true },
  year: { type: Number },
  duration: { type: Number },
  genre: { type: String },
  description: { type: String },
  posterUrl: { type: String },
  trailerUrl: { type: String },
  submissionStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Film || mongoose.model("Film", filmSchema);