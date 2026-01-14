import path from 'path';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma runs this config with cwd = this package, but our repo-level `.env` lives at `../../.env`.
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required. Set it in the environment or in the repo root `.env`.',
  );
}

export default defineConfig({
  datasource: { url },
});

