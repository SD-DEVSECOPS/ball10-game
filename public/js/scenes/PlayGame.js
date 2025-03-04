import { GameState } from '../GameState.js';
import { GameConfig } from '../config.js';

export class PlayGame extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayGame' });
    this.gameState = new GameState();
  }

  preload() {
    this.load.image('balloon', 'assets/images/balloon.png');
    this.load.image('redBalloon', 'assets/images/red_balloon.png');
  }

  create() {
    this.balloons = this.physics.add.group();
    this.scoreText = this.add.text(10, 10, `Score: ${this.gameState.score}`, { 
      fontSize: '20px', fill: '#fff' 
    });
    
    this.gameState.gameOverFlag = false;
    
    // Balloon drop timer
    this.time.addEvent({
      delay: 1200,
      callback: this.dropBalloon,
      callbackScope: this,
      loop: true
    });
  }

  dropBalloon() {
    if (this.gameState.gameOverFlag) return;

    const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
    let balloonType = 'balloon';

    // Red balloon logic
    if (this.gameState.score >= GameConfig.balloon.redBalloonThreshold && 
        Math.random() < GameConfig.balloon.redBalloonChance) {
      balloonType = 'redBalloon';
    }

    const balloon = this.balloons.create(x, 0, balloonType);
    balloon.setVelocityY(this.gameState.balloonSpeed);
    balloon.setDisplaySize(80, 120);
    balloon.setInteractive({ useHandCursor: true, pixelPerfect: true });

    // Balloon click handler
    balloon.on('pointerdown', () => {
      if (this.gameState.gameOverFlag) return;

      if (balloon.texture.key === 'redBalloon') {
        this.gameOver();
      } else {
        this.gameState.score++;
        this.scoreText.setText(`Score: ${this.gameState.score}`);
        balloon.destroy();

        // Update popped balloons and balance
        if (++this.gameState.poppedBalloons % 5000 === 0) {
          this.gameState.balance += GameConfig.economy.pointsPer5000Balloons;
        }

        // Increase speed every 100 points
        if (this.gameState.score % 100 === 0) {
          this.gameState.balloonSpeed += GameConfig.balloon.speedIncrement;
        }
      }
    });
  }

  update() {
    if (this.gameState.gameOverFlag) return;

    this.balloons.children.iterate(balloon => {
      if (balloon && balloon.y > this.cameras.main.height) {
        if (balloon.texture.key !== 'redBalloon') {
          this.gameOver();
        }
      }
    });
  }

  gameOver() {
    this.gameState.gameOverFlag = true;
    this.physics.pause();
    
    // Update high score
    if (this.gameState.score > this.gameState.highScore) {
      this.gameState.highScore = this.gameState.score;
    }

    this.balloons.clear(true, true);

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Game Over text
    this.add.text(centerX, centerY - 50, 
      `Game Over\nYour Score: ${this.gameState.score}\nHigh Score: ${this.gameState.highScore}\n\nBalloon Points: ${this.gameState.balance}`,
      { fontSize: '20px', fill: '#fff', align: 'center' }
    ).setOrigin(0.5);

    // Retry button
    this.add.text(centerX, centerY + 50, 'Retry', { fontSize: '20px', fill: '#0f0' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.gameState.reset();
        this.scene.restart();
      });

    // Continue with points
    this.add.text(centerX, centerY + 100, 'Continue (10 points)', { fontSize: '20px', fill: '#ff0' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        if (this.gameState.balance >= GameConfig.economy.continueCost) {
          this.gameState.balance -= GameConfig.economy.continueCost;
          this.gameState.gameOverFlag = false;
          this.scene.restart();
        } else {
          alert('Not enough points! Returning to menu...');
          this.scene.start('MainMenu');
        }
      });

    // Main Menu button
    this.add.text(centerX, centerY + 150, 'Main Menu', { fontSize: '20px', fill: '#f00' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.start('MainMenu');
      });
  }
}
