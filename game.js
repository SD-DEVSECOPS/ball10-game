let score = 0;
let highScore = 0;
let balance = 100; // Start with 100 balloon points
let poppedBalloons = 0;
let gameOverFlag = false;
let balloonSpeed = 150; // Starting balloon speed
let piSDKAvailable = false; // Detect if Pi SDK is available

// Detect if Pi SDK is available (for sandbox environment or Vercel)
if (typeof Pi !== 'undefined' && Pi !== null) {
    piSDKAvailable = true;
}

class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    preload() {
        this.load.image('balloon', 'balloon.png');
        this.load.image('redBalloon', 'red_balloon.png');
    }

    create() {
        let centerX = this.cameras.main.width / 2;
        let centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 100, 'Main Menu', { fontSize: '30px', fill: '#fff' }).setOrigin(0.5);

        // Start button
        let startButton = this.add.text(centerX, centerY - 50, 'Start', { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                score = 0;
                poppedBalloons = 0;
                balloonSpeed = 150; // Reset speed on restart
                this.scene.start('PlayGame');
            });

        // Show market button for everyone
        this.add.text(centerX, centerY + 50, 'Market', { fontSize: '20px', fill: '#ff0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('Market'));

        this.add.text(centerX, centerY + 100, 'Balloon Balance: ' + balance, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);

        startButton.setInteractive({ useHandCursor: true, pixelPerfect: true });
    }
}

class Market extends Phaser.Scene {
    constructor() {
        super({ key: 'Market' });
    }

    preload() {
        this.load.image('balloon', 'balloon.png');
    }

    create() {
        let centerX = this.cameras.main.width / 2;
        let centerY = this.cameras.main.height / 2;

        // Market offer text
        this.add.text(centerX, centerY - 50, "Market Offer: Pay 1 Pi for 1000 Balloon Points", { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);

        // Buy button
        let buyButton = this.add.text(centerX, centerY + 50, 'Buy Now', { fontSize: '20px', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.initiatePayment());

        // Return to Main Menu button
        let returnButton = this.add.text(centerX, centerY + 100, 'Return to Main Menu', { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('MainMenu'));
    }

    initiatePayment() {
        if (piSDKAvailable) {
            // Request payment from the user
            Pi.requestPayment({
                amount: 1,  // Amount in Pi
                memo: "Purchase 1000 Balloon Points"  // Memo or description of the payment
            }).then(response => {
                if (response.status === 'success') {
                    // If payment is successful
                    balance += 1000; // Add 1000 points to balance
                    console.log('Payment successful');
                    this.scene.start('Market');  // Reload the market scene
                } else {
                    console.log('Payment failed or was cancelled');
                }
            }).catch(error => {
                console.error('Error during payment:', error);
            });
        } else {
            console.log('Pi SDK is not available.');
        }
    }
}

class PlayGame extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayGame' });
    }

    preload() {
        this.load.image('balloon', 'balloon.png');
        this.load.image('redBalloon', 'red_balloon.png');
    }

    create() {
        this.balloons = this.physics.add.group();
        this.scoreText = this.add.text(10, 10, 'Score: ' + score, { fontSize: '20px', fill: '#fff' });
        gameOverFlag = false;

        this.time.addEvent({
            delay: 1200,
            callback: this.dropBalloon,
            callbackScope: this,
            loop: true
        });
    }

    dropBalloon() {
        if (gameOverFlag) return;

        let x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        let balloonType = 'balloon';

        if (score >= 20 && Math.random() < 0.05) {
            balloonType = 'redBalloon';
        }

        let balloon = this.balloons.create(x, 0, balloonType);
        balloon.setVelocityY(balloonSpeed);
        balloon.setDisplaySize(80, 120);

        balloon.setInteractive({ useHandCursor: true, pixelPerfect: true });

        balloon.on('pointerdown', () => {
            if (gameOverFlag) return;
            if (balloon.texture.key === 'redBalloon') {
                this.gameOver();
            } else {
                score++;
                this.scoreText.setText('Score: ' + score);
                balloon.destroy();

                if (++poppedBalloons % 5000 === 0) {
                    balance += 10;
                }

                if (score % 100 === 0) {
                    balloonSpeed += 10; 
                }
            }
        });
    }

    update() {
        if (gameOverFlag) return;

        this.balloons.children.iterate(balloon => {
            if (balloon && balloon.y > this.cameras.main.height) {
                if (balloon.texture.key !== 'redBalloon') {
                    this.gameOver();
                }
            }
        });
    }

    gameOver() {
        gameOverFlag = true;
        this.physics.pause();

        if (score > highScore) {
            highScore = score;
        }

        this.balloons.clear(true, true);

        let centerX = this.cameras.main.width / 2;
        let centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 50, `Game Over\nYour Score: ${score}\nHigh Score: ${highScore}\n\nBalloon Points: ${balance}`,
            { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5);

        this.add.text(centerX, centerY, 'Retry', { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                score = 0;
                poppedBalloons = 0;
                balloonSpeed = 150;
                this.scene.restart();
            });

        this.add.text(centerX, centerY + 50, 'Continue with points', { fontSize: '20px', fill: '#ff0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                if (balance >= 10) {
                    balance -= 10;
                    this.scene.restart();
                } else {
                    alert('Not enough balloon points! Returning to main menu...');
                    this.scene.start('MainMenu');
                }
            });

        this.add.text(centerX, centerY + 100, 'Main Menu', { fontSize: '20px', fill: '#f00' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => {
                this.scene.start('MainMenu');
                balance = 10;
                score = 0;
            });
    }
}

let config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222',
    scene: [MainMenu, Market, PlayGame],
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    }
};

let game = new Phaser.Game(config);

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
