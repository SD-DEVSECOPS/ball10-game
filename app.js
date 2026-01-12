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

  ensureAuthenticated() {
    if (this.user && this.accessToken) return Promise.resolve({ user: this.user, accessToken: this.accessToken });
    if (this._authInFlight) return this._authInFlight;

    this._authInFlight = this.authenticate().finally(() => {
      this._authInFlight = null;
    });

    return this._authInFlight;
  }

  async authenticate() {
    if (typeof Pi === "undefined") {
      throw new Error("Pi SDK is not loaded. Please refresh.");
    }

    // IMPORTANT: payments scope is required for payments to work reliably
    const scopes = ["username", "payments"];

    const auth = await Pi.authenticate(scopes, this.handleIncompletePaymentFound.bind(this));

    this.user = auth?.user || null;
    this.accessToken = auth?.accessToken || null;

    if (!this.user || !this.accessToken) {
      throw new Error("Authentication returned no user or access token.");
    }
    return auth;
  }

  handleIncompletePaymentFound(payment) {
    console.log("Incomplete payment found:", payment);
  }

  /**
   * Starts a Pi payment and returns the payment promise.
   * caller can .then/.catch to update UI.
   */
  createPayment(paymentData, uiCallbacks = {}) {
    if (typeof Pi === "undefined") {
      const err = new Error("Pi SDK is not loaded.");
      uiCallbacks?.onError?.(err);
      return Promise.reject(err);
    }

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          this.paymentMetaById[paymentId] = paymentData?.metadata || {};
          uiCallbacks?.onStatus?.("Approving payment on server...");
          await this.handleApproval(paymentId);
          uiCallbacks?.onStatus?.("Approved. Waiting for completion...");
        } catch (e) {
          uiCallbacks?.onError?.(e);
          throw e;
        }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          this.paymentMetaById[paymentId] =
            this.paymentMetaById[paymentId] || (paymentData?.metadata || {});
          uiCallbacks?.onStatus?.("Completing payment on server...");
          await this.handleCompletion(paymentId, txid);
          uiCallbacks?.onStatus?.("Payment completed ✅");
        } catch (e) {
          uiCallbacks?.onError?.(e);
          throw e;
        }
      },
      onCancel: (paymentId) => {
        uiCallbacks?.onStatus?.(`Payment ${paymentId} was cancelled.`);
      },
      onError: (error) => {
        uiCallbacks?.onError?.(error);
      }
    };

    // IMPORTANT: catch immediate createPayment errors
    return Pi.createPayment(paymentData, callbacks)
      .then((payment) => {
        uiCallbacks?.onStatus?.("Payment created. Please confirm in Pi Wallet...");
        return payment;
      })
      .catch((error) => {
        uiCallbacks?.onError?.(error);
        throw error;
      });
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
