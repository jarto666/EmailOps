/** @type {import('jest').Config} */
const baseConfig = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    {
      ...baseConfig,
      displayName: 'unit',
      rootDir: '.',
      testRegex: 'src/.*\\.spec\\.ts$',
      testTimeout: 30000,
    },
    {
      ...baseConfig,
      displayName: 'integration',
      rootDir: '.',
      testRegex: 'test/integration/.*\\.spec\\.ts$',
      testTimeout: 120000,
      setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.dto.ts', '!src/**/*.module.ts'],
  coverageDirectory: './coverage',
};
