const { pool } = require("./db");

const schema = `
CREATE TABLE IF NOT EXISTS github_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  username        VARCHAR(100) NOT NULL UNIQUE,
  name            VARCHAR(255),
  bio             TEXT,
  avatar_url      VARCHAR(500),
  github_url      VARCHAR(500),
  blog            VARCHAR(500),
  company         VARCHAR(255),
  location        VARCHAR(255),
  email           VARCHAR(255),
  twitter_handle  VARCHAR(100),

  -- Core Stats
  public_repos        INT DEFAULT 0,
  public_gists        INT DEFAULT 0,
  followers           INT DEFAULT 0,
  following           INT DEFAULT 0,
  total_stars         INT DEFAULT 0,
  total_forks         INT DEFAULT 0,
  total_watchers      INT DEFAULT 0,
  total_open_issues   INT DEFAULT 0,

  -- Derived Insights
  account_age_days    INT DEFAULT 0,
  avg_stars_per_repo  DECIMAL(10,2) DEFAULT 0.00,
  follower_following_ratio DECIMAL(10,2) DEFAULT 0.00,
  hireable            TINYINT(1) DEFAULT 0,
  is_organization     TINYINT(1) DEFAULT 0,

  -- Language & Topics JSON blobs
  top_languages       JSON,
  top_repos           JSON,

  -- Scoring
  profile_score       INT DEFAULT 0,
  activity_grade      VARCHAR(5),

  -- Timestamps
  github_created_at   DATETIME,
  github_updated_at   DATETIME,
  analyzed_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_username (username),
  INDEX idx_analyzed_at (analyzed_at),
  INDEX idx_profile_score (profile_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

const runMigrations = async () => {
  try {
    await pool.execute(schema);
    console.log("Database schema ready");
  } catch (err) {
    console.error("Migration failed:", err.message);
    throw err;
  }
};

module.exports = { runMigrations };
