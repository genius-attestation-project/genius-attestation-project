import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { defineConfig, env } from "prisma/config";

const localEnv = resolve(process.cwd(), ".env.local");

if (existsSync(localEnv)) {
  loadEnvFile(localEnv);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
