let score = 0;
let highScore = 0;
let balance = 0;
let poppedBalloons = 0;
let gameOverFlag = false;
let balloonSpeed = 150;

// Track guest mode (DB only if logged in)
let isGuest = true;

// ✅ Words cache (loaded once)
let wordPairs = [];
let wordsLoaded = false;

function pickRandomWordPair() {
  if (!wordPairs || wordPairs.length === 0) return null;
  const i = Math.floor(Math.random() * wordPairs.length);
  return wordPairs[i] || null;
}

async function loadWordsOnce() {
  if (wordsLoaded) return;
  wordsLoaded = true;

  try {
    const data = await window.Ball10API.words();
    const list = data?.words || [];
    // normalize: [{de,en}]
    wordPairs = list
      .map(w => ({
        de: String(w.de || "").trim(),
        en: String(w.en || "").trim()
      }))
      .filter(w => w.de && w.en);

    console.log("Words loaded:", wordPairs.length);
  } catch (e) {
    console.warn("Words load failed:", e?.message || e);
    wordPairs = []; // fallback: no words shown
  }
}

async function initUserStateFromDbIfLoggedIn() {
  try {
    const user = await window.Ball10Auth.restoreFromDb();
    if (user) {
      isGuest = false;
      highScore = Number(user.highscore || 0);
      balance = Number(user.balance || 0);
      return;
    }
  } catch (_) {}

  // Guest fallback
  isGuest = true;
  highScore = 0;
  balance = 100;
}

async function saveToDb() {
  const token = window.Ball10Auth.getToken();
  if (!token) return; // guest => no DB save
  try {
    await window.Ball10API.save(token, highScore, balance);
  } catch (e) {
    console.warn("Save failed:", e?.message || e);
  }
}

