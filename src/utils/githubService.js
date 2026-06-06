const axios = require("axios");

const githubAPI = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github.v3+json",
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
  timeout: 10000,
});

/**
 * Fetch core user profile from GitHub
 */
const fetchUserProfile = async (username) => {
  const { data } = await githubAPI.get(`/users/${username}`);
  return data;
};

/**
 * Fetch user repositories (up to 100, sorted by stars)
 */
const fetchUserRepos = async (username) => {
  const { data } = await githubAPI.get(`/users/${username}/repos`, {
    params: { per_page: 100, sort: "stars", direction: "desc" },
  });
  return data;
};

/**
 * Aggregate language distribution across all repos
 */
const aggregateLanguages = (repos) => {
  const langCount = {};
  for (const repo of repos) {
    if (repo.language) {
      langCount[repo.language] = (langCount[repo.language] || 0) + 1;
    }
  }
  // Sort descending and return top 10
  return Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([language, count]) => ({ language, count }));
};

/**
 * Pick top repos by stars
 */
const getTopRepos = (repos, limit = 5) => {
  return repos.slice(0, limit).map((r) => ({
    name: r.name,
    description: r.description,
    stars: r.stargazers_count,
    forks: r.forks_count,
    language: r.language,
    url: r.html_url,
    topics: r.topics || [],
  }));
};

/**
 * Compute a simple profile score (0–100)
 * Weighted across followers, stars, repos, bio, blog
 */
const computeProfileScore = (profile, repos, totalStars) => {
  let score = 0;

  // Followers (max 25pts)
  score += Math.min(25, Math.floor(profile.followers / 10));

  // Stars (max 25pts)
  score += Math.min(25, Math.floor(totalStars / 20));

  // Repos (max 15pts)
  score += Math.min(15, Math.floor(profile.public_repos / 5));

  // Bio filled (5pts)
  if (profile.bio) score += 5;

  // Blog/website (5pts)
  if (profile.blog) score += 5;

  // Location (3pts)
  if (profile.location) score += 3;

  // Email or hireable (5pts)
  if (profile.email || profile.hireable) score += 5;

  // Twitter (2pts)
  if (profile.twitter_username) score += 2;

  // Avatar (not gravatar default) (5pts)
  if (profile.avatar_url && !profile.avatar_url.includes("gravatar")) score += 5;

  // Repo quality: avg stars (max 5pts)
  if (profile.public_repos > 0) {
    const avg = totalStars / profile.public_repos;
    score += Math.min(5, Math.floor(avg));
  }

  return Math.min(100, score);
};

/**
 * Map score to activity grade
 */
const gradeFromScore = (score) => {
  if (score >= 80) return "S";
  if (score >= 60) return "A";
  if (score >= 45) return "B";
  if (score >= 30) return "C";
  if (score >= 15) return "D";
  return "F";
};

/**
 * Main: fetch + enrich full profile data
 */
const analyzeGitHubUser = async (username) => {
  const [profile, repos] = await Promise.all([
    fetchUserProfile(username),
    fetchUserRepos(username),
  ]);

  const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0);
  const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0);
  const totalWatchers = repos.reduce((sum, r) => sum + r.watchers_count, 0);
  const totalOpenIssues = repos.reduce((sum, r) => sum + r.open_issues_count, 0);

  const createdAt = new Date(profile.created_at);
  const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / 86400000);

  const avgStarsPerRepo =
    profile.public_repos > 0
      ? parseFloat((totalStars / profile.public_repos).toFixed(2))
      : 0;

  const followerFollowingRatio =
    profile.following > 0
      ? parseFloat((profile.followers / profile.following).toFixed(2))
      : profile.followers;

  const topLanguages = aggregateLanguages(repos);
  const topRepos = getTopRepos(repos);
  const profileScore = computeProfileScore(profile, repos, totalStars);
  const activityGrade = gradeFromScore(profileScore);

  return {
    username: profile.login,
    name: profile.name || null,
    bio: profile.bio || null,
    avatar_url: profile.avatar_url || null,
    github_url: profile.html_url,
    blog: profile.blog || null,
    company: profile.company || null,
    location: profile.location || null,
    email: profile.email || null,
    twitter_handle: profile.twitter_username || null,

    public_repos: profile.public_repos,
    public_gists: profile.public_gists,
    followers: profile.followers,
    following: profile.following,
    total_stars: totalStars,
    total_forks: totalForks,
    total_watchers: totalWatchers,
    total_open_issues: totalOpenIssues,

    account_age_days: accountAgeDays,
    avg_stars_per_repo: avgStarsPerRepo,
    follower_following_ratio: followerFollowingRatio,
    hireable: profile.hireable ? 1 : 0,
    is_organization: profile.type === "Organization" ? 1 : 0,

    top_languages: JSON.stringify(topLanguages),
    top_repos: JSON.stringify(topRepos),

    profile_score: profileScore,
    activity_grade: activityGrade,

    github_created_at: new Date(profile.created_at),
    github_updated_at: new Date(profile.updated_at),
  };
};

module.exports = { analyzeGitHubUser };
