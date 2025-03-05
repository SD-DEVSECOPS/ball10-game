// gameState.js
export class GameState {
  static instance = null;

  constructor() {
    if (!GameState.instance) {
      this.reset();
      GameState.instance = this;
    }
    return GameState.instance;
  }

  reset() {
    this.score = 0; // User's score
    this.highScore = 0; // User's high score
    this.balance = 100; // User's initial balance of Balloon Points
    this.poppedBalloons = 0; // Counter for popped balloons
    this.balloonSpeed = 150; // Speed of the balloons falling
    this.gameOverFlag = false; // Game Over flag
    this.piUser = null; // User info from Pi Network
  }

  // You can add methods for saving or updating data here if needed
}
