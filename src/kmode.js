// src/kmode.js
// Knowledge Run mode (no leaderboard, personal best saved to DB as knowledge_score)

(function () {
  class KnowledgeMode extends Phaser.Scene {
    constructor() {
      super({ key: "KnowledgeMode" });

      this.kScore = 0;
      this.kBest = 0;
      this.lives = 3;

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
    }

    async create() {
      // Ensure words are loaded (uses same global wordPairs loaded by game.js if present,
      // but we don't assume it exists; we fetch again if needed).
      await this.ensureWords();

      // Load best score from DB (if logged in)
      await this.loadBestFromDb();

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;

      this.kScore = 0;
      this.lives = 3;
      this.fallSpeed = this.baseSpeed;

      // UI top
      this.scoreText = this.add.text(10, 10, `K-Score: ${this.kScore}`, { fontSize: "20px", fill: "#fff" });
      this.livesText = this.add.text(10, 36, `Lives: ${this.lives}/3`, { fontSize: "18px", fill: "#fff" });

      this.bestText = this.add.text(w - 10, 10, `Best: ${this.kBest}`, { fontSize: "12px", fill: "#fff" })
        .setOrigin(1, 0);

      // Info line
      this.infoText = this.add.text(w / 2, 70, "Match the correct English word", {
        fontSize: "14px",
        fill: "#ddd"
      }).setOrigin(0.5, 0.5);

      // Back button (top-right under best)
      this.add.text(w - 10, 34, "Back", { fontSize: "14px", fill: "#ff0" })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("MainMenu"));

      // Keep right-side UI pinned on resize
      this.scale.on("resize", () => {
        const nw = this.cameras.main.width;
        if (this.bestText) this.bestText.setX(nw - 10);
      });

      // Options area (center)
      this.renderOptionsArea();

      // Start first word
      this.active = true;
      this.spawnNewWord();
    }

    async ensureWords() {
      // Try to reuse global cache from game.js if it exists (wordPairs)
      // but don't require it.
      try {
        if (Array.isArray(window.wordPairs) && window.wordPairs.length > 0) return;
      } catch {}

      // Otherwise fetch from API
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
      if (!token) return; // guest

      try {
        const me = await window.Ball10API.me(token);
        this.kBest = Math.max(0, Math.floor(Number(me?.user?.knowledge_score || 0)));
      } catch {
        this.kBest = 0;
      }
    }

    async saveBestToDbIfNeeded() {
      const token = window.Ball10Auth.getToken();
      if (!token) return; // guest

      try {
        await window.Ball10API.saveKnowledge(token, this.kBest);
      } catch (e) {
        // silent; don't crash mode
      }
    }

    // ---- Round logic ----
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
      // speed stays in 250..400 range
      // increase gently every 10 points (+10), capped
      const inc = Math.floor(this.kScore / 10) * 10;
      this.fallSpeed = Math.min(this.maxSpeed, this.baseSpeed + inc);
    }

    maybeRestoreLife() {
      if (this.kScore > 0 && this.kScore % 25 === 0) {
        this.lives = Math.min(3, this.lives + 1);
        if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);
      }
    }

    renderOptionsArea() {
      // Clear old options if any
      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];

      // Static layout positions (centered)
      // 4 options in a 2x2 grid around center
      // This is mobile-friendly.
      this.optionPositions = [];

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;

      const cx = w / 2;
      const cy = h / 2 + 120;

      const dx = Math.min(180, w * 0.22);
      const dy = 55;

      this.optionPositions.push({ x: cx - dx, y: cy - dy });
      this.optionPositions.push({ x: cx + dx, y: cy - dy });
      this.optionPositions.push({ x: cx - dx, y: cy + dy });
      this.optionPositions.push({ x: cx + dx, y: cy + dy });
    }

    spawnNewWord() {
      if (!this.active) return;

      // Clear old word text
      if (this.wordText) {
        this.wordText.destroy();
        this.wordText = null;
      }

      // Recompute option positions (in case of resize/orientation)
      this.renderOptionsArea();

      this.currentPair = this.pickRandomPair();
      if (!this.currentPair) {
        this.endGame("No words available.");
        return;
      }

      this.updateDifficulty();

      // Create falling German word text near top
      this.wordX = this.cameras.main.width / 2;
      this.wordY = 110;

      this.wordText = this.add.text(this.wordX, this.wordY, this.currentPair.de, {
        fontSize: "28px",
        fill: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      }).setOrigin(0.5, 0.5);

      // Build 4 options: 1 correct + 3 wrong
      const correct = this.currentPair.en;
      const wrongs = this.pickWrongOptions(correct, 3);

      // If not enough wrongs, still proceed (but game will be too easy)
      const options = this.shuffle([correct, ...wrongs]);

      // Render clickable options in center, 18px baseline,
      // shrink if long (single line only)
      for (let i = 0; i < 4; i++) {
        const label = String(options[i] || "").trim();
        const pos = this.optionPositions[i];

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

    onOptionClick(chosen) {
      if (!this.active || !this.currentPair) return;

      // Correct
      if (chosen === this.currentPair.en) {
        this.kScore += 1;
        if (this.scoreText) this.scoreText.setText(`K-Score: ${this.kScore}`);

        this.maybeRestoreLife();

        // pop / next
        if (this.wordText) {
          this.wordText.destroy();
          this.wordText = null;
        }
        this.currentPair = null;

        // next word immediately
        this.spawnNewWord();
        return;
      }

      // Wrong => -1 life
      this.lives -= 1;
      if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);

      // Small feedback: gray out clicked option (optional polish)
      const t = this.optionTexts.find(x => x.text === chosen);
      if (t) {
        t.disableInteractive();
        t.setAlpha(0.45);
      }

      if (this.lives <= 0) {
        this.endGame("Out of lives.");
      }
    }

    async endGame(reason) {
      if (!this.active) return;
      this.active = false;

      // update best
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

  // expose globally so game.js can reference it without rewriting
  window.Ball10KnowledgeMode = KnowledgeMode;
})();
