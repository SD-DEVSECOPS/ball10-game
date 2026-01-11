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
        gameOverFlag = false;
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

        // --- state ---
        this.isPaused = false;
        this.pauseUI = null;
        this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // --- gameplay setup ---
        this.balloons = this.physics.add.group();
        this.scoreText = this.add.text(10, 10, `Score: ${score}`, { fontSize: '20px', fill: '#fff' });
        gameOverFlag = false;

        this.dropTimer = this.time.addEvent({
            delay: 1200,
            callback: this.dropBalloon,
            callbackScope: this,
            loop: true
        });

        // ESC toggles pause
        this.pauseKey.on('down', () => {
            if (gameOverFlag) return;
            this.togglePause();
        });
    }

    togglePause() {
        if (this.isPaused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    pauseGame() {
        this.isPaused = true;

        // Pause physics + timers (but scene keeps running to display UI)
        this.physics.pause();
        this.dropTimer.paused = true;

        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const cx = w / 2;
        const cy = h / 2;

        // Overlay + menu
        const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.6).setDepth(1000);
        const title = this.add.text(cx, cy - 60, 'Paused', { fontSize: '32px', fill: '#fff' })
            .setOrigin(0.5).setDepth(1001);

        const continueBtn = this.add.text(cx, cy, 'Continue (ESC)', { fontSize: '22px', fill: '#0f0' })
            .setOrigin(0.5).setInteractive().setDepth(1001)
            .on('pointerdown', () => this.resumeGame());

        const menuBtn = this.add.text(cx, cy + 50, 'Return to Main Menu', { fontSize: '22px', fill: '#ff0' })
            .setOrigin(0.5).setInteractive().setDepth(1001)
            .on('pointerdown', () => this.returnToMenuFromPause());

        this.pauseUI = [overlay, title, continueBtn, menuBtn];
    }

    resumeGame() {
        this.isPaused = false;

        // Remove pause UI
        if (this.pauseUI) {
            this.pauseUI.forEach(o => o.destroy());
            this.pauseUI = null;
        }

        // Resume physics + timers
        this.physics.resume();
        this.dropTimer.paused = false;
    }

    returnToMenuFromPause() {
        // progress lost
        this.isPaused = false;
        if (this.pauseUI) {
            this.pauseUI.forEach(o => o.destroy());
            this.pauseUI = null;
        }

        // Reset like your current menu behavior expects
        balance = 100;
        score = 0;
        poppedBalloons = 0;
        balloonSpeed = 150;
        gameOverFlag = false;

        this.scene.start('MainMenu');
    }

    dropBalloon() {
        if (gameOverFlag || this.isPaused) return;

        const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
        const type = score >= 20 && Math.random() < 0.05 ? 'redBalloon' : 'balloon';
        const balloon = this.balloons.create(x, 0, type);

        balloon.setVelocityY(balloonSpeed)
            .setDisplaySize(80, 120)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleBalloonClick(balloon));
    }

    handleBalloonClick(balloon) {
        if (gameOverFlag || this.isPaused) return;

        if (balloon.texture.key === 'redBalloon') {
            this.gameOver();
        } else {
            score++;
            this.scoreText.setText(`Score: ${score}`);
            balloon.destroy();

            poppedBalloons++;
            if (poppedBalloons % 5000 === 0) balance += 10;
            if (score % 100 === 0) balloonSpeed += 10;
        }
    }

    update() {
        if (gameOverFlag || this.isPaused) return;

        this.balloons.children.iterate(b => {
            if (b?.y > this.cameras.main.height && b.texture.key !== 'redBalloon') {
                this.gameOver();
            }
        });
    }

    gameOver() {
        gameOverFlag = true;

        // If paused UI exists, remove it
        if (this.pauseUI) {
            this.pauseUI.forEach(o => o.destroy());
            this.pauseUI = null;
        }

        this.physics.pause();
        this.dropTimer.paused = true;
        this.balloons.clear(true, true);

        // Track high score
        if (score > highScore) highScore = score;

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        this.add.text(cx, cy - 60,
            `Game Over\nScore: ${score}\nHigh Score: ${highScore}\nBalance: ${balance}`,
            { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5);

        this.createButton('Retry', cy + 10, () => this.restartGame());
        this.createButton('Continue (10 points)', cy + 60, () => this.continueGame());
        this.createButton('Main Menu', cy + 110, () => this.returnToMenu());
    }

    createButton(text, y, callback) {
        this.add.text(this.cameras.main.width / 2, y, text, { fontSize: '20px', fill: '#0f0' })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', callback);
    }

    restartGame() {
        score = 0;
        poppedBalloons = 0;
        balloonSpeed = 150;
        gameOverFlag = false;
        this.scene.restart();
    }

    continueGame() {
        if (balance >= 10) {
            balance -= 10;
            gameOverFlag = false;
            this.scene.restart();
        } else {
            alert('Not enough points!');
            this.returnToMenu();
        }
    }

    returnToMenu() {
        balance = 100;
        score = 0;
        poppedBalloons = 0;
        balloonSpeed = 150;
        gameOverFlag = false;
        this.scene.start('MainMenu');
    }
}

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#222',
    scene: [MainMenu, Market, PlayGame],
    physics: {
        default: 'arcade',
        arcade: { debug: false }
    }
});

window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
});
