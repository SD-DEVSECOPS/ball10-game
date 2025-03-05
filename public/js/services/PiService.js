export class PiService {
    static isSandbox = true; // Set to false for production
    static isInitialized = false;
    static backendUrl = 'https://your-backend.com'; // Replace with your backend URL

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
            const response = await fetch(`${this.backendUrl}/api/verify-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ accessToken })
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
                    this.approvePayment(paymentId)
                        .then(() => resolve({ paymentId, status: 'pending' }))
                        .catch((error) => reject(error));
                },
                onReadyForServerCompletion: (paymentId, txid) => {
                    console.log('Payment ready for server completion. Payment ID:', paymentId, 'TXID:', txid);
                    this.completePayment(paymentId, txid)
                        .then(() => resolve({ paymentId, txid, status: 'completed' }))
                        .catch((error) => reject(error));
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

    static async approvePayment(paymentId) {
        try {
            const response = await fetch(`${this.backendUrl}/api/approve-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ paymentId })
            });

            if (!response.ok) {
                console.error('Payment approval failed. Response:', await response.text());
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Payment approved:', result);
            return result;
        } catch (error) {
            console.error('Payment approval error:', error);
            throw error;
        }
    }

    static async completePayment(paymentId, txid) {
        try {
            const response = await fetch(`${this.backendUrl}/api/complete-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ paymentId, txid })
            });

            if (!response.ok) {
                console.error('Payment completion failed. Response:', await response.text());
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Payment completed:', result);
            return result;
        } catch (error) {
            console.error('Payment completion error:', error);
            throw error;
        }
    }
}
