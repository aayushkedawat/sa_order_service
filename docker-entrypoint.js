#!/usr/bin/env node

const { Client } = require("pg");
const { spawn } = require("child_process");

async function waitForDatabase() {
  const maxRetries = 30;
  const retryDelay = 2000;

  console.log("🔍 Waiting for database to be ready...");

  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new Client({
        connectionString: process.env.DB_DSN,
      });

      await client.connect();
      await client.query("SELECT 1");
      await client.end();

      console.log("✅ Database is ready");
      return true;
    } catch (error) {
      console.log("⏳ Waiting for database...");
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error("❌ Database connection timeout");
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    proc.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    // Wait for database
    await waitForDatabase();

    // Run migrations
    console.log("🚀 Running database migrations...");
    await runCommand("npm", ["run", "migration:run"]);
    console.log("✅ Migrations completed successfully!");

    // Start application
    console.log("🎯 Starting application...");
    await runCommand("node", ["dist/main.js"]);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
