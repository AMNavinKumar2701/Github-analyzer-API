# GitHub Profile Analyzer API

A production-ready Node.js + Express + MySQL backend that fetches GitHub user profiles, computes enriched insights, and stores them for querying.

---

## Tech Stack

| Layer      | Technology                    |
|------------|-------------------------------|
| Runtime    | Node.js                       |
| Framework  | Express.js                    |
| Database   | MySQL (mysql2)                |
| External   | GitHub REST API v3            |
| Security   | Helmet, express-rate-limit    |
| Logging    | Morgan                        |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=github_analyzer
GITHUB_TOKEN=ghp_your_token_here   # Optional but recommended (5000 req/hr vs 60)
```

### 3. Create MySQL database

```sql
CREATE DATABASE github_analyzer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

> The table is auto-created on startup via migrations.

### 4. Run

```bash
# Development
npm run dev

# Production
npm start
```

---

## API Reference

### Base URL: `http://localhost:3000`

---

### `POST /api/profiles/analyze/:username`
Fetches the GitHub user, computes insights, and stores/updates in DB.

**Request:**
```
POST /api/profiles/analyze/torvalds
```

**Response:**
```json
{
  "success": true,
  "message": "Profile analyzed and stored for @torvalds",
  "data": {
    "username": "torvalds",
    "name": "Linus Torvalds",
    "followers": 230000,
    "public_repos": 8,
    "total_stars": 225000,
    "profile_score": 87,
    "activity_grade": "S",
    "top_languages": [...],
    "top_repos": [...],
    ...
  }
}
```

---

### `GET /api/profiles`
Returns all stored profiles. Supports pagination, sorting, and search.

**Query Parameters:**

| Param    | Default      | Options                                                   |
|----------|--------------|-----------------------------------------------------------|
| `page`   | `1`          | Any positive integer                                      |
| `limit`  | `20`         | 1–100                                                     |
| `sort`   | `analyzed_at`| `analyzed_at`, `profile_score`, `followers`, `total_stars`, `public_repos`, `username` |
| `order`  | `DESC`       | `ASC`, `DESC`                                             |
| `search` | `""`         | Partial match on username, name, or location              |

**Example:**
```
GET /api/profiles?page=1&limit=10&sort=profile_score&order=DESC&search=node
```

---

### `GET /api/profiles/:username`
Fetch a single stored profile from the database.

**Example:**
```
GET /api/profiles/torvalds
```

> Returns 404 if not yet analyzed. Run the analyze endpoint first.

---

### `DELETE /api/profiles/:username`
Remove a profile from the database.

**Example:**
```
DELETE /api/profiles/torvalds
```

---

### `GET /api/profiles/stats/summary`
Aggregate statistics across all stored profiles.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_profiles": 42,
    "avg_score": "54.30",
    "highest_score": 94,
    "avg_followers": "1204.50",
    "grand_total_stars": 380000,
    "last_analyzed": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### `GET /health`
Simple health check.

---

## Stored Insights Schema

| Column                    | Type           | Description                              |
|---------------------------|----------------|------------------------------------------|
| `username`                | VARCHAR(100)   | GitHub login (unique key)                |
| `name`                    | VARCHAR(255)   | Display name                             |
| `bio`                     | TEXT           | Profile bio                              |
| `public_repos`            | INT            | Number of public repos                   |
| `public_gists`            | INT            | Number of public gists                   |
| `followers`               | INT            | Follower count                           |
| `following`               | INT            | Following count                          |
| `total_stars`             | INT            | Sum of stars across all repos            |
| `total_forks`             | INT            | Sum of forks across all repos            |
| `total_watchers`          | INT            | Sum of watchers                          |
| `total_open_issues`       | INT            | Sum of open issues                       |
| `account_age_days`        | INT            | Days since account creation              |
| `avg_stars_per_repo`      | DECIMAL(10,2)  | `total_stars / public_repos`             |
| `follower_following_ratio`| DECIMAL(10,2)  | `followers / following`                  |
| `hireable`                | TINYINT        | GitHub hireable flag                     |
| `is_organization`         | TINYINT        | True if org account                      |
| `top_languages`           | JSON           | Top 10 languages by repo count           |
| `top_repos`               | JSON           | Top 5 repos by star count                |
| `profile_score`           | INT (0–100)    | Computed score (followers, stars, bio…)  |
| `activity_grade`          | VARCHAR(5)     | S / A / B / C / D / F                   |
| `github_created_at`       | DATETIME       | Account creation date                    |
| `analyzed_at`             | DATETIME       | Last analysis timestamp                  |

---

## Profile Score Formula

| Signal                  | Max Points |
|-------------------------|------------|
| Followers               | 25         |
| Total Stars             | 25         |
| Public Repos            | 15         |
| Bio filled              | 5          |
| Blog/website            | 5          |
| Email or hireable       | 5          |
| Non-default avatar      | 5          |
| Avg stars/repo          | 5          |
| Location                | 3          |
| Twitter                 | 2          |
| **Total**               | **100**    |

Grade scale: `S (80+)` → `A (60+)` → `B (45+)` → `C (30+)` → `D (15+)` → `F`

---

## Rate Limits

- API: 100 requests per 15 minutes per IP
- GitHub (unauthenticated): 60 req/hr
- GitHub (with token): 5,000 req/hr → **Add `GITHUB_TOKEN` to `.env`**
