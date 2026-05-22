import globals from 'globals';
import js from '@eslint/js';

export default [
    // Base configuration
    js.configs.recommended,

    // Global settings
    {
        languageOptions: {
            ecmaVersion: 2024,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2024,
                // Firebase globals (loaded from CDN)
                firebase: 'readonly',
                // App globals (legacy support)
                CONFIG: 'readonly',
                FIREBASE_CONFIG: 'readonly',
                API_URLS: 'readonly',
                API: 'readonly',
                i18n: 'readonly',
                state: 'writable',
                // Service globals
                AuthService: 'readonly',
                AIService: 'readonly',
                StoreService: 'readonly',
                NotificationService: 'readonly',
            },
        },
        rules: {
            // Relaxed rules for legacy code migration
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-undef': 'warn',
            'no-console': 'off',
            'semi': ['error', 'always'],
            'quotes': ['warn', 'single', { avoidEscape: true }],
            'indent': ['warn', 4, { SwitchCase: 1 }],
            'no-mixed-spaces-and-tabs': 'warn',
            // Allow empty catch blocks (intentional swallows of non-critical errors)
            'no-empty': ['error', { allowEmptyCatch: true }],
            'eqeqeq': ['warn', 'smart'],
            'curly': ['warn', 'multi-line'],
            'no-var': 'warn',
            'prefer-const': 'warn',
        },
    },

    // Ignore patterns
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            '*.min.js',
            'stitch/**',
            'assets/**',
            // Build / deploy artifacts
            '.vercel/**',
            '.claude/**',
            'public/**',
            // Legacy files - will be migrated in Sprint 2
            'app.js',
            'api.js',
            'config.js',
            'i18n.js',
            'services/**',
            // Config files (Node.js environment)
            'vite.config.js',
            'vitest.config.js',
            'eslint.config.js',
            // Test files (handled by vitest)
            'tests/**',
        ],
    },

    // Source files
    {
        files: ['src/**/*.js'],
        rules: {
            // Stricter rules for new modular code (allow _-prefix opt-out)
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrorsIgnorePattern: '^_',
            }],
            'no-undef': 'error',
        },
    },

    // API proxy files
    {
        files: ['api/**/*.js'],
        languageOptions: {
            globals: {
                ...globals.node,
                process: 'readonly',
            },
        },
    },

    // src/config.js reads import.meta.env via process fallback (Vite + Node typecheck)
    {
        files: ['src/config.js'],
        languageOptions: {
            globals: {
                process: 'readonly',
            },
        },
    },

    // Legacy files (more relaxed)
    {
        files: ['app.js', 'api.js', 'config.js', 'i18n.js', 'services/**/*.js'],
        rules: {
            // Very relaxed for legacy code
            'no-unused-vars': 'off',
            'no-undef': 'off',
            'prefer-const': 'off',
        },
    },
];
