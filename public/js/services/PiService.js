export class PiService {
    static isInitialized = false;

    static async initialize() {
        if (this.isInitialized) return true;
        if (typeof Pi === 'undefined') return false;

        try {
            await Pi.init({ version: '2.0', sandbox: true });
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Pi initialization failed:', error);
            return false;
        }
    }

    static async authenticate() {
        if (!this.isInitialized) throw new Error('Pi SDK not initialized');
        
        return new Promise((resolve, reject) => {
            Pi.authenticate(['username', 'payments', 'wallet_address'], authResult => {
                if (authResult) resolve(authResult);
                else reject(new Error('Authentication cancelled'));
            });
        });
    }

    static async createPayment(amount, memo) {
        if (!this.isInitialized) throw new Error('Pi SDK not initialized');

        const paymentData = {
            amount: amount,
            memo: memo,
            metadata: { 
                productId: "balloon_points", 
                gameVersion: "1.0.0" 
            }
        };

        return new Promise((resolve, reject) => {
            Pi.createPayment(paymentData, {
                onReadyForServerApproval: paymentId => {
                    // Send to your backend
                    this.approvePaymentOnServer(paymentId).then(resolve).catch(reject);
                },
                onReadyForServerCompletion: txid => {
                    // Verify on your backend
                    this.completePaymentOnServer(txid).then(resolve).catch(reject);
                },
                onCancel: () => reject('Payment cancelled'),
                onError: error => reject(error)
            });
        });
    }

    static async approvePaymentOnServer(paymentId) {
        // Implement server-side approval
        const response = await fetch('/api/approve-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Pi.api.getAPISecret()}`
            },
            body: JSON.stringify({ paymentId })
        });
        return response.json();
    }

    static async completePaymentOnServer(txid) {
        // Implement server-side completion
        const response = await fetch('/api/complete-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Pi.api.getAPISecret()}`
            },
            body: JSON.stringify({ txid })
        });
        return response.json();
    }
}
