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

        // Phase 05-A1: a promise that resolves as soon as SOME firebase user exists
        // (anonymous guest or real). consumeAiQuota() awaits this so a guest who searches
        // in the first ~100-500ms (before silent anon sign-in completes) still gets a token
        // instead of racing past the quota gate.
        this._firstUser = null;
        this._tokenReady = new Promise((resolve) => { this._firstUserResolve = resolve; });

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
                    // Phase 05-A1: signal token-readiness the first time any user arrives.
                    if (user && this._firstUserResolve) {
                        this._firstUser = user;
                        this._firstUserResolve(user);
                        this._firstUserResolve = null;
                    }
                    // Phase 05-01: an ANONYMOUS user is our silent quota/identity backer,
                    // not a real login. Keep firebaseUser (so getIdToken() can mint a token
                    // for the server-side quota gate) but treat the app-level user as a
                    // guest — identical to the signed-out branch — so optional auth, the
                    // login wall, and requireAuth() social-gating behave exactly as before.
                    if (user && !user.isAnonymous) {
                        this.syncUserToLocal(user);
                    } else {
                        this.currentUser = this.loadLocalUser();
                        // No real user signed in → silently establish an anonymous identity
                        // so every guest has a stable UID + ID token for the free-tier gate.
                        // Guard on `!user` so we don't loop once the anon user arrives, and
                        // never clobber a real session. Best-effort: failure just leaves the
                        // guest tokenless and the gate fails open.
                        if (!user && typeof this.auth.signInAnonymously === 'function') {
                            this.auth.signInAnonymously().catch((err) => {
                                console.warn('[auth] anonymous sign-in failed:', err?.code || err);
                            });
                        }
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
            // Phase 05-01: if the user is currently an anonymous guest, UPGRADE that
            // account in place so its UID (and any server-side state) carries over. Any
            // link failure (e.g. this Google account already exists) falls back to a normal
            // sign-in so login is never blocked — favorites still survive via the
            // localStorage→Firestore migration that runs on the real UID.
            const current = this.auth.currentUser;
            if (current && current.isAnonymous) {
                try {
                    const linked = await current.linkWithPopup(provider);
                    return linked.user;
                } catch (linkErr) {
                    console.warn('[auth] google link failed, signing in fresh:', linkErr?.code || linkErr);
                }
            }
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
            // Phase 05-01: upgrade an anonymous guest in place (linkWithCredential) so its
            // UID carries over; otherwise create a fresh account. If the email already
            // belongs to another account, surface a DISTINGUISHABLE error (code preserved)
            // so the UI can guide the user to sign in instead of showing a generic failure.
            let result;
            const current = this.auth.currentUser;
            if (current && current.isAnonymous) {
                try {
                    const cred = firebase.auth.EmailAuthProvider.credential(email, password);
                    result = await current.linkWithCredential(cred);
                } catch (linkErr) {
                    console.warn('[auth] register link failed, creating fresh:', linkErr?.code || linkErr);
                }
            }
            if (!result) {
                try {
                    result = await this.auth.createUserWithEmailAndPassword(email, password);
                } catch (createErr) {
                    if (createErr?.code === 'auth/email-already-in-use') {
                        const e = new Error('Bu e-posta zaten kayıtlı. Lütfen giriş yap.');
                        e.code = 'auth/email-already-in-use';
                        throw e;
                    }
                    throw createErr;
                }
            }

            // Update profile with display name
            await result.user.updateProfile({ displayName });

            // Create user document in Firestore (merge tolerates a pre-existing doc on the
            // linked UID). `premium` is NEVER written client-side — it is server-authoritative
            // (api/quota.js / RevenueCat webhook in Phase 6).
            if (this.db) {
                await this.db.collection('users').doc(result.user.uid).set({
                    email,
                    displayName,
                    tier: 'free',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
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

    // REMOVED: tester login — Phase 4 will implement proper admin auth

    // ============================================
    // PREMIUM MANAGEMENT
    // ============================================

    // ============================================
    // PROFILE CUSTOMIZATION (Plan 03.2-03)
    // ============================================

    /**
     * Update displayName and/or photoURL.
     * Writes to Firebase Auth, mirrors to Firestore users/{uid}, then re-syncs local.
     * Mitigates T-03.2-03-01 (HTTPS-only photoURL) and T-03.2-03-02 (name length cap).
     */
    async updateUserProfile(displayName, photoURL) {
        const user = this.auth && this.auth.currentUser;
        if (!user) {
            throw new Error('Not logged in');
        }

        const authPayload = {};
        const firestorePayload = {};

        if (displayName !== undefined && displayName !== null) {
            const cleaned = String(displayName).trim().slice(0, 40);
            if (!cleaned) throw new Error('Display name cannot be empty');
            authPayload.displayName = cleaned;
            firestorePayload.displayName = cleaned;
        }
        if (photoURL !== undefined && photoURL !== null) {
            if (!/^https:\/\//i.test(photoURL)) throw new Error('photoURL must use HTTPS');
            authPayload.photoURL = photoURL;
            firestorePayload.photoURL = photoURL;
        }
        if (Object.keys(authPayload).length === 0) return;

        await user.updateProfile(authPayload);

        if (this.db) {
            try {
                await this.db.collection('users').doc(user.uid).update(firestorePayload);
            } catch (err) {
                if (err && (err.code === 'not-found' || /no document/i.test(err.message || ''))) {
                    try {
                        await this.db.collection('users').doc(user.uid).set(firestorePayload, { merge: true });
                    } catch (setErr) {
                        console.warn('[updateUserProfile] Firestore set failed:', setErr);
                    }
                } else {
                    console.warn('[updateUserProfile] Firestore update failed:', err);
                }
            }
        }

        // Re-sync local + dispatch authStateChanged so UI re-renders (Pitfall 3)
        this.syncUserToLocal(this.auth.currentUser);
        window.dispatchEvent(new CustomEvent('authStateChanged', { detail: { user: this.currentUser } }));
    }

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

    // Phase 05-01: mint a Firebase ID token for the server-side quota gate (/api/quota).
    // Works for anonymous guests too. Returns null if Firebase/user is unavailable so
    // callers can degrade gracefully (the gate fails open).
    async getIdToken() {
        try {
            const u = this.auth && this.auth.currentUser;
            return u ? await u.getIdToken() : null;
        } catch {
            return null;
        }
    }

    // Phase 05-A1: wait until some firebase user exists (anon or real), then mint a token.
    // Bounds the wait so a never-arriving auth can't hang the UI; resolves to a token or null.
    // This closes the race where a guest searches before silent anon sign-in completes.
    async waitForToken(timeoutMs = 4000) {
        try {
            if (this.auth && this.auth.currentUser) return await this.getIdToken();
            const timeout = new Promise((resolve) => setTimeout(() => resolve('__timeout__'), timeoutMs));
            const winner = await Promise.race([this._tokenReady, timeout]);
            if (winner === '__timeout__') return await this.getIdToken(); // last-chance read
            return await this.getIdToken();
        } catch {
            return null;
        }
    }

    isLoggedIn() {
        // Anonymous guests are NOT "logged in" for app purposes (see onAuthStateChanged).
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
