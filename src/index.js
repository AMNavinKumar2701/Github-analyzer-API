require("dotenv").config();
const app = require("./app");
const { testConnection } = require("./config/db");
const { runMigrations } = require("./config/migrate");

const PORT = process.env.PORT || 3000;

const start = async () => {
  await testConnection();
  await runMigrations();

  app.listen(PORT, () => {
    console.log(`\n GitHub Profile Analyzer API`);
    console.log(`   Running on: http://localhost:${PORT}`);
    console.log(`   Health:     http://localhost:${PORT}/health`);
    console.log(`   Docs:       http://localhost:${PORT}/\n`);
  });
};

start().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
