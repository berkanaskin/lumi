import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    test: {
        // Test environment
        environment: 'jsdom',

        // Global test setup
        globals: true,

        // Test file patterns
        include: ['tests/**/*.{test,spec}.{js,ts}'],
        exclude: ['node_modules', 'dist'],

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.js'],
            exclude: ['src/main.js'], // Entry point
        },

        // Reporters
        reporters: ['verbose'],

        // Timeout
        testTimeout: 10000,

        // Setup files
        setupFiles: ['./tests/setup.js'],
    },

    // Resolve aliases (same as vite.config.js)
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@lib': resolve(__dirname, 'src/lib'),
            '@ui': resolve(__dirname, 'src/ui'),
        },
    },
});
