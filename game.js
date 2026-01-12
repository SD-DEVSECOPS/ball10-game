// Global game state
window.score = 0;
window.highScore = 0;
window.poppedBalloons = 0;
window.gameOverFlag = false;
window.balloonSpeed = 150;

// Mode
window.isGuest = false;

class AuthGate extends Phaser.Scene {
  constructor() { super({ key: "AuthGate" }); }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 170, "Ball-10", { fontSize: "46px", fill: "#fff" }).setOrigin(0.5);

    this.statusText = this.add.text(
      cx, cy - 95,
      "Choose how you want to play:",
      { fontSize: "16px", fill: "#ddd", align: "center", wordWrap: { width: this.cameras.main.width - 40 } }
    ).setOrigin(0.5);

    // Login with Pi (required for Donate)
    this.loginBtn = this.add.text(cx, cy - 20, "Login with Pi", { fontSize: "28px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.tryAuth());

    // Guest mode
    this.guestBtn = this.add.text(cx, cy + 45, "Continue as Guest", { fontSize: "22px", fill: "#ff0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.continueGuest());

    this.helpText = this.add.text(
      cx, cy + 115,
      "Guest mode: You can play the game, but Donations are disabled.\nTo donate, login with Pi.",
      { fontSize: "13px", fill: "#bbb", align: "center", wordWrap: { width: this.cameras.main.width - 40 } }
    ).setOrigin(0.5);

    this.retryBtn = this.add.text(cx, cy + 160, "Retry Login", { fontSize: "18px", fill: "#0ff" })
      .setOrigin(0.5)
      .setInteractive()
      .setVisible(false)
      .on("pointerdown", () => this.tryAuth());
  }

  continueGuest() {
    window.isGuest = true;
    this.scene.start("MainMenu");
  }

  async tryAuth() {
    this.retryBtn.setVisible(false);
    this.statusText.setText("Authenticating... (tap allowed popup)");
    try {
      window.isGuest = false;

      // Triggered by tap => avoids popup blocking
      await Promise.race([
        window.piApp.authenticate(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timed out.")), 12000))
      ]);

      this.scene.start("MainMenu");
    } catch (e) {
      const msg = e?.message || String(e);
      this.statusText.setText(`Login failed:\n${msg}`);
      this.retryBtn.setVisible(true);
      window.piApp?.showError?.(`Login failed: ${msg}`);
    }
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

    if (window.isGuest) {
      this.add.text(cx, cy - 180, "Main Menu (Guest)", { fontSize: "28px", fill: "#fff" }).setOrigin(0.5);
    } else {
      const username = window.piApp?.user?.username ? window.piApp.user.username : "Pioneer";
      this.add.text(cx, cy - 200, `Welcome ${username}`, { fontSize: "24px", fill: "#fff" }).setOrigin(0.5);
      this.add.text(cx, cy - 165, "Main Menu", { fontSize: "34px", fill: "#fff" }).setOrigin(0.5);
    }

    this.add.text(cx, cy - 70, "Start Game", { fontSize: "28px", fill: "#0f0" })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.startGame());

    this.add.text(cx, cy + 5, "For improvements please Donate!", { fontSize: "18px", fill: "#fff" })
      .setOrigin(0.5);

    if (!window.isGuest) {
      this.add.text(cx, cy + 55, "Donate", { fontSize: "22px", fill: "#0ff" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => this.scene.start("Donate"));

      this.add.text(cx, cy + 110, "Market Coming soon!", { fontSize: "16px", fill: "#bbb" })
        .setOrigin(0.5);
    } else {
      this.add.text(cx, cy + 55, "Donate requires Pi login.", { fontSize: "16px", fill: "#bbb" })
        .setOrigin(0.5);

      this.add.text(cx, cy + 95, "Login with Pi", { fontSize: "20px", fill: "#0ff" })
        .setOrigin(0.5)
        .setInteractive()
        .on("pointerdown", () => {
          // go back to auth screen so user can login later
          this.scene.start("AuthGate");
        });

      this.add.text(cx, cy + 135, "Market Coming soon!", { fontSize: "16px", fill: "#bbb" })
        .setOrigin(0.5);
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

class Donate extends Phaser.Scene {
  constructor() { super({ key: "Donate" }); }

  create() {
    // Safety: if guest somehow reached here
    if (window.isGuest) {
      this.scene.start("MainMenu");
      return;
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 170, "Donate ❤️", {
      fontSize: "34px",
      fill: "#fff"
    }).setOrigin(0.5);

    this.add.text(cx, cy - 130,
      "Support development of Ball-10\n(Real Pi donation)",
      {
        fontSize: "16px",
        fill: "#ddd",
        align: "center"
      }
    ).setOrigin(0.5);

    // Preset amounts
    this.makeButton(cx - 150, cy - 60, "1π", () => this.startDonation(1));
    this.makeButton(cx,       cy - 60, "10π", () => this.startDonation(10));
    this.makeButton(cx + 150, cy - 60, "100π", () => this.startDonation(100));

    // Custom
    this.makeButton(cx, cy + 10, "Custom Amount", () => {
      const choice = prompt("Enter donation amount in Pi (e.g. 1, 10, 100):", "1");
      if (choice === null) return;

      const amount = Number(choice);
      if (!Number.isFinite(amount) || amount <= 0) {
        this.setStatus("Invalid amount.");
        return;
      }

      this.startDonation(amount);
    });

    this.status = this.add.text(cx, cy + 70, "", {
      fontSize: "15px",
      fill: "#fff",
      align: "center",
      wordWrap: { width: this.cameras.main.width - 40 }
    }).setOrigin(0.5);

    this.add.text(cx, cy + 150, "Back to Main Menu", {
      fontSize: "18px",
      fill: "#0f0"
    })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", () => this.scene.start("MainMenu"));
  }

  makeButton(x, y, label, onClick) {
    return this.add.text(x, y, label, {
      fontSize: "22px",
      fill: "#0ff"
    })
      .setOrigin(0.5)
      .setInteractive()
      .on("pointerdown", onClick);
  }

  setStatus(msg) {
    this.status.setText(msg || "");
  }

  startDonation(amount) {
    this.setStatus(`Creating donation (${amount}π)...`);

    window.piApp.createPayment(
      {
        amount,
        memo: "Ball-10 Donation",
        metadata: { kind: "donation", amount }
      },
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
    window.gameOverFlag = false;

    this.balloons = this.physics.add.group();
    this.scoreText = this.add.text(10, 10, `Score: ${window.score}`, { fontSize: "20px", fill: "#fff" });

    // World bounds match screen
    this.physics.world.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height, true, true, true, true);

    // Robust missed-balloon detection (worldbounds)
    this.physics.world.on("worldbounds", (body) => {
      if (window.gameOverFlag) return;
      const obj = body?.gameObject;
      if (!obj) return;

      // Bottom bound hit
      if (body.blocked.down || body.touching.down) {
        if (obj.texture?.key !== "redBalloon") {
          this.gameOver();
        } else {
          obj.destroy();
        }
      }
    });

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

    balloon
      .setVelocityY(window.balloonSpeed)
      .setDisplaySize(80, 120)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.handleBalloonClick(balloon));

    balloon.body.setCollideWorldBounds(true);
    balloon.body.onWorldBounds = true;
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
    if (window.score % 100 === 0) window.balloonSpeed += 10;
  }

  // Backup safety
  update() {
    if (window.gameOverFlag || this.isPaused) return;

    this.balloons.children.iterate((b) => {
      if (!b || !b.active) return;
      if (b.y - (b.displayHeight / 2) > this.cameras.main.height) {
        if (b.texture?.key !== "redBalloon") this.gameOver();
        else b.destroy();
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

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.text(cx, cy - 70,
      `Game Over\nScore: ${window.score}\nHigh Score: ${window.highScore}`,
      { fontSize: "20px", fill: "#fff", align: "center" }).setOrigin(0.5);

    this.createButton("Retry", cy + 10, () => this.restartGame());
    this.createButton("Main Menu", cy + 60, () => this.returnToMenu());
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

  returnToMenu() {
    this.scene.start("MainMenu");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#222",
  scene: [AuthGate, MainMenu, Donate, PlayGame],
  physics: { default: "arcade", arcade: { debug: false } }
};

window.game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  window.game.scale.resize(window.innerWidth, window.innerHeight);
});
