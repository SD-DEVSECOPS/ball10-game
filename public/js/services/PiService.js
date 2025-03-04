export class PiService {
    static piSDKAvailable = false;
    static isInitialized = false;

    static async initialize() {
        if (typeof Pi === 'undefined') {
            console.error('Pi SDK not loaded');
            return;
        }

        try {
            await Pi.init({
                version: '2.0',
                sandbox: true // Set to false for production
            });
            this.piSDKAvailable = true;
            this.isInitialized = true;
            console.log('Pi SDK initialized successfully');
        } catch (error) {
            console.error('Pi SDK initialization failed:', error);
            this.piSDKAvailable = false;
        }
    }

    static async authenticate() {
        if (!this.isInitialized) {
            throw new Error('Pi SDK not initialized. Call initialize() first.');
        }

        return new Promise((resolve, reject) => {
            Pi.authenticate(['username', 'payments', 'wallet_address'], (authResult) => {
                authResult ? resolve(authResult) : reject('User cancelled authentication');
            });
        });
    }

    static async initiatePayment(paymentData) {
        if (!this.isInitialized) {
            throw new Error('Pi SDK not initialized. Call initialize() first.');
        }

        return new Promise((resolve, reject) => {
            Pi.createPayment(paymentData, {
                onReadyForServerApproval: resolve,
                onReadyForServerCompletion: resolve,
                onCancel: () => reject('Payment cancelled'),
                onError: reject
            });
        });
    }
}
