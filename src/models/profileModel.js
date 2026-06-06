const { pool } = require("../config/db");

const upsertProfile = async (data) => {
  const sql = `
    INSERT INTO github_profiles (
      username, name, bio, avatar_url, github_url, blog, company, location,
      email, twitter_handle, public_repos, public_gists, followers, following,
      total_stars, total_forks, total_watchers, total_open_issues,
      account_age_days, avg_stars_per_repo, follower_following_ratio,
      hireable, is_organization, top_languages, top_repos,
      profile_score, activity_grade, github_created_at, github_updated_at,
      analyzed_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )
    ON DUPLICATE KEY UPDATE
      name = VALUES(name), bio = VALUES(bio), avatar_url = VALUES(avatar_url),
      github_url = VALUES(github_url), blog = VALUES(blog), company = VALUES(company),
      location = VALUES(location), email = VALUES(email),
      twitter_handle = VALUES(twitter_handle), public_repos = VALUES(public_repos),
      public_gists = VALUES(public_gists), followers = VALUES(followers),
      following = VALUES(following), total_stars = VALUES(total_stars),
      total_forks = VALUES(total_forks), total_watchers = VALUES(total_watchers),
      total_open_issues = VALUES(total_open_issues),
      account_age_days = VALUES(account_age_days),
      avg_stars_per_repo = VALUES(avg_stars_per_repo),
      follower_following_ratio = VALUES(follower_following_ratio),
      hireable = VALUES(hireable), is_organization = VALUES(is_organization),
      top_languages = VALUES(top_languages), top_repos = VALUES(top_repos),
      profile_score = VALUES(profile_score), activity_grade = VALUES(activity_grade),
      github_created_at = VALUES(github_created_at),
      github_updated_at = VALUES(github_updated_at),
      analyzed_at = NOW()
  `;

  const values = [
    data.username, data.name, data.bio, data.avatar_url, data.github_url,
    data.blog, data.company, data.location, data.email, data.twitter_handle,
    data.public_repos, data.public_gists, data.followers, data.following,
    data.total_stars, data.total_forks, data.total_watchers, data.total_open_issues,
    data.account_age_days, data.avg_stars_per_repo, data.follower_following_ratio,
    data.hireable, data.is_organization, data.top_languages, data.top_repos,
    data.profile_score, data.activity_grade,
    data.github_created_at, data.github_updated_at,
  ];

  const [result] = await pool.execute(sql, values);
  return result;
};

const findByUsername = async (username) => {
  const [rows] = await pool.execute(
    "SELECT * FROM github_profiles WHERE username = ?",
    [username]
  );
  return rows[0] || null;
};

const findAll = async ({ page = 1, limit = 20, sort = "analyzed_at", order = "DESC", search = "" }) => {
  const offset = (page - 1) * limit;
  const allowedSort = ["analyzed_at", "profile_score", "followers", "total_stars", "public_repos", "username"];
  const sortCol = allowedSort.includes(sort) ? sort : "analyzed_at";
  const sortDir = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

  let whereClause = "";
  const params = [];

  if (search) {
    whereClause = "WHERE username LIKE ? OR name LIKE ? OR location LIKE ?";
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const countSql = `SELECT COUNT(*) as total FROM github_profiles ${whereClause}`;
  const dataSql = `
    SELECT id, username, name, avatar_url, bio, location, company,
           public_repos, followers, following, total_stars, total_forks,
           profile_score, activity_grade, top_languages,
           account_age_days, analyzed_at, github_created_at
    FROM github_profiles ${whereClause}
    ORDER BY ${sortCol} ${sortDir}
    LIMIT ? OFFSET ?
  `;

  const [[{ total }]] = await pool.execute(countSql, params);
  const [rows] = await pool.execute(dataSql, [...params, limit, offset]);

  return {
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const deleteByUsername = async (username) => {
  const [result] = await pool.execute(
    "DELETE FROM github_profiles WHERE username = ?",
    [username]
  );
  return result.affectedRows > 0;
};

const getStats = async () => {
  const [rows] = await pool.execute(`
    SELECT
      COUNT(*) AS total_profiles,
      AVG(profile_score) AS avg_score,
      MAX(profile_score) AS highest_score,
      AVG(followers) AS avg_followers,
      SUM(total_stars) AS grand_total_stars,
      MAX(analyzed_at) AS last_analyzed
    FROM github_profiles
  `);
  return rows[0];
};

module.exports = { upsertProfile, findByUsername, findAll, deleteByUsername, getStats };
