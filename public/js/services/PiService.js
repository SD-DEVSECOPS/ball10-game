export class PiService {
    static isSandbox = true;
    static isInitialized = false;

    static async initialize() {
        if (this.isInitialized) return true;
        
        return new Promise((resolve, reject) => {
            if (typeof Pi === 'undefined') {
                reject(new Error('Pi SDK not loaded'));
                return;
            }

            Pi.init({
                version: '2.0',
                sandbox: this.isSandbox,
                origins: [
                    'https://ball10-game.vercel.app',
                    'https://sandbox.minepi.com'
                ],
                communication: {
                    postMessage: {
                        allowedOrigins: [
                            'https://sandbox.minepi.com',
                            'https://ball10-game.vercel.app'
                        ],
                        validateOrigin: true
                    }
                },
                features: ['PAYMENTS', 'AUTHENTICATION'],
                enableAds: false
            }).then(() => {
                this.isInitialized = true;
                resolve(true);
            }).catch(error => {
                console.error('Pi initialization failed:', error);
                reject(error);
            });
        });
    }

    static async authenticate() {
        if (!this.isInitialized) {
            throw new Error('Pi SDK not initialized. Call initialize() first.');
        }

        return new Promise((resolve, reject) => {
            Pi.authenticate(['username', 'payments', 'wallet_address'], (authResult) => {
                if (authResult) {
                    resolve({
                        user: authResult.user,
                        accessToken: authResult.accessToken
                    });
                } else {
                    reject(new Error('Authentication cancelled by user'));
                }
            });
        });
    }

    static async createPayment(amount, memo) {
        if (!this.isInitialized) {
            throw new Error('Pi SDK not initialized. Call initialize() first.');
        }

        return new Promise((resolve, reject) => {
            Pi.createPayment({
                amount: amount,
                memo: memo,
                metadata: {
                    productId: "balloon_points",
                    environment: this.isSandbox ? "sandbox" : "production"
                },
                paymentOptions: {
                    requireCompletion: true
                }
            }, {
                onReadyForServerApproval: (paymentId) => {
                    resolve({ paymentId, status: 'pending' });
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
            });
        });
    }
}
