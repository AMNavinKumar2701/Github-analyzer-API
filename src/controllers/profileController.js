const { analyzeGitHubUser } = require("../utils/githubService");
const {
  upsertProfile,
  findByUsername,
  findAll,
  deleteByUsername,
  getStats,
} = require("../models/profileModel");

/**
 * POST /api/profiles/analyze/:username
 * Fetch from GitHub, store/update in DB, return enriched profile
 */
const analyzeProfile = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || !/^[a-zA-Z0-9\-]+$/.test(username)) {
      return res.status(400).json({ success: false, message: "Invalid GitHub username" });
    }

    const profileData = await analyzeGitHubUser(username);
    await upsertProfile(profileData);
    const stored = await findByUsername(username);

    return res.status(200).json({
      success: true,
      message: `Profile analyzed and stored for @${username}`,
      data: parseJsonFields(stored),
    });
  } catch (err) {
    if (err.response?.status === 404) {
      return res.status(404).json({ success: false, message: "GitHub user not found" });
    }
    if (err.response?.status === 403) {
      return res.status(429).json({ success: false, message: "GitHub API rate limit exceeded. Add GITHUB_TOKEN to .env" });
    }
    console.error("analyzeProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/profiles
 * List all analyzed profiles with pagination, sorting, search
 */
const getAllProfiles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = "analyzed_at",
      order = "DESC",
      search = "",
    } = req.query;

    const parsedLimit = Math.min(parseInt(limit) || 20, 100);
    const parsedPage = Math.max(parseInt(page) || 1, 1);

    const result = await findAll({
      page: parsedPage,
      limit: parsedLimit,
      sort,
      order,
      search,
    });

    result.data = result.data.map((p) => ({
      ...p,
      top_languages: safeJsonParse(p.top_languages),
    }));

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error("getAllProfiles error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/profiles/:username
 * Fetch single analyzed profile from DB
 */
const getProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const profile = await findByUsername(username);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `Profile @${username} not found. Analyze it first via POST /api/profiles/analyze/${username}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: parseJsonFields(profile),
    });
  } catch (err) {
    console.error("getProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/profiles/:username
 * Remove a profile from DB
 */
const removeProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const deleted = await deleteByUsername(username);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    return res.status(200).json({
      success: true,
      message: `Profile @${username} deleted`,
    });
  } catch (err) {
    console.error("removeProfile error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/profiles/stats/summary
 * Aggregate stats across all stored profiles
 */
const getSummaryStats = async (req, res) => {
  try {
    const stats = await getStats();
    return res.status(200).json({ success: true, data: stats });
  } catch (err) {
    console.error("getStats error:", err.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────

const safeJsonParse = (val) => {
  if (!val) return [];
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return []; }
};

const parseJsonFields = (profile) => ({
  ...profile,
  top_languages: safeJsonParse(profile.top_languages),
  top_repos: safeJsonParse(profile.top_repos),
});

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getProfile,
  removeProfile,
  getSummaryStats,
};
