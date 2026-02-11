import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(() => {
    return {
        // Base path for Vercel (root)
        base: '/',

        // Development server
        server: {
            port: 3000,
            open: true,
            cors: true,
        },

        // Build configuration
        build: {
            outDir: 'dist',
            sourcemap: true,
            minify: 'esbuild',
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                },
            },
        },

        // Environment variables
        define: {
            // Make env vars available in the app
            '__APP_VERSION__': JSON.stringify(process.env.npm_package_version),
        },

        // Resolve aliases
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@services': resolve(__dirname, 'src/services'),
                '@utils': resolve(__dirname, 'src/utils'),
            },
        },

        // Preview server (for production build testing)
        preview: {
            port: 4173,
            open: true,
        },
    };
});
