(function () {
  const WORKER_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

  // ✅ MAINNET env (frontend + worker)
  const PI_ENV = "mainnet";
  window.BALL10_PI_ENV = PI_ENV;

  async function ensurePiLogin() {
    if (!window.piApp) throw new Error("piApp missing. app.js not loaded.");

    if (!window.piApp.user?.uid || !window.piApp.accessToken) {
      await window.piApp.authenticate(["username"]);
    }

    if (!window.piApp.user?.uid) throw new Error("Auth returned no uid.");
    if (!window.piApp.accessToken) throw new Error("Auth returned no accessToken.");
    return true;
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
    donatePi
  };
})();
