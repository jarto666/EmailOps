import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join("prisma", "schema.prisma"),

  // migrations: {
  //   path: "prisma/migrations",
  // },
  datasource: {
    url: process.env.DATABASE_URL,
  },

  migrate: {
    async adapter() {
      const { PrismaPg } = await import("@prisma/adapter-pg");
      const { Pool } = await import("pg");

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });

      return new PrismaPg(pool);
    },
  },
});
