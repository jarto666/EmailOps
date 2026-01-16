"use strict";
/**
 * Global test setup
 * This file runs before all tests
 */
// Increase timeout for testcontainers startup
jest.setTimeout(60000);
// Suppress console logs during tests unless DEBUG=true
if (!process.env.DEBUG) {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        // Keep warn and error for debugging
        warn: console.warn,
        error: console.error,
    };
}
// Clean up after all tests
afterAll(async () => {
    // Give time for connections to close
    await new Promise((resolve) => setTimeout(resolve, 500));
});
