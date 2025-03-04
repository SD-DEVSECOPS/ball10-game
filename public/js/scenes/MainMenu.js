// public/js/scenes/MainMenu.js
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

    // Title
    this.add.text(centerX, centerY - 100, 'Main Menu', {
      fontSize: '30px',
      fill: '#fff'
    }).setOrigin(0.5);

    // Buttons
    this.createButton(centerX, centerY - 50, 'Start Game', () => {
      this.gameState.reset();
      this.scene.start('PlayGame');
    });

    this.createButton(centerX, centerY + 50, 'Market', () => {
      this.scene.start('Market');
    });

    // Pi Login Button
    if (PiService.piSDKAvailable) {
      this.createButton(centerX, centerY + 150, 'Sign In with Pi', () => {
        PiService.authenticate()
          .then(authResult => {
            this.gameState.piUser = authResult.user;
            console.log('Pi authenticated:', authResult.user.username);
          })
          .catch(error => {
            console.error('Pi auth failed:', error);
          });
      });
    }
  }

  // Fixed method name from createButtons to createButton
  createButton(x, y, text, callback) {
    return this.add.text(x, y, text, {
      fontSize: '20px',
      fill: '#0f0'
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })
    .on('pointerdown', callback);
  }
}
