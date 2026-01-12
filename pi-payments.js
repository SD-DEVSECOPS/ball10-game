(function () {
  const WORKER_BASE = "https://pi-payment-backend.sdswat93.workers.dev";

  // ✅ TESTNET build flag (worker + app.js will use it)
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

  async function claimTestnet1Pi() {
    await ensurePiLogin();

    const res = await fetch(`${WORKER_BASE}/api/claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PI-ENV": PI_ENV, // ✅ keep
      },
      body: JSON.stringify({ accessToken: window.piApp.accessToken }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.error || "Claim failed";
      const det = stringifyDetails(data.details);
      throw new Error(det ? `${msg}\n\nDetails: ${det}` : msg);
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
        metadata: { kind: "donation", amount },
      },
      uiCallbacks
    );
  }

  window.Ball10Payments = {
    ensurePiLogin,
    claimTestnet1Pi,
    donatePi,
  };
})();
