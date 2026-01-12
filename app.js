class PiApp {
  constructor() {
    this.user = null;
    this.accessToken = null;

    // Worker backend
    this.API_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

    // paymentId -> metadata
    this.paymentMetaById = {};

    this._authInFlight = null;
  }

  // Called by game AuthGate scene
  ensureAuthenticated() {
    if (this.user && this.accessToken) return Promise.resolve({ user: this.user, accessToken: this.accessToken });
    if (this._authInFlight) return this._authInFlight;

    this._authInFlight = this.authenticate()
      .finally(() => { this._authInFlight = null; });

    return this._authInFlight;
  }

  async authenticate() {
    if (typeof Pi === "undefined") {
      throw new Error("Pi SDK is not loaded. Please refresh.");
    }

    // Per the doc you pasted: empty scopes are fine and still returns accessToken + user
    const scopes = [];

    const auth = await Pi.authenticate(scopes, this.handleIncompletePaymentFound.bind(this));

    this.user = auth?.user || null;
    this.accessToken = auth?.accessToken || null;

    if (!this.user || !this.accessToken) {
      throw new Error("Authentication returned no user or access token.");
    }
    return auth;
  }

  handleIncompletePaymentFound(payment) {
    // You can optionally try to complete it; for now just log.
    console.log("Incomplete payment found:", payment);
  }

  createPayment(paymentData) {
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
    const res = await fetch(`${this.API_BASE}/api/approve-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });

    if (!res.ok) throw new Error(await res.text());
  }

  async handleCompletion(paymentId, txid) {
    const res = await fetch(`${this.API_BASE}/api/complete-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, txid })
    });

    if (!res.ok) throw new Error(await res.text());

    const meta = this.paymentMetaById[paymentId] || {};
    const kind = meta?.kind || "unknown";

    if (kind === "balloon_points") {
      window.balance = (window.balance ?? 0) + 1000;
      this.showMessage("1000 Balloon Points added!");

      if (window.game?.scene?.isActive("Market")) {
        window.game.scene.getScene("Market").scene.restart();
      }
      return;
    }

    if (kind === "donation") {
      const amt = meta?.amount ?? "";
      this.showMessage(`Thanks for your donation${amt ? ` (${amt}π)` : ""}! ❤️`);
      return;
    }

    this.showMessage("Payment completed ✅");
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
