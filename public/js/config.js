export const GameConfig = {
  // Phaser Configuration
  phaser: {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222',
    physics: {
      default: 'arcade',
      arcade: { 
        gravity: { y: 0 }, 
        debug: false 
      }
    }
  },

  // Gameplay Settings
  balloon: {
    initialSpeed: 150,   // Starting speed of balloons
    speedIncrement: 10,   // Speed increase per 100 points
    redBalloonThreshold: 20,  // Score needed for red balloons to appear
    redBalloonChance: 0.05    // 5% chance for red balloons after threshold
  },

  // Economy Settings
  economy: {
    pointsPerPurchase: 1000,  // Points gained per Pi payment
    continueCost: 10,          // Cost to continue after game over
    pointsPer5000Balloons: 10 // Points awarded every 5000 popped balloons
  }
};
