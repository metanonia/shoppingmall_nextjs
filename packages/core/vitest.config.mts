import { defineConfig } from "vitest/config";

// Importing anything from @shoppingmall/db eagerly constructs a PrismaClient
// at module load time (packages/db/src/index.ts), which needs DATABASE_URL
// to be a syntactically valid connection string even for test files that
// only exercise pure functions and never issue a query. This doesn't need
// to point at a real, reachable database for that reason.
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "mysql://root:root@localhost:3307/shoppingmall",
    },
  },
});
