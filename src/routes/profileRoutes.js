const express = require("express");
const router = express.Router();
const {
  analyzeProfile,
  getAllProfiles,
  getProfile,
  removeProfile,
  getSummaryStats,
} = require("../controllers/profileController");

// POST   /api/profiles/analyze/:username  — fetch from GitHub + store
router.post("/analyze/:username", analyzeProfile);

// GET    /api/profiles/stats/summary      — aggregate DB stats
router.get("/stats/summary", getSummaryStats);

// GET    /api/profiles                    — list all (paginated, sortable, searchable)
router.get("/", getAllProfiles);

// GET    /api/profiles/:username          — single profile from DB
router.get("/:username", getProfile);

// DELETE /api/profiles/:username          — remove from DB
router.delete("/:username", removeProfile);

module.exports = router;
