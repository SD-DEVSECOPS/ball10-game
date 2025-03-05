export class PiService {
    static isSandbox = false; // Switch to production mode
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
                features: ['PAYMENTS', 'AUTHENTICATION']
                // Removed enableAds: false
            }).then(() => {
                this.isInitialized = true;
                console.log('Pi SDK initialized successfully');
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
            Pi.authenticate(['username', 'payments', 'wallet_address'], (incompletePayment) => {
                if (incompletePayment) {
                    console.warn('Incomplete payment found:', incompletePayment);
                    // Handle incomplete payment (send to backend for completion)
                }
            }).then((authResult) => {
                if (authResult) {
                    console.log('Authentication successful. Auth result:', authResult);
                    this.verifyAccessToken(authResult.accessToken)
                        .then((userData) => {
                            resolve({
                                user: authResult.user,
                                accessToken: authResult.accessToken,
                                verifiedUserData: userData
                            });
                        })
                        .catch((error) => {
                            console.error('Token verification failed:', error);
                            reject(new Error(`Token verification failed: ${error.message}`));
                        });
                } else {
                    reject(new Error('Authentication cancelled by user'));
                }
            }).catch((error) => {
                console.error('Authentication failed:', error);
                reject(new Error(`Authentication failed: ${error.message}`));
            });
        });
    }

    static async verifyAccessToken(accessToken) {
        try {
            const response = await fetch('https://api.minepi.com/v2/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            if (!response.ok) {
                console.error('Token verification failed. Response:', await response.text());
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const userData = await response.json();
            console.log('Token verification successful. User data:', userData);
            return userData;
        } catch (error) {
            console.error('Token verification error:', error);
            throw error;
        }
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
                    console.log('Payment ready for server approval. Payment ID:', paymentId);
                    resolve({ paymentId, status: 'pending' });
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    console.log('Payment ready for server completion. Payment ID:', paymentId, 'TXID:', txid);
                    resolve({ paymentId, txid, status: 'completed' });
                },
                onCancel: (paymentId) => {
                    console.warn('Payment cancelled. Payment ID:', paymentId);
                    reject(new Error(`Payment ${paymentId} cancelled by user`));
                },
                onError: (error, payment) => {
                    console.error('Payment error:', error, 'Payment:', payment);
                    reject(new Error(`Payment error: ${error.message}`));
                }
            });
        });
    }
}
