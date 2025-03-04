export class PiService {
    static isInitialized = false;
    static sandboxMode = true;

    static async initialize() {
        if (this.isInitialized) return true;
        
        try {
            if (typeof Pi === 'undefined') {
                throw new Error('Pi SDK not loaded');
            }

            // Full initialization with error recovery
            await Pi.init({
                version: '2.0',
                sandbox: this.sandboxMode,
                enableAds: false, // Explicitly disable AdsV2
                features: ['PAYMENTS', 'AUTHENTICATION']
            });

            // Feature detection
            if (!Pi.authenticate || !Pi.createPayment) {
                throw new Error('Required Pi features missing');
            }

            this.isInitialized = true;
            return true;

        } catch (error) {
            console.error('PiService initialization failed:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    static async authenticate() {
        await this.initialize();
        
        return new Promise((resolve, reject) => {
            try {
                Pi.authenticate(['username', 'payments', 'wallet_address'], (result) => {
                    if (result) {
                        resolve({
                            user: result.user,
                            accessToken: result.accessToken,
                            scopes: result.scopes
                        });
                    } else {
                        reject(new Error('User cancelled authentication'));
                    }
                });
            } catch (error) {
                reject(new Error(`Authentication failed: ${error.message}`));
            }
        });
    }

    static async createPayment(amount, memo) {
        await this.initialize();
        
        return new Promise((resolve, reject) => {
            try {
                const paymentData = {
                    amount: amount,
                    memo: memo,
                    metadata: {
                        gameVersion: '1.0.0',
                        environment: this.sandboxMode ? 'sandbox' : 'production'
                    },
                    // Explicit payment configuration
                    paymentOptions: {
                        requireCompletion: true,
                        supportAds: false // Disable AdsV2 integration
                    }
                };

                Pi.createPayment(paymentData, {
                    onReadyForServerApproval: (paymentId) => {
                        resolve({ paymentId, status: 'approval_pending' });
                    },
                    onReadyForServerCompletion: (txid) => {
                        resolve({ txid, status: 'completed' });
                    },
                    onCancel: () => {
                        reject(new Error('Payment cancelled by user'));
                    },
                    onError: (error) => {
                        reject(new Error(`Payment error: ${error.message}`));
                    }
