// ====== ORIGINAL GLOBALS (kept) ======
let score = 0;
let highScore = 0;
let balance = 100;
let poppedBalloons = 0;
let gameOverFlag = false;
let balloonSpeed = 150;

// ====== NEW: MODE + STORAGE (minimal) ======
let isGuest = false;

function storageKey(name) {
  const uid = window.piApp?.user?.uid;
  const prefix = uid ? `ball10_${uid}` : "ball10_guest";
  return `${prefix}_${name}`;
}

function loadProgress() {
  try {
    const hs = Number(localStorage.getItem(storageKey("highScore")));
    if (Number.isFinite(hs) && hs >= 0) highScore = hs;

    const bal = Number(localStorage.getItem(storageKey("balance")));
    if (Number.isFinite(bal) && bal >= 0) balance = bal;
  } catch (_) {}
}

function saveProgress() {
  try {
    localStorage.setItem(storageKey("highScore"), String(highScore));
    localStorage.setItem(storageKey("balance"), String(balance));
  } catch (_) {}
}

// ====== AUTH SCENE ======
class Auth extends Phaser.Scene {
  constructor() {
    super({ key: "Auth" });
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 140, "Ball-10", { fontSize: "44px", fill: "#fff" }).setOrigin(0.5);

    this.status = this.add.text(centerX, centerY - 70, "Choose a mode:", {
      fontSize: "16px",
      fill: "#ddd",
      align: "center"
    }).setOrigin(0.5);

    // Login with Pi (tap required)
    this.add.text(centerX, centerY, "Login with Pi", { fontSize: "26px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        this.status.setText("Authenticating with Pi...");
        try {
          isGuest = false;

          // ✅ IMPORTANT: only request username on login
          await Promise.race([
            window.piApp.authenticate(["username"]),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timed out.")), 12000))
          ]);

          loadProgress();
          this.scene.start("MainMenu");
        } catch (e) {
          const msg = e?.message || String(e);
          this.status.setText(`Login failed: ${msg}`);
          window.piApp?.showError?.(`Login failed: ${msg}`);
        }
      });

    // Guest mode
    this.add.text(centerX, centerY + 60, "Continue as Guest", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => {
        isGuest = true;
        loadProgress();
        this.scene.start("MainMenu");
      });

    this.add.text(centerX, centerY + 120,
      "Guest mode: Play only. Donations require Pi login.",
      { fontSize: "13px", fill: "#bbb", align: "center" }
    ).setOrigin(0.5);
  }
}

