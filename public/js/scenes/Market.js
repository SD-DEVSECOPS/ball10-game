import { GameState } from '../GameState.js';
import { PiService } from '../services/PiService.js';

export class Market extends Phaser.Scene {
    constructor() {
        super({ key: 'Market' });
        this.gameState = new GameState();
        this.errorMessage = null;
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.cleanupPreviousState();
        
        this.add.text(centerX, centerY - 150, 'Market', 
            { fontSize: '32px', fill: '#FFFFFF' }).setOrigin(0.5);

        this.createPurchaseButton(centerX, centerY - 50);
        this.createBalanceDisplay(centerX, centerY + 50);
        this.createBackButton(centerX, centerY + 150);
    }

    cleanupPreviousState() {
        if (this.errorMessage) {
            this.errorMessage.destroy();
            this.errorMessage = null;
        }
    }

    createPurchaseButton(x, y) {
        const button = this.add.text(x, y, 'Buy 1000 Points (1 π)', 
            { fontSize: '24px', fill: '#00FF00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', async () => {
                try {
                    const result = await PiService.createPayment(1, "Balloon Points Purchase");
                    
                    if (result.status === 'approval_pending') {
                        this.handlePaymentApproval(result.paymentId);
                    } else if (result.status === 'completed') {
                        this.handlePaymentCompletion(result.txid);
                    }
                } catch (error) {
                    this.showError(error.message);
                }
            });

        // Add button hover effects
        button.on('pointerover', () => button.setAlpha(0.8));
        button.on('pointerout', () => button.setAlpha(1));
    }

    async handlePaymentApproval(paymentId) {
        try {
            // Implement server-side approval
            const response = await fetch('/api/approve-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paymentId })
            });

            if (!response.ok) throw new Error('Approval failed');
            
            this.gameState.balance += 1000;
            this.updateBalanceDisplay();

        } catch (error) {
            this.showError(`Payment failed: ${error.message}`);
        }
    }

    handlePaymentCompletion(txid) {
        console.log('Payment completed with TXID:', txid);
        this.updateBalanceDisplay();
    }

    createBalanceDisplay(x, y) {
        this.balanceText = this.add.text(x, y, 
            `Balance: ${this.gameState.balance} points`,
            { fontSize: '20px', fill: '#FFFFFF' }
        ).setOrigin(0.5);
    }

    updateBalanceDisplay() {
        this.balanceText.setText(`Balance: ${this.gameState.balance} points`);
    }

    createBackButton(x, y) {
        this.add.text(x, y, 'Back to Menu', 
            { fontSize: '20px', fill: '#FF0000' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('MainMenu'));
    }

    showError(message) {
        this.cleanupPreviousState();
        this.errorMessage = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 50,
            `Error: ${message}`,
            { fontSize: '18px', fill: '#FF0000' }
        ).setOrigin(0.5);
    }
}
