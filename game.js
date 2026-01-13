// ====== ORIGINAL GLOBALS (kept) ======
let score = 0;
let highScore = 0;
let balance = 100;
let poppedBalloons = 0;
let gameOverFlag = false;

// ✅ Difficulty settings
let balloonSpeed = 150;         // start speed (same)
const BASE_BALLOON_SPEED = 150; // keep base
const SPEED_STEP_SCORE = 10;    // every 10 points
const SPEED_STEP_AMOUNT = 35;   // visible increase
const MAX_BALLOON_SPEED = 900;  // cap so it doesn't break

// ====== MODE + STORAGE (minimal) ======
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

// ====== AUTH SCENE (Pi login or Guest) ======
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

    this.add.text(centerX, centerY, "Login", { fontSize: "26px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        this.status.setText("Logging in...");
        try {
          isGuest = false;
          await window.Ball10Auth.ensureLogin();
          await window.Ball10Auth.loadMe(); // pulls balance/highScore
          loadProgress(); // optional local cache if you still use it
          this.scene.start("MainMenu");
        } catch (e) {
          const msg = e?.message || String(e);
          this.status.setText(`Login failed: ${msg}`);
        }
      });

    this.add.text(centerX, centerY + 60, "Continue as Guest", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => {
        isGuest = true;
        loadProgress();
        this.scene.start("MainMenu");
      });

    this.add.text(centerX, centerY + 120,
      "Guest mode: Play only.",
      { fontSize: "13px", fill: "#bbb", align: "center" }
    ).setOrigin(0.5);
  }
}

// ====== MAIN MENU ======
class MainMenu extends Phaser.Scene {
  constructor() {
    super({ key: "MainMenu" });
  }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const title = isGuest ? "Main Menu (Guest)" : "Main Menu";
    this.add.text(centerX, centerY - 140, title, { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);

    const uname = window.Ball10Auth?.getUsername?.() || (isGuest ? "Guest" : "(not logged in)");
    this.add.text(centerX, centerY - 110, `User: ${uname}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(centerX, centerY - 80, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(centerX, centerY + 160, `High Score: ${highScore}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(centerX, centerY + 190, `Balance: ${balance}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
  }

  startGame() {
    score = 0;
    poppedBalloons = 0;
    balloonSpeed = BASE_BALLOON_SPEED; // ✅ reset speed correctly
    this.scene.start("PlayGame");
  }
}

// ====== PLAY GAME (game logic kept, only speed ramp adjusted) ======
class PlayGame extends Phaser.Scene {
  constructor() {
    super({ key: "PlayGame" });
  }

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
    balloonSpeed = BASE_BALLOON_SPEED;
    this.scene.start("MainMenu");
  }

  // ✅ helper: update speed every 10 points (visible)
  recalcSpeedAndApply() {
    const steps = Math.floor(score / SPEED_STEP_SCORE);
    balloonSpeed = Math.min(MAX_BALLOON_SPEED, BASE_BALLOON_SPEED + steps * SPEED_STEP_AMOUNT);

    // apply to current balloons so the change is felt instantly
    this.balloons.children.iterate(b => {
      if (b?.body && b.active) b.setVelocityY(balloonSpeed);
    });
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

      // ✅ update speed every 10 points
      if (score % SPEED_STEP_SCORE === 0) {
        this.recalcSpeedAndApply();
      }

      // keep your reward logic same
      if (++poppedBalloons % 5000 === 0) {
        balance += 10;
        this.balanceText.setText(`Balance: ${balance}`);
        saveProgress();
      }
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
      centerX,
      centerY - 50,
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
    balloonSpeed = BASE_BALLOON_SPEED;
    this.scene.restart();
  }

  continueGame() {
    if (balance >= 10) {
      balance -= 10;
      saveProgress();
      balloonSpeed = BASE_BALLOON_SPEED;
      this.scene.restart();
    } else {
      alert("Not enough points!");
      this.returnToMenu();
    }
  }

  returnToMenu() {
    score = 0;
    balloonSpeed = BASE_BALLOON_SPEED;
    this.scene.start("MainMenu");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  scene: [Auth, MainMenu, PlayGame],
  physics: {
    default: "arcade",
    arcade: { debug: false }
  }
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
