let score = 0;
let highScore = 0;
let balance = 100;
let poppedBalloons = 0;
let gameOverFlag = false;
let balloonSpeed = 150;

function loadLocalProgress() {
  try {
    const u = window.Ball10Auth.getUser();
    if (!u) return;
    if (Number.isFinite(u.highscore)) highScore = u.highscore;
    if (Number.isFinite(u.balance)) balance = u.balance;
  } catch (_) {}
}

function syncLocalUser(highscore, newBalance) {
  const u = window.Ball10Auth.getUser();
  if (!u) return;
  const updated = { ...u, highscore, balance: newBalance };
  window.Ball10Auth.setSession(window.Ball10Auth.getToken(), updated);
}

async function saveToServer() {
  const token = window.Ball10Auth.getToken();
  if (!token) return;

  try {
    await window.Ball10API.save(token, highScore, balance);
  } catch (e) {
    // keep silent; don't break game if API fails
    console.warn("Save failed:", e?.message || e);
  }
}

class Auth extends Phaser.Scene {
  constructor() { super({ key: "Auth" }); }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 140, "Ball-10", { fontSize: "44px", fill: "#fff" }).setOrigin(0.5);

    this.status = this.add.text(cx, cy - 70, "Login or Register", {
      fontSize: "16px", fill: "#ddd", align: "center"
    }).setOrigin(0.5);

    this.add.text(cx, cy, "Login / Register", { fontSize: "26px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        this.status.setText("Opening login...");
        try {
          await window.Ball10Auth.promptLoginOrRegister();
          loadLocalProgress();
          this.scene.start("MainMenu");
        } catch (e) {
          const msg = e?.message || String(e);
          this.status.setText(`Auth failed: ${msg}`);
          window.Ball10Auth.showAlert(`Auth failed: ${msg}`, true);
        }
      });

    this.add.text(cx, cy + 70, "Continue Offline", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => {
        // offline = local only
        loadLocalProgress();
        this.scene.start("MainMenu");
      });

    this.add.text(cx, cy + 120,
      "Offline: saves only on this device. Login enables leaderboard + cloud saves.",
      { fontSize: "13px", fill: "#bbb", align: "center" }
    ).setOrigin(0.5);
  }
}

class MainMenu extends Phaser.Scene {
  constructor() { super({ key: "MainMenu" }); }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  async create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 160, "Main Menu", { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);

    const user = window.Ball10Auth.getUser();
    const uname = user?.username || "(offline)";
    this.add.text(cx, cy - 130, `User: ${uname}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(cx, cy - 95, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(cx, cy - 40, `High Score: ${highScore}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(cx, cy - 15, `Balance: ${balance}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(cx, cy + 25, "Login / Register", { fontSize: "18px", fill: "#0ff" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start("Auth"));

    if (user) {
      this.add.text(cx, cy + 55, "Logout", { fontSize: "16px", fill: "#ff0" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => {
          window.Ball10Auth.logout();
          this.scene.start("MainMenu");
        });
    }

    // Leaderboard
    this.lbText = this.add.text(cx, cy + 120, "Leaderboard: loading...", {
      fontSize: "14px", fill: "#ddd", align: "center"
    }).setOrigin(0.5);

    try {
      const data = await window.Ball10API.leaderboard();
      const list = data.leaderboard || [];
      if (!list.length) {
        this.lbText.setText("Leaderboard:\n(no scores yet)");
      } else {
        const lines = list.map((r, i) => `${i + 1}. ${r.username} — ${r.highscore}`);
        this.lbText.setText("Leaderboard:\n" + lines.join("\n"));
      }
    } catch (e) {
      this.lbText.setText("Leaderboard:\n(unavailable)");
    }
  }

  startGame() {
    score = 0;
    poppedBalloons = 0;
    balloonSpeed = 150;
    this.scene.start("PlayGame");
  }
}

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

  async gameOver() {
    gameOverFlag = true;
    this.physics.pause();
    this.balloons.clear(true, true);

    highScore = Math.max(highScore, score);

    // ✅ sync local cached user
    syncLocalUser(highScore, balance);

    // ✅ save to server if logged in (does nothing offline)
    await saveToServer();

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(
      cx, cy - 50,
      `Game Over\nScore: ${score}\nHigh Score: ${highScore}\nBalance: ${balance}`,
      { fontSize: "20px", fill: "#fff", align: "center" }
    ).setOrigin(0.5);

    this.createButton("Retry", cy, () => this.restartGame());
    this.createButton("Continue (10 points)", cy + 50, () => this.continueGame());
    this.createButton("Main Menu", cy + 100, () => this.returnToMenu());
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

  async continueGame() {
    if (balance >= 10) {
      balance -= 10;

      // keep cached user in sync
      syncLocalUser(highScore, balance);
      await saveToServer();

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
  scene: [Auth, MainMenu, PlayGame],
  physics: {
    default: "arcade",
    arcade: { debug: false }
  }
};

loadLocalProgress();
const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
