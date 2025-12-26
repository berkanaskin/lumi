/**
 * Auth Service (Mock)
 * Simulates a real backend authentication service.
 * Uses a Service Pattern to allow easy replacement with real API calls later.
 */

class AuthService {
    constructor() {
        this.STORAGE_KEY = 'film_finder_user';
        this.currentUser = this.loadUser();
    }

    loadUser() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    }

    saveUser(user) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        this.currentUser = user;
    }

    /**
     * Simulates a login API call
     * @param {string} provider - 'google', 'apple', 'facebook', 'email'
     * @returns {Promise<Object>} User object
     */
    async login(provider) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockUser = {
                    id: 'u_' + Math.random().toString(36).substr(2, 9),
                    name: this._getRandomName(),
                    email: `user_${Math.floor(Math.random() * 1000)}@example.com`,
                    avatar: this._getProviderAvatar(provider),
                    tier: 'free', // 'guest', 'free', 'premium'
                    provider: provider,
                    joinedAt: new Date().toISOString(),
                    ratings: {}, // MovieID: Rating (1-10)
                    alarms: []   // List of MovieIDs to notify
                };
                this.saveUser(mockUser);
                resolve(mockUser);
            }, 1500); // Simulate network delay
        });
    }

    logout() {
        return new Promise((resolve) => {
            setTimeout(() => {
                localStorage.removeItem(this.STORAGE_KEY);
                this.currentUser = null;
                resolve();
            }, 500);
        });
    }

    /**
     * Simulates upgrading to Premium
     */
    async upgradeToPremium() {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (this.currentUser) {
                    this.currentUser.tier = 'premium';
                    this.saveUser(this.currentUser);
                }
                resolve(this.currentUser);
            }, 1000);
        });
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isPremium() {
        return this.currentUser && this.currentUser.tier === 'premium';
    }

    // --- Helpers ---

    _getRandomName() {
        const names = ['Film Gurusu', 'Sinema Sever', 'Maratoncu', 'İzleyici', 'Sinefil'];
        return names[Math.floor(Math.random() * names.length)];
    }

    _getProviderAvatar(provider) {
        // Simple letter avatars for now
        const letters = {
            google: 'G',
            apple: '',
            facebook: 'f',
            email: '📧'
        };
        return letters[provider] || '👤';
    }
}

// Export a singleton instance
const authService = new AuthService();
window.AuthService = authService; // Expose to window for app.js
