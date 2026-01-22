#!/usr/bin/env ts-node
/**
 * Generate TypeScript types from the EmailOps OpenAPI spec.
 *
 * Usage:
 *   API_URL=http://your-api-host:3300 pnpm run generate
 */
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const API_URL = process.env.API_URL;
if (!API_URL) {
  console.error('Error: API_URL environment variable is required');
  console.error('Usage: API_URL=http://your-api-host:3300 pnpm run generate');
  process.exit(1);
}
const OPENAPI_URL = `${API_URL}/api/docs-json`;
const OUTPUT_DIR = join(__dirname, '..', 'generated');
const OUTPUT_FILE = join(OUTPUT_DIR, 'api.ts');

async function main() {
  console.log(`Fetching OpenAPI spec from ${OPENAPI_URL}...`);

  try {
    // Fetch the OpenAPI spec
    const response = await fetch(OPENAPI_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`);
    }

    const spec = await response.json();

    // Save the spec for reference
    const specPath = join(OUTPUT_DIR, 'openapi.json');
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(specPath, JSON.stringify(spec, null, 2));
    console.log(`Saved OpenAPI spec to ${specPath}`);

    // Generate TypeScript types using openapi-typescript
    console.log('Generating TypeScript types...');
    execSync(`npx openapi-typescript ${specPath} -o ${OUTPUT_FILE}`, {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
    });

    console.log(`Generated types at ${OUTPUT_FILE}`);
    console.log('Done!');
  } catch (error) {
    console.error('Error generating SDK:', error);
    process.exit(1);
  }
}

main();
