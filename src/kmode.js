// src/kmode.js
// Knowledge Run mode (no leaderboard, personal best saved to DB as knowledge_score)

(function () {
  class KnowledgeMode extends Phaser.Scene {
    constructor() {
      super({ key: "KnowledgeMode" });

      this.kScore = 0;
      this.kBest = 0;
      this.lives = 3;

      // ✅ Speed should be readable
      this.baseSpeed = 100;
      this.maxSpeed = 300;
      this.fallSpeed = this.baseSpeed;

      this.wordY = 60;
      this.wordX = 0;

      this.active = false;
      this.currentPair = null;
      this.optionTexts = [];
      this.wordText = null;
      this.infoText = null;
      this.livesText = null;
      this.scoreText = null;
      this.bestText = null;

      this.optionPositions = [];
    }

    async create() {
      await this.ensureWords();
      await this.loadBestFromDb();

      const w = this.cameras.main.width;

      this.kScore = 0;
      this.lives = 3;
      this.fallSpeed = this.baseSpeed;

      // UI top-left
      this.scoreText = this.add.text(10, 10, `K-Score: ${this.kScore}`, { fontSize: "20px", fill: "#fff" });
      this.livesText = this.add.text(10, 36, `Lives: ${this.lives}/3`, { fontSize: "18px", fill: "#fff" });

      // UI top-right
      this.bestText = this.add.text(w - 10, 10, `Best: ${this.kBest}`, { fontSize: "12px", fill: "#fff" })
        .setOrigin(1, 0);

      // Info line
      this.infoText = this.add.text(w / 2, 70, "Match the correct English word", {
        fontSize: "14px",
        fill: "#ddd"
      }).setOrigin(0.5, 0.5);

      // Back button
      this.add.text(w - 10, 34, "Back", { fontSize: "14px", fill: "#ff0" })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("MainMenu"));

      // Keep right-side UI pinned on resize
      this.scale.on("resize", () => {
        const nw = this.cameras.main.width;
        if (this.bestText) this.bestText.setX(nw - 10);
      });

      // Options positions
      this.renderOptionsArea();

      // Start
      this.active = true;
      this.spawnNewWord();
    }

    async ensureWords() {
      // Try to reuse existing global wordPairs (from game.js) if present
      try {
        if (Array.isArray(window.wordPairs) && window.wordPairs.length > 0) return;
      } catch {}

      // Otherwise fetch words
      try {
        const data = await window.Ball10API.words();
        const list = data?.words || [];
        window.wordPairs = list
          .map(w => ({
            de: String(w.de || "").trim(),
            en: String(w.en || "").trim(),
          }))
          .filter(w => w.de && w.en);
      } catch {
        window.wordPairs = [];
      }
    }

    async loadBestFromDb() {
      this.kBest = 0;
      const token = window.Ball10Auth.getToken();
      if (!token) return;

      try {
        const me = await window.Ball10API.me(token);
        this.kBest = Math.max(0, Math.floor(Number(me?.user?.knowledge_score || 0)));
      } catch {
        this.kBest = 0;
      }
    }

    async saveBestToDbIfNeeded() {
      const token = window.Ball10Auth.getToken();
      if (!token) return;

      try {
        await window.Ball10API.saveKnowledge(token, this.kBest);
      } catch {
        // silent: do not break gameplay
      }
    }

    pickRandomPair() {
      const pairs = window.wordPairs || [];
      if (!pairs.length) return null;
      return pairs[Math.floor(Math.random() * pairs.length)];
    }

    pickWrongOptions(correctEn, count) {
      const pairs = window.wordPairs || [];
      const wrong = [];
      if (!pairs.length) return wrong;

      let guard = 0;
      while (wrong.length < count && guard < 5000) {
        guard++;
        const en = pairs[Math.floor(Math.random() * pairs.length)]?.en;
        if (!en) continue;
        if (en === correctEn) continue;
        if (wrong.includes(en)) continue;
        wrong.push(en);
      }
      return wrong;
    }

    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    updateDifficulty() {
      // ✅ speed stays in 100..300 range
      // +5 speed every 10 correct answers (gentle)
      const inc = Math.floor(this.kScore / 10) * 5;
      this.fallSpeed = Math.min(this.maxSpeed, this.baseSpeed + inc);
    }

    maybeRestoreLife() {
      // +1 life every 25 correct, cap 3
      if (this.kScore > 0 && this.kScore % 25 === 0) {
        this.lives = Math.min(3, this.lives + 1);
        if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);
      }
    }

    renderOptionsArea() {
      // Clear old options
      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];

      this.optionPositions = [];

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;

      const cx = w / 2;
      const cy = h / 2 + 120;

      const dx = Math.min(180, w * 0.22);
      const dy = 55;

      // 2x2 grid (4 options)
      this.optionPositions.push({ x: cx - dx, y: cy - dy });
      this.optionPositions.push({ x: cx + dx, y: cy - dy });
      this.optionPositions.push({ x: cx - dx, y: cy + dy });
      this.optionPositions.push({ x: cx + dx, y: cy + dy });
    }

    spawnNewWord() {
      if (!this.active) return;

      // Clear old word
      if (this.wordText) {
        this.wordText.destroy();
        this.wordText = null;
      }

      // Recompute option positions (orientation/resize)
      this.renderOptionsArea();

      this.currentPair = this.pickRandomPair();
      if (!this.currentPair) {
        this.endGame("No words available.");
        return;
      }

      this.updateDifficulty();

      // Falling German word
      this.wordX = this.cameras.main.width / 2;
      this.wordY = 110;

      this.wordText = this.add.text(this.wordX, this.wordY, this.currentPair.de, {
        fontSize: "28px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5);

      // Options: 1 correct + 3 wrong
      const correct = this.currentPair.en;
      const wrongs = this.pickWrongOptions(correct, 3);
      const options = this.shuffle([correct, ...wrongs]);

      for (let i = 0; i < 4; i++) {
        const label = String(options[i] || "").trim();
        const pos = this.optionPositions[i];

        // 18px baseline; shrink if long to keep single line
        const size = label.length > 14 ? 14 : 18;

        const t = this.add.text(pos.x, pos.y, label, {
          fontSize: `${size}px`,
          fill: "#fff",
          backgroundColor: "rgba(0,0,0,0.35)",
          padding: { left: 10, right: 10, top: 8, bottom: 8 },
        })
          .setOrigin(0.5, 0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.onOptionClick(label));

        t.setDepth(20);
        this.optionTexts.push(t);
      }
    }

    // Flash helper (green/red)
    flashOption(textObj, bg) {
      if (!textObj) return;
      textObj.setStyle({ backgroundColor: bg });

      this.time.delayedCall(180, () => {
        if (!textObj || !textObj.active) return;
        textObj.setStyle({ backgroundColor: "rgba(0,0,0,0.35)" });
      });
    }

    onOptionClick(chosen) {
      if (!this.active || !this.currentPair) return;

      const isCorrect = (chosen === this.currentPair.en);
      const clicked = this.optionTexts.find(t => t && t.text === chosen);

      if (isCorrect) {
        // ✅ Green feedback
        this.flashOption(clicked, "rgba(20,201,147,0.65)");

        this.kScore += 1;
        if (this.scoreText) this.scoreText.setText(`K-Score: ${this.kScore}`);

        this.maybeRestoreLife();

        // Next word after a tiny delay so player sees green
        this.time.delayedCall(160, () => {
          if (!this.active) return;
          if (this.wordText) {
            this.wordText.destroy();
            this.wordText = null;
          }
          this.currentPair = null;
          this.spawnNewWord();
        });

        return;
      }

      // ❌ Wrong: Red feedback + lose life
      this.flashOption(clicked, "rgba(255,71,87,0.70)");

      this.lives -= 1;
      if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);

      // Disable + gray out wrong option
      if (clicked) {
        clicked.disableInteractive();
        clicked.setAlpha(0.45);
      }

      if (this.lives <= 0) {
        this.time.delayedCall(160, () => this.endGame("Out of lives."));
      }
    }

    async endGame(reason) {
      if (!this.active) return;
      this.active = false;

      // Update best
      this.kBest = Math.max(this.kBest, this.kScore);
      await this.saveBestToDbIfNeeded();

      // Clean options
      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];

      // Clean word
      if (this.wordText) {
        this.wordText.destroy();
        this.wordText = null;
      }

      const cx = this.cameras.main.width / 2;
      const cy = this.cameras.main.height / 2;

      this.add.text(cx, cy - 70, "Knowledge Run", { fontSize: "28px", fill: "#fff" }).setOrigin(0.5);
      this.add.text(
        cx, cy - 20,
        `Game Over\nReason: ${reason}\nScore: ${this.kScore}\nBest: ${this.kBest}`,
        { fontSize: "18px", fill: "#fff", align: "center" }
      ).setOrigin(0.5);

      this.add.text(cx, cy + 70, "Retry", { fontSize: "22px", fill: "#0f0" })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.restart());

      this.add.text(cx, cy + 115, "Main Menu", { fontSize: "20px", fill: "#ff0" })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("MainMenu"));
    }

    update(time, delta) {
      if (!this.active) return;
      if (!this.wordText) return;

      // Move word down based on fallSpeed (px/sec)
      const dy = (this.fallSpeed * (delta / 1000));
      this.wordY += dy;
      this.wordText.y = this.wordY;

      // If reaches bottom => -1 life and next word (or game over)
      const bottom = this.cameras.main.height - 80;
      if (this.wordY >= bottom) {
        this.lives -= 1;
        if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);

        if (this.lives <= 0) {
          this.endGame("Missed (hit bottom).");
          return;
        }

        // Next word
        this.spawnNewWord();
      }
    }
  }

  // expose globally so game.js can include scene safely
  window.Ball10KnowledgeMode = KnowledgeMode;
})();
