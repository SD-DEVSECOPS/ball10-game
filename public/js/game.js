import { GameConfig } from './config.js';
import { MainMenu } from './scenes/MainMenu.js';
import { Market } from './scenes/Market.js';
import { PlayGame } from './scenes/PlayGame.js';

// Merge Phaser-specific config with your GameConfig
const config = {
  ...GameConfig.phaser, // Spread Phaser settings from config.js
  scene: [MainMenu, Market, PlayGame]
};

const game = new Phaser.Game(config);

// Handle window resize
window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
