class PiApp {
    constructor() {
        this.user = null;
        this.setupAuthButton();
        this.setupEventListeners();
    }

    setupAuthButton() {
        const authButton = document.getElementById('pi-auth-button');
        authButton.addEventListener('click', () => this.handleAuth());

        // Start hidden – scenes will control visibility
        this.hideAuthUI();
    }

    setupEventListeners() {
        document.addEventListener('paymentInitiated', (e) => this.createPayment(e.detail));
    }

    showAuthUI() {
        const container = document.querySelector('.pi-auth-container');
        const authButton = document.getElementById('pi-auth-button');
        const userInfo = document.getElementById('pi-user-info');

        container.style.display = 'block';

        if (this.user) {
            authButton.style.display = 'none';
            userInfo.style.display = 'block';
        } else {
            userInfo.style.display = 'none';
            authButton.style.display = 'inline-block';
        }
    }

    hideAuthUI() {
        const container = document.querySelector('.pi-auth-container');
        if (container) container.style.display = 'none';
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
        const response = await fetch('/api/verify-auth', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!response.ok) throw new Error('Auth verification failed');
        return await response.json();
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
        await fetch('/api/approve-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId })
        });
    }

    async handleCompletion(paymentId, txid) {
        await fetch('/api/complete-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid })
        });

        balance += 1000;
        this.showMessage('1000 Balloon Points Added!');

        if (game.scene.isActive('Market')) {
            game.scene.getScene('Market').scene.restart();
        }
    }

    handleIncompletePayment(payment) {
        this.handleCompletion(payment.identifier, payment.transaction?.txid);
    }

    updateUI() {
        const authButton = document.getElementById('pi-auth-button');
        const userInfo = document.getElementById('pi-user-info');

        authButton.style.display = 'none';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
            <div>Logged in as: ${this.user.username}</div>
            <div>Wallet: ${this.user.wallet_address.slice(0, 6)}...${this.user.wallet_address.slice(-4)}</div>
        `;

        this.showAuthUI();
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
