const BACKEND_URL = "https://pi-payment-backend.sdswat93.workers.dev";

class PiApp {
  constructor() {
    this.user = null;
    this.setupAuthButton();
    this.setupEventListeners();
    this.restoreSession();
  }

  setupAuthButton() {
    const authButton = document.getElementById("pi-auth-button");
    authButton.addEventListener("click", () => this.handleAuth());
    this.hideAuthUI(); // scenes decide when to show
  }

  setupEventListeners() {
    document.addEventListener("paymentInitiated", (e) => this.createPayment(e.detail));
  }

  restoreSession() {
    try {
      const saved = localStorage.getItem("pi_user");
      if (saved) this.user = JSON.parse(saved);
    } catch (_) {}
    this.updateUI();
  }

  async handleAuth() {
    try {
      const scopes = ["username", "payments"];
      const authResult = await Pi.authenticate(scopes, this.handleIncompletePayment.bind(this));

      this.user = {
        uid: authResult?.user?.uid || null,
        username: authResult?.user?.username || "Pi User",
      };

      localStorage.setItem("pi_user", JSON.stringify(this.user));
      this.updateUI();
      this.showMessage(`Welcome ${this.user.username}!`);
    } catch (error) {
      this.showError(`Login failed: ${error.message}`);
    }
  }

  logout() {
    this.user = null;
    localStorage.removeItem("pi_user");
    this.updateUI();
    this.showMessage("Logged out");
  }

  createPayment(paymentData) {
    const callbacks = {
      onReadyForServerApproval: (paymentId) => this.handleApproval(paymentId),
      onReadyForServerCompletion: (paymentId, txid) => this.handleCompletion(paymentId, txid),
      onCancel: (paymentId) => this.showMessage(`Payment ${paymentId} cancelled`),
      onError: (error) => this.showError(`Payment error: ${error.message}`),
    };

    Pi.createPayment(paymentData, callbacks);
  }

  async handleApproval(paymentId) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/approve-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });

      if (!response.ok) {
        const t = await response.text();
        throw new Error(t || "Payment approval failed");
      }
    } catch (error) {
      this.showError(`Payment approval failed: ${error.message}`);
    }
  }

  async handleCompletion(paymentId, txid) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/complete-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, txid }),
      });

      if (!response.ok) {
        const t = await response.text();
        throw new Error(t || "Payment completion failed");
      }

      // Add points after real completion
      balance += 1000;
      this.showMessage("1000 Balloon Points Added!");

      if (window.game?.scene?.isActive?.("Market")) {
        window.game.scene.getScene("Market").scene.restart();
      }
    } catch (error) {
      this.showError(`Payment completion failed: ${error.message}`);
    }
  }

  handleIncompletePayment(payment) {
    this.showError("Found incomplete payment - attempting completion...");
    this.handleCompletion(payment.identifier, payment.transaction?.txid);
  }

  showAuthUI() {
    const container = document.querySelector(".pi-auth-container");
    const authButton = document.getElementById("pi-auth-button");
    const userInfo = document.getElementById("pi-user-info");

    container.style.display = "block";

    if (this.user) {
      authButton.style.display = "none";
      userInfo.style.display = "block";
      userInfo.innerHTML = `
        <div style="margin-bottom:8px;">Logged in as: <b>${this.user.username}</b></div>
        <button id="pi-logout-button" class="pi-button" style="background:#ff4757;">Logout</button>
      `;
      document.getElementById("pi-logout-button").addEventListener("click", () => this.logout());
    } else {
      userInfo.style.display = "none";
      authButton.style.display = "inline-block";
    }
  }

  hideAuthUI() {
    const container = document.querySelector(".pi-auth-container");
    if (container) container.style.display = "none";
  }

  updateUI() {
    const authButton = document.getElementById("pi-auth-button");
    const userInfo = document.getElementById("pi-user-info");
    if (!authButton || !userInfo) return;

    if (this.user) {
      authButton.style.display = "none";
      userInfo.style.display = "block";
    } else {
      userInfo.style.display = "none";
      authButton.style.display = "inline-block";
    }
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
