class PiApp {
  constructor() {
    this.user = null;
    this.accessToken = null;

    // Worker backend
    this.API_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

    this.paymentMetaById = {};
    this.hasPaymentsPermission = false;
  }

  // Default login: username only
  async authenticate(scopes = ["username"]) {
    const Pi = window.Pi;
    if (!Pi) throw new Error("Pi SDK is not loaded. Refresh the page.");

    const auth = await Pi.authenticate(scopes, this.onIncompletePaymentFound.bind(this));

    const rawUser = auth?.user || null;
    const uid = rawUser?.uid || rawUser?.pi_uid || null;
    const username = rawUser?.username || null;

    this.user = uid ? { uid, username } : rawUser;
    this.accessToken = auth?.accessToken || null;

    if (!this.accessToken) throw new Error("Authentication failed (missing accessToken).");
    if (!this.user || !this.user.uid) throw new Error("Authentication failed (missing uid).");

    if (Array.isArray(scopes) && scopes.includes("payments")) {
      this.hasPaymentsPermission = true;
    }

    return auth;
  }

  async ensurePaymentsPermission() {
    if (this.hasPaymentsPermission) return true;
    await this.authenticate(["username", "payments"]);
    return true;
  }

  onIncompletePaymentFound(payment) {
    console.log("Incomplete payment found:", payment);
  }

  createPayment(paymentData, uiCallbacks = {}) {
    const Pi = window.Pi;
    if (!Pi) throw new Error("Pi SDK is not loaded.");

    const callbacks = {
      onReadyForServerApproval: async (paymentId) => {
        try {
          this.paymentMetaById[paymentId] = paymentData?.metadata || {};
          uiCallbacks?.onStatus?.("Approving payment...");
          await this.approvePayment(paymentId);
          uiCallbacks?.onStatus?.("Approved. Waiting for completion...");
        } catch (e) {
          console.error("Server approval failed:", e);
          uiCallbacks?.onError?.(
            new Error(
              `Server approval failed, but your wallet payment may still complete.\n${e?.message || e}`
            )
          );
          // ✅ do NOT throw
        }
      },

      onReadyForServerCompletion: async (paymentId, txid) => {
        try {
          uiCallbacks?.onStatus?.("Completing payment...");
          await this.completePayment(paymentId, txid);
          uiCallbacks?.onStatus?.("Donation completed ✅");
        } catch (e) {
          console.error("Server completion failed:", e);
          uiCallbacks?.onError?.(
            new Error(
              `Server completion failed, but your wallet payment may still be completed.\n${e?.message || e}`
            )
          );
          // ✅ do NOT throw
        }
      },

      onCancel: () => uiCallbacks?.onStatus?.("Donation cancelled."),
      onError: (error) => uiCallbacks?.onError?.(error),
    };

    // ✅ IMPORTANT FIX:
    // Some Pi Browser versions return a non-Promise while still opening the payment UI.
    // Promise.resolve() makes both Promise + non-Promise cases work.
    const maybePromise = Pi.createPayment(paymentData, callbacks);

    return Promise.resolve(maybePromise)
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
      body: JSON.stringify({ paymentId }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Approve failed");
    }
    return true;
  }

  async completePayment(paymentId, txid) {
    const res = await fetch(`${this.API_BASE}/api/complete-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, txid }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(t || "Complete failed");
    }

    const meta = this.paymentMetaById[paymentId] || {};
    const amt = meta?.amount ?? "";
    this.showMessage(`Thanks for your donation${amt ? ` (${amt}π)` : ""}! ❤️`);
    return true;
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
