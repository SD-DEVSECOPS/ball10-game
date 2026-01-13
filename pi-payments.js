(function () {
  const WORKER_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

  // ✅ This controls env in BOTH frontend + worker
  const PI_ENV = "testnet";
  window.BALL10_PI_ENV = PI_ENV;

  function stringifyDetails(details) {
    try {
      if (details === undefined || details === null) return "";
      if (typeof details === "string") return details;
      return JSON.stringify(details);
    } catch {
      return String(details);
    }
  }

  async function ensurePiLogin() {
    if (!window.piApp) throw new Error("piApp missing. app.js not loaded.");

    if (!window.piApp.user?.uid || !window.piApp.accessToken) {
      await window.piApp.authenticate(["username"]);
    }

    if (!window.piApp.user?.uid) throw new Error("Auth returned no uid.");
    if (!window.piApp.accessToken) throw new Error("Auth returned no accessToken.");
    return true;
  }

  // =========================
  // Wallet input popup (DOM overlay)
  // =========================
  function promptWalletAddress() {
    return new Promise((resolve) => {
      // Overlay
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.7)";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "20000";

      // Modal
      const modal = document.createElement("div");
      modal.style.width = "min(92vw, 420px)";
      modal.style.background = "#0f1626";
      modal.style.border = "1px solid #2b3550";
      modal.style.borderRadius = "14px";
      modal.style.padding = "16px";
      modal.style.color = "#fff";
      modal.style.fontFamily = "Arial, sans-serif";
      modal.style.boxShadow = "0 12px 40px rgba(0,0,0,.45)";

      const title = document.createElement("div");
      title.textContent = "Claim 1π (Testnet)";
      title.style.fontWeight = "800";
      title.style.fontSize = "18px";
      title.style.marginBottom = "8px";

      const hint = document.createElement("div");
      hint.textContent = "Paste your Pi Testnet wallet address (starts with G). You can copy it from Pi Wallet → Testnet → Receive.";
      hint.style.color = "#aab3c6";
      hint.style.fontSize = "13px";
      hint.style.lineHeight = "1.35";
      hint.style.marginBottom = "10px";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
      input.style.width = "100%";
      input.style.padding = "12px";
      input.style.borderRadius = "10px";
      input.style.border = "1px solid #3b4662";
      input.style.background = "#0b1020";
      input.style.color = "#fff";
      input.style.boxSizing = "border-box";
      input.autocomplete = "off";
      input.spellcheck = false;

      // Load saved wallet if present
      try {
        const saved = localStorage.getItem("ball10_wallet");
        if (saved) input.value = saved;
      } catch (_) {}

      const status = document.createElement("div");
      status.style.marginTop = "10px";
      status.style.fontSize = "13px";
      status.style.color = "#ffcc66";

      const btnRow = document.createElement("div");
      btnRow.style.display = "flex";
      btnRow.style.gap = "10px";
      btnRow.style.marginTop = "12px";

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.flex = "1";
      cancelBtn.style.padding = "12px";
      cancelBtn.style.borderRadius = "10px";
      cancelBtn.style.border = "0";
      cancelBtn.style.background = "#1f2937";
      cancelBtn.style.color = "#fff";
      cancelBtn.style.fontWeight = "800";
      cancelBtn.style.cursor = "pointer";

      const claimBtn = document.createElement("button");
      claimBtn.textContent = "Claim";
      claimBtn.style.flex = "1";
      claimBtn.style.padding = "12px";
      claimBtn.style.borderRadius = "10px";
      claimBtn.style.border = "0";
      claimBtn.style.background = "#2d6cdf";
      claimBtn.style.color = "#fff";
      claimBtn.style.fontWeight = "800";
      claimBtn.style.cursor = "pointer";

      function close(val) {
        try {
          overlay.remove();
        } catch (_) {}
        resolve(val);
      }

      function isValidGAddress(s) {
        return typeof s === "string" && s.startsWith("G") && s.length >= 20;
      }

      cancelBtn.onclick = () => close(null);

      claimBtn.onclick = () => {
        const v = (input.value || "").trim();
        if (!v) {
          status.textContent = "Please paste your wallet address.";
          return;
        }
        if (!isValidGAddress(v)) {
          status.textContent = "Wallet address must start with G and look valid.";
          return;
        }

        // Save wallet locally
        try {
          localStorage.setItem("ball10_wallet", v);
        } catch (_) {}

        close(v);
      };

      // Enter key submits
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") claimBtn.click();
      });

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(claimBtn);

      modal.appendChild(title);
      modal.appendChild(hint);
      modal.appendChild(input);
      modal.appendChild(status);
      modal.appendChild(btnRow);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      // Focus input
      setTimeout(() => input.focus(), 50);
    });
  }

  // =========================
  // Claim using walletAddress
  // =========================
  async function claimTestnet1Pi() {
    await ensurePiLogin();

    // ✅ Ask user for wallet address
    const walletAddress = await promptWalletAddress();
    if (!walletAddress) {
      throw new Error("Claim cancelled.");
    }

    const res = await fetch(`${WORKER_BASE}/api/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PI-ENV": PI_ENV
      },
      body: JSON.stringify({
        accessToken: window.piApp.accessToken,
        walletAddress: walletAddress
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || "Claim failed";
      const det = stringifyDetails(data.details);
      const hint = data.hint ? `\n\nHint: ${data.hint}` : "";
      throw new Error(det ? `${msg}\n\nDetails: ${det}${hint}` : `${msg}${hint}`);
    }
    return data;
  }

  async function donatePi(amount, uiCallbacks = {}) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid donation amount.");
    }

    await ensurePiLogin();
    await window.piApp.ensurePaymentsPermission();

    return window.piApp.createPayment(
      {
        amount,
        memo: "Ball10 Donation",
        metadata: { kind: "donation", amount }
      },
      uiCallbacks
    );
  }

  window.Ball10Payments = {
    ensurePiLogin,
    claimTestnet1Pi,
    donatePi
  };
})();
