class PiApp {
  constructor() {
    this.user = null;
    this.accessToken = null;

    // Worker backend
    this.API_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

    this.paymentMetaById = {};
    this.hasPaymentsPermission = false;
  }

  // ✅ Default to both, because your app uses both (donate + claim)
  async authenticate(scopes = ["username", "payments"]) {
    const Pi = window.Pi;
    if (!Pi) throw new Error("Pi SDK is not loaded. Refresh the page.");

    const auth = await Pi.authenticate(scopes, this.onIncompletePaymentFound.bind(this));

    this.user = auth?.user || null;
    this.accessToken = auth?.accessToken || null;

    if (!this.user || !this.accessToken) throw new Error("Authentication failed.");

    // If we requested payments, remember it
    if (Array.isArray(scopes) && scopes.includes("payments")) {
      this.hasPaymentsPermission = true;
    }

    return auth;
  }

  // ✅ Always request both when payments are needed
  async ensurePaymentsPermission() {
    if (this.hasPaymentsPermission) return;
    await this.authenticate(["username", "payments"]);
  }

  onIncompletePaymentFound(payment) {
    console.log("Incomplete payment found:", payment);
  }

  createPayment(paymentData, uiCallbacks = {}) {
    const Pi = window.Pi;
    if (!Pi) throw new Error("Pi SDK is not loaded.");

    // Safety: ensure we asked for payments
    // (If already authorized, this returns immediately)
    const ensure = this.ensurePaymentsPermission();

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          await ensure; // ✅ ensure permission before server steps
          this.paymentMetaById[paymentId] = paymentData?.metadata || {};
          uiCallbacks?.onStatus?.("Approving payment...");
          await this.approvePayment(paymentId);
          uiCallbacks?.onStatus?.("Approved. Waiting for completion...");
        } catch (e) {
          uiCallbacks?.onError?.(e);
          throw e;
        }
      },
      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          uiCallbacks?.onStatus?.("Completing payment...");
          await this.completePayment(paymentId, txid);
          uiCallbacks?.onStatus?.("Donation completed ✅");
        } catch (e) {
          uiCallbacks?.onError?.(e);
          throw e;
        }
      },
      onCancel: () => uiCallbacks?.onStatus?.("Donation cancelled."),
      onError: (error) => uiCallbacks?.onError?.(error)
    };

    return Pi.createPayment(paymentData, callbacks)
      .then((payment) => {
        uiCallbacks?.onStatus?.("Please confirm in Pi Wallet...");
        return payment;
      })
      .catch((error) => {
        uiCallbacks?.onError?.(error);
        throw error;
      });
  }

  async approvePayment(paymentId) {
    const res = await fetch(`${this.API_BASE}/api/approve-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });
    if (!res.ok) throw new Error(await res.text());
  }

  async completePayment(paymentId, txid) {
    const res = await fetch(`${this.API_BASE}/api/complete-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, txid })
    });
    if (!res.ok) throw new Error(await res.text());

    const meta = this.paymentMetaById[paymentId] || {};
    const amt = meta?.amount ?? "";
    this.showMessage(`Thanks for your donation${amt ? ` (${amt}π)` : ""}! ❤️`);
  }

  showMessage(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "pi-alert pi-success";
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3500);
  }

  showError(message) {
    const alertDiv = document.createElement("div");
    alertDiv.className = "pi-alert pi-error";
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5500);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.piApp = new PiApp();
});
