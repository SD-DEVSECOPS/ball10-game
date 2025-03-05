<<<<<<< HEAD
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
=======
export class GameState {
  static instance = null;

  constructor() {
    if (!GameState.instance) {
      this.reset();
      GameState.instance = this;
    }
    return GameState.instance;
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
  }

  reset() {
    this.score = 0;
<<<<<<< HEAD
    this.gameOverFlag = false;
    this.poppedBalloons = 0;
  }
=======
    this.highScore = 0;
    this.balance = 100;
    this.poppedBalloons = 0;
    this.balloonSpeed = 150;
    this.gameOverFlag = false;
    this.piUser = null; // Store Pi user data
  }

  // Add methods for persistent data if needed
>>>>>>> a41fed085b1a937bb17d84c22117f4c5e663965f
}