// ====== AUTH SCENE ======
class Auth extends Phaser.Scene {
  constructor() { super({ key: "Auth" }); }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 160, "Ball-10", { fontSize: "44px", fill: "#fff" }).setOrigin(0.5);

    this.status = this.add.text(cx, cy - 100, "Choose an option:", {
      fontSize: "16px", fill: "#ddd", align: "center"
    }).setOrigin(0.5);

    // LOGIN button
    this.add.text(cx, cy - 40, "Login", { fontSize: "26px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        this.status.setText("Logging in...");
        try {
          await window.Ball10Auth.promptLogin();
          await initUserStateFromDbIfLoggedIn();
          this.scene.start("MainMenu");
        } catch (e) {
          const msg = e?.message || String(e);
          this.status.setText(`Login failed: ${msg}`);
          window.Ball10Auth.showAlert(`Login failed: ${msg}`, true);
        }
      });

    // REGISTER button
    this.add.text(cx, cy + 25, "Register", { fontSize: "22px", fill: "#0ff" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        this.status.setText("Creating account...");
        try {
          await window.Ball10Auth.promptRegister();
          this.status.setText("Account created. Now login.");
        } catch (e) {
          const msg = e?.message || String(e);
          this.status.setText(`Register failed: ${msg}`);
          window.Ball10Auth.showAlert(`Register failed: ${msg}`, true);
        }
      });

    // GUEST PLAY button
    this.add.text(cx, cy + 90, "Play as Guest", { fontSize: "20px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", async () => {
        await initUserStateFromDbIfLoggedIn(); // will set guest if no session
        isGuest = true;
        highScore = 0;
        balance = 100;
        this.scene.start("MainMenu");
      });

    this.add.text(cx, cy + 140,
      "Guest: no cloud save / no leaderboard entry.\nLogin: saves to database + leaderboard.",
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

  async create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const user = window.Ball10Auth.getUser();
    const uname = user?.username || "Guest";

    // ✅ Load words once (cache)
    await loadWordsOnce();

    this.add.text(cx, cy - 160, "Main Menu", { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(cx, cy - 130, `User: ${uname}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    // Start button always
    this.add.text(cx, cy - 95, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(cx, cy - 40, `High Score: ${highScore}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);
    this.add.text(cx, cy - 15, `Balance: ${balance}`, { fontSize: "16px", fill: "#fff" }).setOrigin(0.5);

    // If logged in: show ONLY logout
    if (user) {
      this.add.text(cx, cy + 25, "Logout", { fontSize: "18px", fill: "#ff0" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => {
          window.Ball10Auth.logout();
          this.scene.start("Auth");
        });
    } else {
      // If guest: show login/register entry
      this.add.text(cx, cy + 25, "Login / Register", { fontSize: "18px", fill: "#0ff" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => this.scene.start("Auth"));
    }

    // Leaderboard (show always, but guest doesn't submit)
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
    } catch {
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

// ====== PLAY GAME ======
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

attachWordTextToBalloon(balloon) {
  const pair = pickRandomWordPair();
  if (!pair) return;

  // ✅ White text (high contrast on blue balloon)
  const styleTop = {
    fontSize: "16px",
    fill: "#ffffff",
    fontStyle: "bold",
    stroke: "#000000",
    strokeThickness: 2
  };

  const styleBot = {
    fontSize: "16px",
    fill: "#ffffff",
    stroke: "#000000",
    strokeThickness: 2
  };

  const t1 = this.add.text(balloon.x, balloon.y - 18, pair.de, styleTop).setOrigin(0.5);
  const t2 = this.add.text(balloon.x, balloon.y + 2, pair.en, styleBot).setOrigin(0.5);

  t1.setDepth(50);
  t2.setDepth(50);

  balloon.wordTextTop = t1;
  balloon.wordTextBottom = t2;
}

  destroyBalloonTexts(balloon) {
    if (balloon?.wordTextTop) {
      balloon.wordTextTop.destroy();
      balloon.wordTextTop = null;
    }
    if (balloon?.wordTextBottom) {
      balloon.wordTextBottom.destroy();
      balloon.wordTextBottom = null;
    }
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

    // ✅ Only normal (blue) balloon shows words
    if (balloonType === "balloon") {
      this.attachWordTextToBalloon(balloon);
    }
  }

  handleBalloonClick(balloon) {
    if (gameOverFlag || this.isPaused) return;

    if (balloon.texture.key === "redBalloon") {
      this.gameOver();
    } else {
      score++;
      this.scoreText.setText(`Score: ${score}`);

      // ✅ Cleanup texts
      this.destroyBalloonTexts(balloon);
      balloon.destroy();

      if (++poppedBalloons % 5000 === 0) {
        balance += 10;
        this.balanceText.setText(`Balance: ${balance}`);
      }

      // ✅ NEW SPEED RULE: +35 every 10 points
      if (score % 10 === 0) {
        balloonSpeed += 35;
      }
    }
  }

  update() {
    if (gameOverFlag || this.isPaused) return;

    this.balloons.children.iterate(balloon => {
      if (!balloon) return;

      // ✅ Follow balloon position
      if (balloon.wordTextTop) {
        balloon.wordTextTop.x = balloon.x;
        balloon.wordTextTop.y = balloon.y - 18;
      }
      if (balloon.wordTextBottom) {
        balloon.wordTextBottom.x = balloon.x;
        balloon.wordTextBottom.y = balloon.y + 2;
      }

      if (balloon.y > this.cameras.main.height && balloon.texture.key !== "redBalloon") {
        this.gameOver();
      }
    });
  }

  async gameOver() {
    gameOverFlag = true;
    this.physics.pause();

    // ✅ Destroy attached texts before clearing sprites
    this.balloons.children.iterate(balloon => {
      if (balloon) this.destroyBalloonTexts(balloon);
    });

    this.balloons.clear(true, true);

    highScore = Math.max(highScore, score);
    await saveToDb();

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
      await saveToDb();
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
  physics: { default: "arcade", arcade: { debug: false } }
};

(async () => {
  await initUserStateFromDbIfLoggedIn();
  await loadWordsOnce(); // ✅ preload word list once
  const game = new Phaser.Game(config);
  window.addEventListener("resize", () => game.scale.resize(window.innerWidth, window.innerHeight));
})();