// ====== MAIN MENU ======
class MainMenu extends Phaser.Scene {
  constructor() { super({ key: "MainMenu" }); }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const title = isGuest ? "Main Menu (Guest)" : "Main Menu";
    this.add.text(centerX, centerY - 140, title, { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(centerX, centerY - 80, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(centerX, centerY - 10, "For improvements please Donate!", { fontSize: "18px", fill: "#fff" })
      .setOrigin(0.5);

    if (!isGuest) {
      this.add.text(centerX, centerY + 35, "Donate", { fontSize: "22px", fill: "#0ff" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => this.scene.start("Market"));
    } else {
      this.add.text(centerX, centerY + 35, "Donate requires Pi login", { fontSize: "16px", fill: "#bbb" })
        .setOrigin(0.5);

      this.add.text(centerX, centerY + 70, "Login with Pi", { fontSize: "18px", fill: "#0ff" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => this.scene.start("Auth"));
    }

    this.add.text(centerX, centerY + 160, `High Score: ${highScore}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(centerX, centerY + 190, `Balance: ${balance}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
  }

  startGame() {
    score = 0;
    poppedBalloons = 0;
    balloonSpeed = 150;
    this.scene.start("PlayGame");
  }
}

// ====== MARKET (donation) ======
class Market extends Phaser.Scene {
  constructor() { super({ key: "Market" }); }

  create() {
    if (isGuest) { this.scene.start("MainMenu"); return; }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(centerX, centerY - 160, "Donate ❤️", { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(centerX, centerY - 120, "Choose an amount", { fontSize: "18px", fill: "#ddd" }).setOrigin(0.5);

    this.makeButton(centerX - 140, centerY - 60, "1π",  () => this.donate(1));
    this.makeButton(centerX,       centerY - 60, "10π", () => this.donate(10));
    this.makeButton(centerX + 140, centerY - 60, "100π",() => this.donate(100));

    this.makeButton(centerX, centerY + 5, "Custom", () => {
      const choice = prompt("Enter donation amount in Pi (e.g. 1, 10, 100):", "1");
      if (choice === null) return;
      const amount = Number(choice);
      if (!Number.isFinite(amount) || amount <= 0) {
        this.paymentStatus.setText("Invalid amount.");
        return;
      }
      this.donate(amount);
    });

    this.paymentStatus = this.add.text(centerX, centerY + 70, "", {
      fontSize: "16px",
      fill: "#fff",
      align: "center",
      wordWrap: { width: this.cameras.main.width - 40 }
    }).setOrigin(0.5);

    this.add.text(centerX, centerY + 150, "Return to Main Menu", { fontSize: "20px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start("MainMenu"));
  }

  makeButton(x, y, label, cb) {
    this.add.text(x, y, label, { fontSize: "22px", fill: "#0ff" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", cb);
  }

  async donate(amount) {
    this.paymentStatus.setText(`Creating donation (${amount}π)...`);

    try {
      // ✅ IMPORTANT: request payments permission only now
      await window.piApp.ensurePaymentsPermission();
    } catch (e) {
      this.paymentStatus.setText(`Payments permission failed: ${e?.message || e}`);
      return;
    }

    window.piApp.createPayment(
      { amount, memo: "Ball10 Donation", metadata: { kind: "donation", amount } },
      {
        onStatus: (m) => this.paymentStatus.setText(m),
        onError: (e) => this.paymentStatus.setText(`Donation failed: ${e?.message || e}`)
      }
    ).catch(() => {});
  }
}

// ====== PLAY GAME (unchanged except saveProgress calls already in your file) ======
class PlayGame extends Phaser.Scene {
  constructor() { super({ key: "PlayGame" }); }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    this.balloons = this.physics.add.group();
    this.scoreText = this.add.text(10, 10, `Score: ${score}`, { fontSize: "20px", fill: "#fff" });
    this.balanceText = this.add.text(10, 36, `Balance: ${balance}`, { fontSize: "18px", fill: "#fff" });

    gameOverFlag = false;

    this.time.addEvent({
      delay: 1200,
      callback: this.dropBalloon,
      callbackScope: this,
      loop: true
    });

    this.isPaused = false;
    this.pauseOverlay = null;
    this.input.keyboard.on("keydown-ESC", () => this.togglePause());
  }

  togglePause() {
    if (gameOverFlag) return;
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
      this.physics.resume();
    }
  }

  showPauseMenu() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const bg = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6);
    const title = this.add.text(cx, cy - 80, "Paused", { fontSize: "34px", fill: "#fff" }).setOrigin(0.5);

    const resumeBtn = this.add.text(cx, cy - 10, "Resume", { fontSize: "24px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive().on("pointerdown", () => this.togglePause());

    const menuBtn = this.add.text(cx, cy + 50, "Main Menu (progress lost)", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5).setInteractive().on("pointerdown", () => this.returnToMenuFromPause());

    this.pauseOverlay = [bg, title, resumeBtn, menuBtn];
  }

  hidePauseMenu() {
    if (!this.pauseOverlay) return;
    this.pauseOverlay.forEach(o => o.destroy());
    this.pauseOverlay = null;
  }

  returnToMenuFromPause() {
    this.isPaused = false;
    this.hidePauseMenu();
    score = 0;
    poppedBalloons = 0;
    balloonSpeed = 150;
    this.scene.start("MainMenu");
  }

  dropBalloon() {
    if (gameOverFlag || this.isPaused) return;

    const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
    const balloonType = score >= 20 && Math.random() < 0.05 ? "redBalloon" : "balloon";
    const balloon = this.balloons.create(x, 0, balloonType);

    balloon.setVelocityY(balloonSpeed)
      .setDisplaySize(80, 120)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.handleBalloonClick(balloon));
  }

  handleBalloonClick(balloon) {
    if (gameOverFlag || this.isPaused) return;

    if (balloon.texture.key === "redBalloon") {
      this.gameOver();
    } else {
      score++;
      this.scoreText.setText(`Score: ${score}`);
      balloon.destroy();

      if (++poppedBalloons % 5000 === 0) {
        balance += 10;
        this.balanceText.setText(`Balance: ${balance}`);
        saveProgress();
      }
      if (score % 100 === 0) balloonSpeed += 10;
    }
  }

  update() {
    if (gameOverFlag || this.isPaused) return;
    this.balloons.children.iterate(balloon => {
      if (balloon?.y > this.cameras.main.height && balloon.texture.key !== "redBalloon") {
        this.gameOver();
      }
    });
  }

  gameOver() {
    gameOverFlag = true;
    this.physics.pause();
    this.balloons.clear(true, true);

    highScore = Math.max(highScore, score);
    saveProgress();

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    this.add.text(
      centerX, centerY - 50,
      `Game Over\nScore: ${score}\nHigh Score: ${highScore}\nBalance: ${balance}`,
      { fontSize: "20px", fill: "#fff", align: "center" }
    ).setOrigin(0.5);

    this.createButton("Retry", centerY, () => this.restartGame());
    this.createButton("Continue (10 points)", centerY + 50, () => this.continueGame());
    this.createButton("Main Menu", centerY + 100, () => this.returnToMenu());
  }

  createButton(text, y, callback) {
    this.add.text(this.cameras.main.width / 2, y, text, { fontSize: "20px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", callback);
  }

  restartGame() {
    score = 0;
    poppedBalloons = 0;
    balloonSpeed = 150;
    this.scene.restart();
  }

  continueGame() {
    if (balance >= 10) {
      balance -= 10;
      saveProgress();
      this.scene.restart();
    } else {
      alert("Not enough points!");
      this.returnToMenu();
    }
  }

  returnToMenu() {
    score = 0;
    this.scene.start("MainMenu");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  scene: [Auth, MainMenu, Market, PlayGame],
  physics: { default: "arcade", arcade: { debug: false } }
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
