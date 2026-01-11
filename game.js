// Global game state
window.score = 0;
window.highScore = 0;
window.balance = 100;
window.poppedBalloons = 0;
window.gameOverFlag = false;
window.balloonSpeed = 150;

function notifyScene(sceneKey) {
  document.dispatchEvent(new CustomEvent("sceneChanged", { detail: { sceneKey } }));
}

class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenu" });
  }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    notifyScene("MainMenu");

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 120, "Main Menu", { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(centerX, centerY - 60, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(centerX, centerY + 10, "Market", { fontSize: "22px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start("Market"));

    this.add.text(centerX, centerY + 90, `Balloon Balance: ${window.balance}`, { fontSize: "18px", fill: "#fff" }).setOrigin(0.5);

    // Login butonu kontrolü (sadece MainMenu’de göster)
    if (window.piApp?.onSceneChanged) window.piApp.onSceneChanged("MainMenu");
  }

  startGame() {
    window.score = 0;
    window.poppedBalloons = 0;
    window.balloonSpeed = 150;
    window.gameOverFlag = false;
    this.scene.start("PlayGame");
  }
}

class Market extends Phaser.Scene {
  constructor() {
    super({ key: "Market" });
  }

  create() {
    notifyScene("Market");

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 70, "Market Offer: 1000 Balloon Points for 1π",
      { fontSize: "22px", fill: "#fff", align: "center" }).setOrigin(0.5);

    this.add.text(centerX, centerY + 10, "Buy with Pi", { fontSize: "24px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.initiatePayment());

    this.paymentStatus = this.add.text(centerX, centerY + 60, "",
      { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(centerX, centerY + 130, `Balance: ${window.balance}`, { fontSize: "18px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(centerX, centerY + 190, "Return to Main Menu", { fontSize: "18px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start("MainMenu"));
  }

  initiatePayment() {
    if (window.piApp?.user) {
      this.paymentStatus.setText("Processing payment...");

      const event = new CustomEvent("paymentInitiated", {
        detail: {
          amount: 1,
          memo: "Balloon Points Purchase",
          metadata: {
            product: "balloon_points"
          }
        }
      });

      document.dispatchEvent(event);
      setTimeout(() => this.paymentStatus.setText(""), 1500);
    } else {
      this.paymentStatus.setText("Please login first!");
      setTimeout(() => this.paymentStatus.setText(""), 2000);
    }
  }
}

class PlayGame extends Phaser.Scene {
  constructor() {
    super({ key: "PlayGame" });
  }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    notifyScene("PlayGame");

    this.balloons = this.physics.add.group();
    this.scoreText = this.add.text(10, 10, `Score: ${window.score}`, { fontSize: "20px", fill: "#fff" });
    this.balanceText = this.add.text(10, 36, `Balance: ${window.balance}`, { fontSize: "18px", fill: "#fff" });

    window.gameOverFlag = false;

    // ESC Pause
    this.isPaused = false;
    this.pauseOverlay = null;
    this.input.keyboard.on("keydown-ESC", () => this.togglePause());

    this.dropTimer = this.time.addEvent({
      delay: 1200,
      callback: this.dropBalloon,
      callbackScope: this,
      loop: true
    });
  }

  togglePause() {
    if (window.gameOverFlag) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.dropTimer.paused = true;
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
      this.physics.resume();
      this.dropTimer.paused = false;
    }
  }

  showPauseMenu() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const bg = this.add.rectangle(centerX, centerY, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6);
    const title = this.add.text(centerX, centerY - 80, "Paused", { fontSize: "34px", fill: "#fff" }).setOrigin(0.5);

    const resumeBtn = this.add.text(centerX, centerY - 10, "Resume", { fontSize: "24px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive().on("pointerdown", () => this.togglePause());

    const menuBtn = this.add.text(centerX, centerY + 50, "Main Menu (progress lost)", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5).setInteractive().on("pointerdown", () => this.returnToMenuFromPause());

    this.pauseOverlay = [bg, title, resumeBtn, menuBtn];
  }

  hidePauseMenu() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.forEach(o => o.destroy());
    this.pauseOverlay = null;
  }

  returnToMenuFromPause() {
    // progress lost
    this.isPaused = false;
    this.hidePauseMenu();

    // reset game progress like your rule
    window.score = 0;
    window.poppedBalloons = 0;
    window.balloonSpeed = 150;
    window.gameOverFlag = false;

    this.scene.start("MainMenu");
  }

  dropBalloon() {
    if (window.gameOverFlag || this.isPaused) return;

    const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
    const balloonType = window.score >= 20 && Math.random() < 0.05 ? "redBalloon" : "balloon";
    const balloon = this.balloons.create(x, 0, balloonType);

    balloon.setVelocityY(window.balloonSpeed)
      .setDisplaySize(80, 120)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.handleBalloonClick(balloon));
  }

  handleBalloonClick(balloon) {
    if (window.gameOverFlag || this.isPaused) return;

    if (balloon.texture.key === "redBalloon") {
      this.gameOver();
      return;
    }

    window.score++;
    this.scoreText.setText(`Score: ${window.score}`);
    balloon.destroy();

    window.poppedBalloons++;
    if (window.poppedBalloons % 5000 === 0) window.balance += 10;
    if (window.score % 100 === 0) window.balloonSpeed += 10;

    this.balanceText.setText(`Balance: ${window.balance}`);
  }

  update() {
    if (window.gameOverFlag || this.isPaused) return;

    this.balloons.children.iterate(balloon => {
      if (balloon?.y > this.cameras.main.height && balloon.texture.key !== "redBalloon") {
        this.gameOver();
      }
    });
  }

  gameOver() {
    window.gameOverFlag = true;
    this.physics.pause();
    this.dropTimer.paused = true;
    this.hidePauseMenu();

    this.balloons.clear(true, true);
    window.highScore = Math.max(window.highScore, window.score);

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 70,
      `Game Over\nScore: ${window.score}\nHigh Score: ${window.highScore}\nBalance: ${window.balance}`,
      { fontSize: "20px", fill: "#fff", align: "center" }).setOrigin(0.5);

    this.createButton("Retry", centerY + 10, () => this.restartGame());
    this.createButton("Continue (10 points)", centerY + 60, () => this.continueGame());
    this.createButton("Main Menu", centerY + 110, () => this.returnToMenu());
  }

  createButton(text, y, callback) {
    this.add.text(this.cameras.main.width / 2, y, text, { fontSize: "20px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", callback);
  }

  restartGame() {
    window.score = 0;
    window.poppedBalloons = 0;
    window.balloonSpeed = 150;
    window.gameOverFlag = false;
    this.scene.restart();
  }

  continueGame() {
    if (window.balance >= 10) {
      window.balance -= 10;
      window.gameOverFlag = false;
      this.scene.restart();
    } else {
      alert("Not enough points!");
      this.returnToMenu();
    }
  }

  returnToMenu() {
    // senin eski kuralın: menuye dönünce reset
    window.balance = 100;
    window.score = 0;
    window.poppedBalloons = 0;
    window.balloonSpeed = 150;
    window.gameOverFlag = false;
    this.scene.start("MainMenu");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  scene: [MainMenu, Market, PlayGame],
  physics: {
    default: "arcade",
    arcade: { debug: false }
  }
};

window.game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  window.game.scale.resize(window.innerWidth, window.innerHeight);
});
