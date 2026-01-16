
(function () {
  const CATEGORIES = [
    { key: "general_b2", label: "General B2" },
    { key: "connectors", label: "Connectors" },
    { key: "academic_c1", label: "Academic C1" },
    { key: "medical", label: "Medical" },
    { key: "cybersecurity", label: "Cybersecurity" },
  ];

  function norm(s) { return String(s || "").trim(); }

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

      // ✅ Category related
      this.selectedCategory = null;
      this.pairs = [];          // words for selected category only
      this.categoryUI = [];     // UI objects for category picker
    }

    async create() {
      await this.loadBestFromDb();
      this.showCategoryPicker();
    }

    // ---------------- Category Picker ----------------
    destroyCategoryUI() {
      this.categoryUI.forEach(o => { try { o.destroy(); } catch {} });
      this.categoryUI = [];
    }

    showCategoryPicker() {
      // stop run if we came from a run
      this.active = false;

      // cleanup any existing run UI/objects
      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];
      if (this.wordText) { this.wordText.destroy(); this.wordText = null; }
      this.currentPair = null;

      // cleanup category UI and rebuild
      this.destroyCategoryUI();

      const w = this.cameras.main.width;
      const h = this.cameras.main.height;
      const cx = w / 2;
      const cy = h / 2;

      const title = this.add.text(cx, cy - 210, "Knowledge Run", { fontSize: "34px", fill: "#fff" }).setOrigin(0.5);
      const sub = this.add.text(cx, cy - 170, "Select a category:", { fontSize: "16px", fill: "#ddd" }).setOrigin(0.5);
      const best = this.add.text(cx, cy - 140, `Best: ${this.kBest}`, { fontSize: "14px", fill: "#bbb" }).setOrigin(0.5);

      this.categoryUI.push(title, sub, best);

      const startY = cy - 85;
      const gap = 46;

      CATEGORIES.forEach((c, idx) => {
        const btn = this.add.text(cx, startY + idx * gap, c.label, {
          fontSize: "22px",
          fill: "#0ff",
          backgroundColor: "rgba(0,0,0,0.35)",
          padding: { left: 12, right: 12, top: 8, bottom: 8 },
        })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.startCategory(c.key));

        this.categoryUI.push(btn);
      });

      const back = this.add.text(cx, cy + 210, "Main Menu", { fontSize: "20px", fill: "#ff0" })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.scene.start("MainMenu"));

      this.categoryUI.push(back);
    }

    async startCategory(categoryKey) {
      this.selectedCategory = categoryKey;

      // Reset run stats (same as your original create())
      this.kScore = 0;
      this.lives = 3;
      this.fallSpeed = this.baseSpeed;

      // Load only selected category words
      await this.loadCategoryWords(categoryKey);

      if (!this.pairs.length) {
        // show simple message + back to categories
        this.destroyCategoryUI();

        const cx = this.cameras.main.width / 2;
        const cy = this.cameras.main.height / 2;

        const msg = this.add.text(cx, cy - 20, "No words available for this category.", {
          fontSize: "18px", fill: "#fff"
        }).setOrigin(0.5);

        const back = this.add.text(cx, cy + 40, "Back", {
          fontSize: "20px", fill: "#ff0"
        })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => this.showCategoryPicker());

        this.categoryUI.push(msg, back);
        return;
      }

      // Hide category picker UI and start run UI
      this.destroyCategoryUI();
      this.startRunUI();
      this.active = true;
      this.spawnNewWord();
    }

    async loadCategoryWords(categoryKey) {
      this.pairs = [];
      try {
        // uses your worker.js: /api/words?category=...
        const data = await window.Ball10API.words(categoryKey, 5000);
        const list = data?.words || [];
        this.pairs = list
          .map(w => ({
            de: norm(w.de),
            en: norm(w.en),
            category: norm(w.category),
          }))
          .filter(w => w.de && w.en);
      } catch {
        this.pairs = [];
      }
    }

    // ---------------- Original logic below (only switched source from window.wordPairs -> this.pairs) ----------------
    startRunUI() {
      const w = this.cameras.main.width;

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

      // Back button (category-related: go back to category picker)
      this.add.text(w - 10, 34, "Categories", { fontSize: "14px", fill: "#ff0" })
        .setOrigin(1, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.showCategoryPicker());

      // Keep right-side UI pinned on resize
      this.scale.on("resize", () => {
        const nw = this.cameras.main.width;
        if (this.bestText) this.bestText.setX(nw - 10);
      });

      // Options positions
      this.renderOptionsArea();
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
      const pairs = this.pairs || [];
      if (!pairs.length) return null;
      return pairs[Math.floor(Math.random() * pairs.length)];
    }

    pickWrongOptions(correctEn, count) {
      const pairs = this.pairs || [];
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
      const inc = Math.floor(this.kScore / 10) * 5;
      this.fallSpeed = Math.min(this.maxSpeed, this.baseSpeed + inc);
    }

    maybeRestoreLife() {
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
        this.flashOption(clicked, "rgba(20,201,147,0.65)");

        this.kScore += 1;
        if (this.scoreText) this.scoreText.setText(`K-Score: ${this.kScore}`);

        this.maybeRestoreLife();

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

      this.flashOption(clicked, "rgba(255,71,87,0.70)");

      this.lives -= 1;
      if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);

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

      this.kBest = Math.max(this.kBest, this.kScore);
      await this.saveBestToDbIfNeeded();

      this.optionTexts.forEach(t => t.destroy());
      this.optionTexts = [];

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

      const dy = (this.fallSpeed * (delta / 1000));
      this.wordY += dy;
      this.wordText.y = this.wordY;

      const bottom = this.cameras.main.height - 80;
      if (this.wordY >= bottom) {
        this.lives -= 1;
        if (this.livesText) this.livesText.setText(`Lives: ${this.lives}/3`);

        if (this.lives <= 0) {
          this.endGame("Missed (hit bottom).");
          return;
        }

        this.spawnNewWord();
      }
    }
  }

  window.Ball10KnowledgeMode = KnowledgeMode;
})();
