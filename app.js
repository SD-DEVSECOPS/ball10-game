class PiApp {
  constructor() {
    this.user = null;
    this.authResult = null;

    // Cloudflare Worker base URL (senin worker)
    this.API_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

    this.setupAuthButton();
    this.setupEventListeners();
    this.refreshAuthUI();
  }

  setupAuthButton() {
    const authButton = document.getElementById("pi-auth-button");
    authButton.addEventListener("click", () => this.handleAuth());
  }

  setupEventListeners() {
    // Market -> payment event
    document.addEventListener("paymentInitiated", (e) => this.createPayment(e.detail));

    // Scene değişince UI kontrolü
    document.addEventListener("sceneChanged", (e) => {
      this.onSceneChanged(e.detail?.sceneKey);
    });
  }

  onSceneChanged(sceneKey) {
    // Login butonu sadece MainMenu’de ve user yoksa görünsün
    const container = document.getElementById("pi-auth-container");
    if (!container) return;

    const shouldShow = (sceneKey === "MainMenu" && !this.user);
    container.style.display = shouldShow ? "block" : "none";

    // user varsa MainMenu’de bile göstermiyoruz (isteğin buydu)
    if (this.user) container.style.display = "none";
  }

  refreshAuthUI() {
    const info = document.getElementById("pi-user-info");
    if (!info) return;

    if (this.user) {
      info.innerHTML = `Logged in as: <b>${this.user.username}</b>`;
    } else {
      info.innerHTML = "";
    }
  }

  async handleAuth() {
    try {
      // Senin dediğin gibi: client-side login yeterli
      const scopes = ["username", "payments"];
      const authResult = await Pi.authenticate(scopes, this.handleIncompletePayment.bind(this));

      this.authResult = authResult;
      this.user = authResult?.user || null;

      this.refreshAuthUI();
      this.showMessage(this.user ? `Welcome ${this.user.username}!` : "Logged in!");

      // login olunca MainMenu’de butonu sakla
      this.onSceneChanged("MainMenu");
    } catch (error) {
      this.showError(`Authentication failed: ${error?.message || error}`);
    }
  }

  createPayment(paymentData) {
    const callbacks = {
      onReadyForServerApproval: (paymentId) => this.handleApproval(paymentId),
      onReadyForServerCompletion: (paymentId, txid) => this.handleCompletion(paymentId, txid),
      onCancel: (paymentId) => this.showMessage(`Payment ${paymentId} cancelled`),
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

      // OYUN ÖDÜLÜ (senin logic)
      // global balance var (game.js içinde)
      window.balance = (window.balance ?? 0) + 1000;

      this.showMessage("1000 Balloon Points Added!");

      // Market açıksa refreshle
      if (window.game?.scene?.isActive("Market")) {
        window.game.scene.getScene("Market").scene.restart();
      }
    } catch (e) {
      this.showError(`Payment completion failed: ${e?.message || e}`);
    }
  }

  handleIncompletePayment(payment) {
    // Basitçe completion dene
    this.showError("Found incomplete payment - attempting completion...");
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
    setTimeout(() => alertDiv.remove(), 4500);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.piApp = new PiApp();
});
