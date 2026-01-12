class PiApp {
  constructor() {
    this.user = null;
    this.authResult = null;

    // Your Cloudflare Worker base URL
    this.API_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

    // paymentId -> metadata map
    this.paymentMetaById = {};

    this.setupAuthButton();
    this.setupEventListeners();
    this.refreshAuthUI();
  }

  setupAuthButton() {
    const authButton = document.getElementById("pi-auth-button");
    authButton.addEventListener("click", () => this.handleAuth());
  }

  setupEventListeners() {
    document.addEventListener("paymentInitiated", (e) => this.createPayment(e.detail));

    document.addEventListener("sceneChanged", (e) => {
      this.onSceneChanged(e.detail?.sceneKey);
    });
  }

  onSceneChanged(sceneKey) {
    const container = document.getElementById("pi-auth-container");
    if (!container) return;

    // Show Login only on MainMenu, only if not logged in
    const shouldShow = sceneKey === "MainMenu" && !this.user;
    container.style.display = shouldShow ? "block" : "none";

    if (this.user) container.style.display = "none";
  }

  refreshAuthUI() {
    const info = document.getElementById("pi-user-info");
    if (!info) return;

    info.innerHTML = this.user ? `Logged in as: <b>${this.user.username}</b>` : "";
  }

  async handleAuth() {
    try {
      if (typeof Pi === "undefined") {
        this.showError("Pi SDK is not loaded. Please refresh the page.");
        return;
      }

      const scopes = ["username", "payments"];
      const authResult = await Pi.authenticate(scopes, this.handleIncompletePayment.bind(this));

      this.authResult = authResult;
      this.user = authResult?.user || null;

      this.refreshAuthUI();
      this.showMessage(this.user ? `Welcome ${this.user.username}!` : "Logged in successfully.");

      this.onSceneChanged("MainMenu");
    } catch (error) {
      const msg = error?.message || String(error);
      this.showError(`Authentication failed: ${msg}`);
    }
  }

  createPayment(paymentData) {
    if (typeof Pi === "undefined") {
      this.showError("Pi SDK is not loaded.");
      return;
    }

    const callbacks = {
      onReadyForServerApproval: (paymentId) => {
        this.paymentMetaById[paymentId] = paymentData?.metadata || {};
        return this.handleApproval(paymentId);
      },
      onReadyForServerCompletion: (paymentId, txid) => {
        this.paymentMetaById[paymentId] = this.paymentMetaById[paymentId] || (paymentData?.metadata || {});
        return this.handleCompletion(paymentId, txid);
      },
      onCancel: (paymentId) => this.showMessage(`Payment ${paymentId} was cancelled.`),
      onError: (error) => this.showError(`Payment error: ${error?.message || error}`)
    };

    Pi.createPayment(paymentData, callbacks);
  }

  async handleApproval(paymentId) {
    try {
      const res = await fetch(`${this.API_BASE}/api/approve-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId })
      });

      if (!res.ok) throw new Error(await res.text());
    } catch (e) {
      this.showError(`Payment approval failed: ${e?.message || e}`);
    }
  }

  async handleCompletion(paymentId, txid) {
    try {
      const res = await fetch(`${this.API_BASE}/api/complete-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, txid })
      });

      if (!res.ok) throw new Error(await res.text());

      const meta = this.paymentMetaById[paymentId] || {};
      const kind = meta?.kind || meta?.product || "unknown";

      if (kind === "balloon_points") {
        window.balance = (window.balance ?? 0) + 1000;
        this.showMessage("1000 Balloon Points added!");

        if (window.game?.scene?.isActive("Market")) {
          window.game.scene.getScene("Market").scene.restart();
        }
      } else if (kind === "donation") {
        const amt = meta?.amount ?? "";
        this.showMessage(`Thanks for the donation ${amt ? `(${amt}π)` : ""} ❤️`);
      } else {
        this.showMessage("Payment completed ✅");
      }
    } catch (e) {
      this.showError(`Payment completion failed: ${e?.message || e}`);
    }
  }

  handleIncompletePayment(payment) {
    this.showError("Found an incomplete payment — attempting to complete...");
    const txid = payment?.transaction?.txid || null;
    this.handleCompletion(payment.identifier, txid);
  }

  showMessage(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "pi-alert pi-success";
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  showError(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "pi-alert pi-error";
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.piApp = new PiApp();
});
