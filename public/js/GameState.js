// gameState.js
export class GameState {
  constructor() {
    this.piUser = null; // User info from Pi Network
    this.balance = 0; // User's Balloon Points balance
    this.score = 0; // User's score
    this.highScore = 0; // User's high score
    this.gameOverFlag = false; // Game Over flag
    this.balloonSpeed = 100; // Speed of the balloons falling
    this.poppedBalloons = 0; // Counter for popped balloons
  }

  reset() {
    this.score = 0;
    this.gameOverFlag = false;
    this.poppedBalloons = 0;
  }
}
