export class PiService {
    static isSandbox = true; // Set to false for production
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
        const apiUrl = this.isSandbox 
            ? 'https://api.sandbox.minepi.com/v2/me' 
            : 'https://api.minepi.com/v2/me';

        try {
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors' // Ensure CORS mode is enabled
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
}
