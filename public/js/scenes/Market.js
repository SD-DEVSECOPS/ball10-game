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

    this.add.text(centerX, centerY - 50, 
      "Market Offer: 1 Pi = 1000 Balloon Points", 
      { fontSize: '20px', fill: '#fff' }
    ).setOrigin(0.5);

    this.createButton(centerX, centerY + 50, 'Buy Now', '#f00', () => {
      this.initiatePayment();
    });

    this.createButton(centerX, centerY + 100, 'Main Menu', '#0f0', () => {
      this.scene.start('MainMenu');
    });
  }

  createButton(x, y, text, color, onClick) {
    return this.add.text(x, y, text, { 
      fontSize: '20px', fill: color 
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }

  async initiatePayment() {
    if (!this.gameState.piUser) {
      alert('Please sign in with Pi first!');
      return;
    }

    try {
      await PiService.initiatePayment({
        amount: 1,
        memo: "Purchase 1000 Balloon Points",
        metadata: { userId: this.gameState.piUser.uid }
      });
      
      // TODO: Sync with backend
      this.gameState.balance += 1000;
      this.scene.restart();
    } catch (error) {
      console.error('Payment Error:', error);
    }
  }
}
