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
    this.score = 0;
    this.highScore = 0;
    this.balance = 100;
    this.poppedBalloons = 0;
    this.balloonSpeed = 150;
    this.gameOverFlag = false;
    this.piUser = null; // Store Pi user data
  }

  // Add methods for persistent data if needed
}
