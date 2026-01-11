// ============================================
// LUMI STORE SERVICE - RevenueCat Integration
// ============================================

const StoreService = {
    // RevenueCat Configuration
    REVENUECAT_API_KEY: 'YOUR_REVENUECAT_API_KEY', // Placeholder - replace with real key

    // Product IDs
    PRODUCTS: {
        PREMIUM_MONTHLY: 'lumi_premium_monthly',
        PREMIUM_YEARLY: 'lumi_premium_yearly'
    },

    // Entitlement IDs
    ENTITLEMENTS: {
        PREMIUM: 'premium_access'
    },

    // SDK State
    isConfigured: false,
    currentOfferings: null,
    customerInfo: null,

    /**
     * Initialize RevenueCat SDK
     */
    async initialize() {
        try {
            // Check if RevenueCat Purchases SDK is available
            if (typeof Purchases === 'undefined') {
                console.warn('[StoreService] RevenueCat SDK not loaded. Running in demo mode.');
                this.isConfigured = false;
                return false;
            }

            Purchases.setDebugLogsEnabled(true);
            await Purchases.configure({ apiKey: this.REVENUECAT_API_KEY });

            this.isConfigured = true;
            console.log('[StoreService] RevenueCat configured successfully');

            // Get initial customer info
            await this.refreshCustomerInfo();
            return true;
        } catch (error) {
            console.error('[StoreService] Initialization failed:', error);
            this.isConfigured = false;
            return false;
        }
    },

    /**
     * Get available offerings/packages
     * @returns {Promise<Object>} - Available packages
     */
    async getOfferings() {
        if (!this.isConfigured) {
            console.warn('[StoreService] Not configured - returning mock offerings');
            return this.getMockOfferings();
        }

        try {
            const offerings = await Purchases.getOfferings();
            this.currentOfferings = offerings;
            return offerings;
        } catch (error) {
            console.error('[StoreService] Failed to get offerings:', error);
            return this.getMockOfferings();
        }
    },

    /**
     * Purchase a package
     * @param {string} packageId - Package identifier
     * @returns {Promise<Object>} - Purchase result
     */
    async purchasePackage(packageId) {
        if (!this.isConfigured) {
            console.warn('[StoreService] Not configured - simulating purchase');
            return this.simulatePurchase(packageId);
        }

        try {
            const offerings = await this.getOfferings();
            const currentOffering = offerings.current;

            if (!currentOffering) {
                throw new Error('No current offering available');
            }

            const package_ = currentOffering.availablePackages.find(p =>
                p.identifier === packageId || p.product.identifier === packageId
            );

            if (!package_) {
                throw new Error(`Package not found: ${packageId}`);
            }

            const { customerInfo } = await Purchases.purchasePackage({ aPackage: package_ });
            this.customerInfo = customerInfo;

            return {
                success: true,
                customerInfo,
                entitlements: customerInfo.entitlements.active
            };
        } catch (error) {
            if (error.userCancelled) {
                return { success: false, cancelled: true };
            }
            console.error('[StoreService] Purchase failed:', error);
            throw error;
        }
    },

    /**
     * Check if user has premium entitlement
     * @returns {Promise<boolean>}
     */
    async checkPremiumAccess() {
        if (!this.isConfigured) {
            // Check localStorage for tester/demo premium
            const userTier = localStorage.getItem('userTier');
            return userTier === 'premium';
        }

        try {
            const customerInfo = await this.refreshCustomerInfo();
            return customerInfo?.entitlements?.active?.[this.ENTITLEMENTS.PREMIUM] !== undefined;
        } catch (error) {
            console.error('[StoreService] Failed to check entitlements:', error);
            return false;
        }
    },

    /**
     * Get all active entitlements
     * @returns {Promise<Object>}
     */
    async getActiveEntitlements() {
        if (!this.isConfigured) {
            const userTier = localStorage.getItem('userTier');
            if (userTier === 'premium') {
                return { premium_access: { isActive: true } };
            }
            return {};
        }

        try {
            const customerInfo = await this.refreshCustomerInfo();
            return customerInfo?.entitlements?.active || {};
        } catch (error) {
            console.error('[StoreService] Failed to get entitlements:', error);
            return {};
        }
    },

    /**
     * Restore purchases
     * @returns {Promise<Object>}
     */
    async restorePurchases() {
        if (!this.isConfigured) {
            console.warn('[StoreService] Not configured - cannot restore');
            return { success: false, message: 'Store not configured' };
        }

        try {
            const { customerInfo } = await Purchases.restorePurchases();
            this.customerInfo = customerInfo;

            return {
                success: true,
                customerInfo,
                hasPremium: customerInfo.entitlements.active[this.ENTITLEMENTS.PREMIUM] !== undefined
            };
        } catch (error) {
            console.error('[StoreService] Restore failed:', error);
            throw error;
        }
    },

    /**
     * Refresh customer info from RevenueCat
     * @returns {Promise<Object>}
     */
    async refreshCustomerInfo() {
        if (!this.isConfigured) return null;

        try {
            const { customerInfo } = await Purchases.getCustomerInfo();
            this.customerInfo = customerInfo;
            return customerInfo;
        } catch (error) {
            console.error('[StoreService] Failed to refresh customer info:', error);
            return null;
        }
    },

    /**
     * Identify user (link purchases to account)
     * @param {string} userId - User ID from auth system
     */
    async identifyUser(userId) {
        if (!this.isConfigured) return;

        try {
            await Purchases.logIn({ appUserID: userId });
            console.log('[StoreService] User identified:', userId);
        } catch (error) {
            console.error('[StoreService] Failed to identify user:', error);
        }
    },

    /**
     * Log out user (reset to anonymous)
     */
    async logOutUser() {
        if (!this.isConfigured) return;

        try {
            await Purchases.logOut();
            console.log('[StoreService] User logged out from store');
        } catch (error) {
            console.error('[StoreService] Failed to log out:', error);
        }
    },

    // ============================================
    // MOCK/DEMO METHODS (when SDK not available)
    // ============================================

    getMockOfferings() {
        return {
            current: {
                identifier: 'default',
                availablePackages: [
                    {
                        identifier: 'monthly',
                        product: {
                            identifier: this.PRODUCTS.PREMIUM_MONTHLY,
                            title: 'Lumi Premium (Aylık)',
                            description: 'Tüm premium özelliklere erişim',
                            priceString: '₺29,99/ay',
                            price: 29.99,
                            currencyCode: 'TRY'
                        }
                    },
                    {
                        identifier: 'annual',
                        product: {
                            identifier: this.PRODUCTS.PREMIUM_YEARLY,
                            title: 'Lumi Premium (Yıllık)',
                            description: 'Tüm premium özelliklere erişim - 2 ay bedava!',
                            priceString: '₺249,99/yıl',
                            price: 249.99,
                            currencyCode: 'TRY'
                        }
                    }
                ]
            }
        };
    },

    simulatePurchase(packageId) {
        console.log('[StoreService] Simulating purchase for:', packageId);

        // Simulate successful purchase
        localStorage.setItem('userTier', 'premium');

        // Update global state if available
        if (typeof state !== 'undefined') {
            state.userTier = 'premium';
        }

        return {
            success: true,
            simulated: true,
            message: 'Purchase simulated (demo mode)'
        };
    }
};

// Make globally available
window.StoreService = StoreService;

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    StoreService.initialize();
});
