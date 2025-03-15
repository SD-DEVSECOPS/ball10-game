class PiApp {
    constructor() {
        this.user = null;
        this.setupAuthButton();
        this.setupEventListeners();
    }

    setupAuthButton() {
        const authButton = document.getElementById('pi-auth-button');
        authButton.style.display = 'block';
        authButton.addEventListener('click', () => this.handleAuth());
    }

    setupEventListeners() {
        document.addEventListener('paymentInitiated', (e) => this.createPayment(e.detail));
    }

    async handleAuth() {
        try {
            const scopes = ['username', 'payments', 'wallet_address'];
            const authResult = await Pi.authenticate(scopes, this.handleIncompletePayment.bind(this));
            const verifiedUser = await this.verifyAuth(authResult.accessToken);
            
            this.user = verifiedUser;
            this.updateUI();
            this.showMessage(`Welcome ${verifiedUser.username}!`);
        } catch (error) {
            this.showError(`Authentication failed: ${error.message}`);
        }
    }

    async verifyAuth(accessToken) {
        try {
            const response = await fetch('/api/verify-auth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            if (!response.ok) throw new Error('Auth verification failed');
            return await response.json();
        } catch (error) {
            throw new Error('Failed to verify authentication');
        }
    }

    createPayment(paymentData) {
        const callbacks = {
            onReadyForServerApproval: (paymentId) => this.handleApproval(paymentId),
            onReadyForServerCompletion: (paymentId, txid) => this.handleCompletion(paymentId, txid),
            onCancel: (paymentId) => this.showMessage(`Payment ${paymentId} cancelled`),
            onError: (error) => this.showError(`Payment error: ${error.message}`)
        };

        Pi.createPayment(paymentData, callbacks);
    }

    async handleApproval(paymentId) {
        try {
            const response = await fetch('/api/approve-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId })
            });

            if (!response.ok) throw new Error('Payment approval failed');
        } catch (error) {
            this.showError(`Payment approval failed: ${error.message}`);
        }
    }

    async handleCompletion(paymentId, txid) {
        try {
            const response = await fetch('/api/complete-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId, txid })
            });

            if (!response.ok) throw new Error('Payment completion failed');
            
            balance += 1000;
            this.showMessage('1000 Balloon Points Added!');
            if (game.scene.isActive('Market')) {
                game.scene.getScene('Market').scene.restart();
            }
        } catch (error) {
            this.showError(`Payment completion failed: ${error.message}`);
        }
    }

    handleIncompletePayment(payment) {
        this.showError('Found incomplete payment - completing...');
        this.handleCompletion(payment.identifier, payment.transaction?.txid);
    }

    updateUI() {
        const authButton = document.getElementById('pi-auth-button');
        const userInfo = document.getElementById('pi-user-info');
        
        authButton.style.display = 'none';
        userInfo.innerHTML = `
            <div>Logged in as: ${this.user.username}</div>
            <div>Wallet: ${this.user.wallet_address.slice(0, 6)}...${this.user.wallet_address.slice(-4)}</div>
        `;
    }

    showMessage(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'pi-alert pi-success';
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }

    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'pi-alert pi-error';
        alertDiv.textContent = message;
        document.body.appendChild(alertDiv);
        setTimeout(() => alertDiv.remove(), 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.piApp = new PiApp();
});
