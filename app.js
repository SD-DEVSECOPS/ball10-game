// --- Mode ---
window.isGuest = false;

// --- Persistent storage helpers (only used when NOT guest) ---
function balanceKey() {
  const uid = window.piApp?.user?.uid;
  return uid ? `ball10_balance_${uid}` : "ball10_balance_guest";
}
window.loadBalance = function () {
  try {
    const raw = localStorage.getItem(balanceKey());
    const n = raw === null ? null : Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch (_) {}
  return null;
};
window.saveBalance = function () {
  try {
    localStorage.setItem(balanceKey(), String(window.balance ?? 0));
  } catch (_) {}
};

// --- Default values ---
window.score = 0;
window.highScore = 0;
window.balance = 100;
window.poppedBalloons = 0;
window.gameOverFlag = false;
window.balloonSpeed = 150;

class AuthGate extends Phaser.Scene {
  constructor() { super({ key: "AuthGate" }); }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 160, "Ball-10", { fontSize: "44px", fill: "#fff" }).setOrigin(0.5);

    this.statusText = this.add.text(cx, cy - 90, "Choose a mode", {
      fontSize: "18px", fill: "#fff", align: "center"
    }).setOrigin(0.5);

    // Login button
    this.loginBtn = this.add.text(cx, cy - 10, "Login with Pi", { fontSize: "26px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.tryAuth());

    // Guest button
    this.guestBtn = this.add.text(cx, cy + 55, "Continue as Guest", { fontSize: "22px", fill: "#ff0" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.continueGuest());

    this.add.text(cx, cy + 120,
      "Guest mode: You can play, but you cannot use Market or Points.\nPi login is required for donations and purchases.",
      { fontSize: "13px", fill: "#ddd", align: "center", wordWrap: { width: this.cameras.main.width - 40 } }
    ).setOrigin(0.5);
  }

  async tryAuth() {
    this.statusText.setText("Authenticating with Pi...");
    try {
      window.isGuest = false;

      await Promise.race([
        window.piApp.ensureAuthenticated(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timed out.")), 12000))
      ]);

      // Load per-user balance
      const saved = window.loadBalance();
      if (saved !== null) window.balance = saved;
      else window.saveBalance();

      this.scene.start("MainMenu");
    } catch (e) {
      this.statusText.setText(`Login failed:\n${e?.message || e}`);
    }
  }

  continueGuest() {
    window.isGuest = true;
    // In guest mode, we do not persist or allow points economy
    window.balance = 0;
    this.scene.start("MainMenu");
  }
}

class MainMenu extends Phaser.Scene {
  constructor() { super({ key: "MainMenu" }); }

  preload() {
    this.load.image("balloon", "balloon.png");
    this.load.image("redBalloon", "red_balloon.png");
  }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const username = (!window.isGuest && window.piApp?.user?.username) ? ` (${window.piApp.user.username})` : "";
    const title = window.isGuest ? "Main Menu (Guest)" : `Main Menu${username}`;

    this.add.text(cx, cy - 140, title, { fontSize: "28px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(cx, cy - 60, "Start", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.startGame());

    if (!window.isGuest) {
      this.add.text(cx, cy + 10, "Market", { fontSize: "22px", fill: "#ff0" })
        .setOrigin(0.5).setInteractive()
        .on("pointerdown", () => this.scene.start("Market"));

      this.add.text(cx, cy + 90, `Balloon Balance: ${window.balance}`, { fontSize: "18px", fill: "#fff" }).setOrigin(0.5);
    } else {
      this.add.text(cx, cy + 30, "Market is disabled in Guest mode.", { fontSize: "16px", fill: "#ddd" }).setOrigin(0.5);
    }
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
  constructor() { super({ key: "Market" }); }

  create() {
    if (window.isGuest) {
      // Safety: if someone tries to open Market in guest mode
      this.scene.start("MainMenu");
      return;
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 160, "Market", { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(cx, cy - 120, "Offer: 1000 Balloon Points for 1π", { fontSize: "18px", fill: "#fff" }).setOrigin(0.5);

    this.add.text(cx, cy - 80, "Buy 1000 Points (1π)", { fontSize: "22px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.buyPoints());

    this.add.text(cx, cy - 10, "Donation ❤️", { fontSize: "22px", fill: "#ff0" }).setOrigin(0.5);

    this.add.text(cx, cy + 30, "Donate (choose amount)", { fontSize: "20px", fill: "#0ff" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.donateChooseAmount());

    this.status = this.add.text(cx, cy + 80, "", {
      fontSize: "15px", fill: "#fff", align: "center",
      wordWrap: { width: this.cameras.main.width - 40 }
    }).setOrigin(0.5);

    this.balanceText = this.add.text(cx, cy + 140, `Balance: ${window.balance}`, { fontSize: "18px", fill: "#fff" })
      .setOrigin(0.5);

    this.add.text(cx, cy + 210, "Return to Main Menu", { fontSize: "18px", fill: "#0f0" })
      .setOrigin(0.5).setInteractive()
      .on("pointerdown", () => this.scene.start("MainMenu"));
  }

  setStatus(msg) { this.status.setText(msg || ""); }
  refreshBalance() { this.balanceText.setText(`Balance: ${window.balance}`); }

  async buyPoints() {
    if (!window.piApp?.user) { this.setStatus("Not logged in."); return; }

    // ✅ Acknowledge device-only storage BEFORE payment
    const ok = await window.piApp.confirmDeviceOnlyPoints();
    if (!ok) {
      this.setStatus("Purchase cancelled. You must acknowledge the device-only storage warning.");
      return;
    }

    this.setStatus("Creating payment...");

    window.piApp.createPayment(
      { amount: 1, memo: "Balloon Points Purchase", metadata: { kind: "balloon_points", amount: 1 } },
      {
        onStatus: (m) => { this.setStatus(m); this.refreshBalance(); },
        onError: (e) => this.setStatus(`Payment failed: ${e?.message || e}`)
      }
    ).then(() => this.refreshBalance()).catch(() => {});
  }

  donateChooseAmount() {
    if (!window.piApp?.user) { this.setStatus("Not logged in."); return; }

    const choice = prompt("Enter donation amount in Pi (e.g. 0.1, 0.5, 1):", "0.1");
    if (choice === null) return;

    const amount = Number(choice);
    if (!Number.isFinite(amount) || amount <= 0) { this.setStatus("Invalid amount."); return; }

    this.setStatus("Creating donation payment...");

    window.piApp.createPayment(
      { amount, memo: "Ball10 Donation", metadata: { kind: "donation", amount } },
      {
        onStatus: (m) => this.setStatus(m),
        onError: (e) => this.setStatus(`Donation failed: ${e?.message || e}`)
      }
    ).catch(() => {});
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
    this.scoreText = this.add.text(10, 10, `Score: ${window.score}`, { fontSize: "20px", fill: "#fff" });

    // In guest mode, don't show balance
    this.balanceText = this.add.text(10, 36,
      window.isGuest ? "Guest mode" : `Balance: ${window.balance}`,
      { fontSize: "18px", fill: "#fff" }
    );

    window.gameOverFlag = false;

    // ESC pause
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

    window.score = 0;
    window.poppedBalloons = 0;
    window.balloonSpeed = 150;
    window.gameOverFlag = false;

    this.scene.start("MainMenu");
  }

  dropBalloon() {
    if (window.gameOverFlag || this.isPaused) return;

    const x = Phaser.Math.Between(50, this.cameras.main.width - 50);
    const type = window.score >= 20 && Math.random() < 0.05 ? "redBalloon" : "balloon";
    const balloon = this.balloons.create(x, 0, type);

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

    // In guest mode, no points economy
    if (!window.isGuest) {
      if (window.poppedBalloons % 5000 === 0) {
        window.balance += 10;
        window.saveBalance();
      }
      this.balanceText.setText(`Balance: ${window.balance}`);
    }

    if (window.score % 100 === 0) window.balloonSpeed += 10;
  }

  gameOver() {
    window.gameOverFlag = true;
    this.physics.pause();
    this.dropTimer.paused = true;
    this.hidePauseMenu();

    this.balloons.clear(true, true);
    window.highScore = Math.max(window.highScore, window.score);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 70,
      `Game Over\nScore: ${window.score}\nHigh Score: ${window.highScore}`,
      { fontSize: "20px", fill: "#fff", align: "center" }).setOrigin(0.5);

    this.createButton("Retry", cy + 10, () => this.restartGame());

    // In guest mode, disable Continue spending
    if (!window.isGuest) {
      this.createButton("Continue (10 points)", cy + 60, () => this.continueGame());
    }

    this.createButton("Main Menu", cy + 110, () => this.returnToMenu());
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
      window.saveBalance();
      window.gameOverFlag = false;
      this.scene.restart();
    } else {
      alert("Not enough points!");
      this.returnToMenu();
    }
  }

  returnToMenu() {
    this.scene.start("MainMenu");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  scene: [AuthGate, MainMenu, Market, PlayGame],
  physics: { default: "arcade", arcade: { debug: false } }
};

window.game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  window.game.scale.resize(window.innerWidth, window.innerHeight);
});
