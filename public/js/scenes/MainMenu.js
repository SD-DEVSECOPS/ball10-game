import { GameState } from '../GameState.js';
import { PiService } from '../services/PiService.js';

export class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
    this.gameState = new GameState();
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Displaying game title or intro text
    this.add.text(centerX, centerY - 100, 
      "Welcome to Balloon Game!", 
      { fontSize: '30px', fill: '#fff' }
    ).setOrigin(0.5);

    // Start Game button
    this.createButton(centerX, centerY, 'Start Game', '#0f0', () => {
      if (this.gameState.piUser) {
        this.scene.start('Game');
      } else {
        alert('Please authenticate first!');
      }
    });

    // Authenticate button to log in with Pi Network
    this.createButton(centerX, centerY + 50, 'Authenticate with Pi', '#f00', () => {
      this.authenticateUser();
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

  async authenticateUser() {
    try {
      // Example call to PiService to authenticate the user
      const user = await PiService.authenticate();

      if (user) {
        this.gameState.piUser = user; // Store authenticated Pi user data in game state
        alert('Authentication successful!');
      } else {
        alert('Authentication failed!');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('An error occurred during authentication.');
    }
  }
}
