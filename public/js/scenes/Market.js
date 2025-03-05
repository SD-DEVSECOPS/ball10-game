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

    // Buy Now button triggers the payment flow
    this.createButton(centerX, centerY + 50, 'Buy Now', '#f00', () => {
      this.initiatePayment();
    });

    // Main Menu button
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

  // Start the payment process for purchasing balloon points
  async initiatePayment() {
    if (!this.gameState.piUser) {
      alert('Please sign in with Pi first!');
      return;
    }

    try {
      // Start Pi payment process
      const result = await PiService.createPayment(1, 'Purchase 1000 Balloon Points');
      
      // Sync with backend after payment completion
      if (result.status === 'completed') {
        this.gameState.balance += 1000; // Add 1000 points to balance after successful payment
        this.scene.restart(); // Refresh the scene to reflect updated balance
      } else {
        console.error('Payment was not completed or was cancelled');
      }
    } catch (error) {
      console.error('Payment Error:', error);
    }
  }
}
