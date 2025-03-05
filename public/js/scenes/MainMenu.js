import { GameState } from '../GameState.js';
import { PiService } from '../services/PiService.js';

export class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenu' });
    this.gameState = new GameState();  // Initialize the game state to track user authentication status
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Displaying game title or intro text
    this.add.text(centerX, centerY - 100, 
      "Welcome to Balloon Game!", 
      { fontSize: '30px', fill: '#fff' }
    ).setOrigin(0.5);

    // Start Game button - Only available if the user is authenticated
    this.createButton(centerX, centerY, 'Start Game', '#0f0', () => {
      if (this.gameState.piUser) {
        this.scene.start('Game'); // Start the actual game
      } else {
        alert('Please authenticate first!');
      }
    });

    // Authenticate button - To log in with Pi Network
    this.createButton(centerX, centerY + 50, 'Authenticate with Pi', '#f00', () => {
      this.authenticateUser();
    });
  }

  // Helper function to create buttons dynamically
  createButton(x, y, text, color, onClick) {
    return this.add.text(x, y, text, { 
      fontSize: '20px', fill: color 
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }

  // Authenticate user via Pi SDK
  async authenticateUser() {
    try {
      // Initialize Pi SDK (ensure it's only done once in your game)
      await PiService.initialize();

      // Authenticate the user through Pi SDK
      const authData = await PiService.authenticate();

      if (authData) {
        this.gameState.piUser = authData.user;  // Store authenticated Pi user data in game state
        alert('Authentication successful!');
      } else {
        alert('Authentication failed!');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert('An error occurred during authentication. Please try again.');
    }
  }
}
