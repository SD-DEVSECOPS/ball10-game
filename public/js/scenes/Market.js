<<<<<<< HEAD
// market.js
=======
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
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

<<<<<<< HEAD
=======
    // Buy Now button triggers the payment flow
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
    this.createButton(centerX, centerY + 50, 'Buy Now', '#f00', () => {
      this.initiatePayment();
    });

<<<<<<< HEAD
=======
    // Main Menu button
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
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

<<<<<<< HEAD
=======
  // Start the payment process for purchasing balloon points
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
  async initiatePayment() {
    if (!this.gameState.piUser) {
      alert('Please sign in with Pi first!');
      return;
    }

<<<<<<< HEAD
    const token = this.gameState.piUser.token; // Pi Network token

    try {
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      const result = await response.json();

      if (result.success) {
        // Proceed with payment if the token is valid
        await PiService.initiatePayment({
          amount: 1,
          memo: "Purchase 1000 Balloon Points",
          metadata: { userId: this.gameState.piUser.uid }
        });

        // Update balance after payment
        this.gameState.balance += 1000;
        this.scene.restart();
      } else {
        alert('Authentication failed!');
=======
    try {
      // Start Pi payment process
      const result = await PiService.createPayment(1, 'Purchase 1000 Balloon Points');
      
      // Sync with backend after payment completion
      if (result.status === 'completed') {
        this.gameState.balance += 1000; // Add 1000 points to balance after successful payment
        this.scene.restart(); // Refresh the scene to reflect updated balance
      } else {
        console.error('Payment was not completed or was cancelled');
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
      }
    } catch (error) {
      console.error('Payment Error:', error);
    }
  }
}
