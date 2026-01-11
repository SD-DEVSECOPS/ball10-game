let score = 0;
let highScore = 0;
let balance = 100;
let poppedBalloons = 0;
let gameOverFlag = false;
let balloonSpeed = 150;

class MainMenu extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenu' });
    }

    preload() {
        this.load.image('balloon', 'balloon.png');
        this.load.image('redBalloon', 'red_balloon.png');
    }

    create() {
        window.piApp?.showAuthUI();

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 100, 'Main Menu', { fontSize: '30px', fill: '#fff' }).setOrigin(0.5);

        this.add.text(centerX, centerY - 50, 'Start', { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.startGame());

        this.add.text(centerX, centerY + 50, 'Market', { fontSize: '20px', fill: '#ff0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('Market'));

        this.add.text(centerX, centerY + 100, `Balloon Balance: ${balance}`, { fontSize: '20px', fill: '#fff' }).setOrigin(0.5);
    }

    startGame() {
        score = 0;
        poppedBalloons = 0;
        balloonSpeed = 150;
        this.scene.start('PlayGame');
    }
}

class Market extends Phaser.Scene {
    constructor() {
        super({ key: 'Market' });
    }

    create() {
        window.piApp?.hideAuthUI();

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.add.text(centerX, centerY - 50, "Market Offer: 1000 Balloon Points for 1π",
            { fontSize: '24px', fill: '#fff' }).setOrigin(0.5);

        this.add.text(centerX, centerY + 50, 'Buy with Pi', { fontSize: '24px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.initiatePayment());

        this.paymentStatus = this.add.text(centerX, centerY + 100, '',
            { fontSize: '18px', fill: '#fff' }).setOrigin(0.5);

        this.add.text(centerX, centerY + 150, 'Return to Main Menu',
            { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => this.scene.start('MainMenu'));
    }

    initiatePayment() {
        if (window.piApp?.user) {
            this.paymentStatus.setText('Processing payment...');
            document.dispatchEvent(new CustomEvent('paymentInitiated', {
                detail: {
                    amount: 1,
                    memo: "Balloon Points Purchase",
                    metadata: { product: "balloon_points" }
                }
            }));
        } else {
            this.paymentStatus.setText('Please login first!');
            setTimeout(() => this.paymentStatus.setText(''), 2000);
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
        window.piApp?.hideAuthUI();

        this.balloons = this.physics.add.group();
        this.scoreText = this.add.text(10, 10, `Score: ${score}`, { fontSize: '20px', fill: '#fff' });
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

        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const type = score >= 20 && Math.random() < 0.05 ? 'redBalloon' : 'balloon';
        const balloon = this.balloons.create(x, 0, type);

        balloon.setVelocityY(balloonSpeed)
            .setDisplaySize(80, 120)
            .setInteractive()
            .on('pointerdown', () => this.handleBalloonClick(balloon));
    }

    handleBalloonClick(balloon) {
        if (gameOverFlag) return;

        if (balloon.texture.key === 'redBalloon') {
            this.gameOver();
        } else {
            score++;
            this.scoreText.setText(`Score: ${score}`);
            balloon.destroy();

            if (++poppedBalloons % 5000 === 0) balance += 10;
            if (score % 100 === 0) balloonSpeed += 10;
        }
    }

    update() {
        if (gameOverFlag) return;

        this.balloons.children.iterate(b => {
            if (b?.y > this.cameras.main.height && b.texture.key !== 'redBalloon') {
                this.gameOver();
            }
        });
    }

    gameOver() {
        gameOverFlag = true;
        this.physics.pause();
        this.balloons.clear(true, true);

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        this.add.text(cx, cy - 50,
            `Game Over\nScore: ${score}\nHigh Score: ${highScore}\nBalance: ${balance}`,
            { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5);

        this.createButton('Retry', cy, () => this.scene.restart());
        this.createButton('Main Menu', cy + 50, () => this.scene.start('MainMenu'));
    }

    createButton(text, y, callback) {
        this.add.text(this.cameras.main.width / 2, y, text, { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', callback);
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222',
    scene: [MainMenu, Market, PlayGame],
    physics: { default: 'arcade' }
});

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
