import { GameState } from '../GameState.js';
import { PiService } from '../services/PiService.js';

export class Market extends Phaser.Scene {
    constructor() {
        super({ key: 'Market' });
        this.gameState = new GameState();
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 100, 'Market', 
            { fontSize: '30px', fill: '#fff' }).setOrigin(0.5);

        this.createPurchaseButton(centerX, centerY);
        this.createBackButton(centerX, centerY + 100);
    }

    createPurchaseButton(x, y) {
        return this.add.text(x, y, 'Buy 1000 Points (1 π)', 
            { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', async () => {
                try {
                    await PiService.initialize();
                    await PiService.createPayment(1, "Balloon Points Purchase");
                    this.gameState.balance += 1000;
                    console.log('New balance:', this.gameState.balance);
                } catch (error) {
                    console.error('Payment failed:', error);
                }
            });
    }

    createBackButton(x, y) {
        return this.add.text(x, y, 'Back to Menu', 
            { fontSize: '20px', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.start('MainMenu'));
    }
}
