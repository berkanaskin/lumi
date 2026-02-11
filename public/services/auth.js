/**
 * LUMI Auth Service
 * Firebase Authentication Integration
 * v0.9.5-rc
 */

class AuthService {
    constructor() {
        this.STORAGE_KEY = 'lumi_user';
        this.currentUser = null;
        this.firebaseUser = null;
        this.isInitialized = false;

        // Initialize Firebase
        this.initFirebase();
    }

    initFirebase() {
        try {
            // Firebase config from config.js
            if (typeof FIREBASE_CONFIG !== 'undefined') {
                firebase.initializeApp(FIREBASE_CONFIG);
                this.auth = firebase.auth();
                this.db = firebase.firestore();

                // Listen for auth state changes
                this.auth.onAuthStateChanged((user) => {
                    this.firebaseUser = user;
                    if (user) {
                        this.syncUserToLocal(user);
                    } else {
                        this.currentUser = this.loadLocalUser();
                    }
                    this.isInitialized = true;
                    window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: this.currentUser } }));
                });
            } else {
                console.warn('Firebase config not found, using local auth');
                this.currentUser = this.loadLocalUser();
                this.isInitialized = true;
            }
        } catch (error) {
            console.error('Firebase init error:', error);
            this.currentUser = this.loadLocalUser();
            this.isInitialized = true;
        }
    }

    loadLocalUser() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    }

    saveLocalUser(user) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
        this.currentUser = user;
    }

    syncUserToLocal(firebaseUser) {
        const user = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Kullanıcı',
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || null,
            tier: 'free', // Will be updated from Firestore
            provider: firebaseUser.providerData[0]?.providerId || 'email',
            joinedAt: firebaseUser.metadata.creationTime,
            emailVerified: firebaseUser.emailVerified
        };

        // Fetch premium status from Firestore
        this.fetchUserTier(firebaseUser.uid).then(tier => {
            user.tier = tier;
            this.saveLocalUser(user);
        });

        this.saveLocalUser(user);
    }

    async fetchUserTier(uid) {
        try {
            if (this.db) {
                const doc = await this.db.collection('users').doc(uid).get();
                if (doc.exists) {
                    return doc.data().tier || 'free';
                }
            }
        } catch (error) {
            console.warn('Error fetching user tier:', error);
        }
        return 'free';
    }

    // ============================================
    // AUTHENTICATION METHODS
    // ============================================

    async loginWithGoogle() {
        // If Firebase is not available, use mock login
        if (!this.auth) {
            console.warn('Firebase not available, using mock login');
            return this.mockLogin('google');
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        try {
            const result = await this.auth.signInWithPopup(provider);
            return result.user;
        } catch (error) {
            console.error('Google login error:', error);
            // Fallback to mock if popup blocked or error
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                return this.mockLogin('google');
            }
            throw error;
        }
    }

    async loginWithEmail(email, password) {
        try {
            const result = await this.auth.signInWithEmailAndPassword(email, password);
            return result.user;
        } catch (error) {
            console.error('Email login error:', error);
            throw error;
        }
    }

    async registerWithEmail(email, password, displayName) {
        try {
            const result = await this.auth.createUserWithEmailAndPassword(email, password);

            // Update profile with display name
            await result.user.updateProfile({ displayName });

            // Create user document in Firestore
            if (this.db) {
                await this.db.collection('users').doc(result.user.uid).set({
                    email,
                    displayName,
                    tier: 'free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            return result.user;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    async logout() {
        try {
            if (this.auth) {
                await this.auth.signOut();
            }
            localStorage.removeItem(this.STORAGE_KEY);
            this.currentUser = null;
            this.firebaseUser = null;
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    // ============================================
    // TESTER & DEMO ACCOUNTS
    // ============================================

    // Mock login for local development (when Firebase is not configured)
    async mockLogin(provider = 'mock') {
        const mockUser = {
            id: 'mock_user_' + Date.now(),
            name: 'Demo Kullanıcı',
            email: 'demo@lumi.app',
            avatar: 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 70),
            tier: 'free',
            provider: provider,
            joinedAt: new Date().toISOString(),
            isMock: true
        };

        this.saveLocalUser(mockUser);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: mockUser } }));
        return mockUser;
    }

    async loginAsTester() {
        // Demo account for testing premium features
        const testerUser = {
            id: 'tester_001',
            name: 'Tester Premium',
            email: 'tester@lumi.app',
            avatar: 'https://i.pravatar.cc/150?img=68',
            tier: 'premium',
            provider: 'tester',
            joinedAt: new Date().toISOString(),
            isTester: true
        };

        this.saveLocalUser(testerUser);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: testerUser } }));
        return testerUser;
    }

    async loginAsTesterFree() {
        // Demo account for testing as regular free user
        const testerUser = {
            id: 'tester_free_001',
            name: 'Test Kullanıcı',
            email: 'free@lumi.app',
            avatar: 'https://i.pravatar.cc/150?img=33',
            tier: 'free',
            provider: 'tester',
            joinedAt: new Date().toISOString(),
            isTester: true
        };

        this.saveLocalUser(testerUser);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: testerUser } }));
        return testerUser;
    }

    // ============================================
    // PREMIUM MANAGEMENT
    // ============================================

    async upgradeToPremium() {
        if (this.currentUser && this.db && this.firebaseUser) {
            await this.db.collection('users').doc(this.firebaseUser.uid).update({
                tier: 'premium',
                premiumSince: firebase.firestore.FieldValue.serverTimestamp()
            });

            this.currentUser.tier = 'premium';
            this.saveLocalUser(this.currentUser);
        }
        return this.currentUser;
    }

    // ============================================
    // GETTERS
    // ============================================

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    isPremium() {
        return this.currentUser && this.currentUser.tier === 'premium';
    }

    isTester() {
        return this.currentUser && this.currentUser.isTester === true;
    }
}

// Export singleton instance
const authService = new AuthService();
window.AuthService = authService;
